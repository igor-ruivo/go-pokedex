import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { PokemonTypes } from '../../DTOs/PokemonTypes';
import { useMoves } from '../../queries/moves';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { useRaidRanker } from '../../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf, isNormalPokemonAndHasShadowVersion } from '../../utils/pokemon-helper';
import { getComputeWorker } from '../../workers/compute-client';

const numCfg = (key: ConfigKeys, fallback: number): number => {
	const v = readPersistentValue(key);
	return v ? +v : fallback;
};

const CP_OPTIONS = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

/* The English help text is ported verbatim from the legacy app — the wording
   spells out exactly what will and won't be deleted, so users know the stakes. */
const HELP_TEXT =
	"You can use this section to generate a search string that will find all Pokémon in your storage that aren't " +
	"meta-relevant. You can define what's relevant or not based on the available filters below. Choose to discard all " +
	'Pokémon that aren’t ranked above rank X in one league and rank Y in another league. If you set a CP cap of Z, ' +
	'then Pokémon with a CP equal to or higher than that CP will never be deleted. This search string won’t ever ' +
	'delete any favorite, tagged, legendary, ultra beast, mythical, mega-evolvable, or trade-to-evolve Pokémon. It will ' +
	"also target Pokémon that require low Attack IVs to be relevant, in case they don't have a low Attack IV – " +
	'because trading couldn’t make them relevant either. Please double-check if your in-game language matches the ' +
	'language selected in the website settings.';

interface ComputeArgs {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	rankLists: Array<Record<string, { rank: number } | undefined>>;
	raidDPS: Record<string, Record<string, unknown>>;
	lowAttackMap: Record<string, Record<number, boolean>> | undefined;
	gl: GameLanguage;
	cp: number;
	trashGreat: number;
	trashUltra: number;
	trashMaster: number;
	trashRaid: number;
}

/* ---- verbatim port of the legacy DeleteTrash `computeStr` ------------------- */
const computeTrashString = (a: ComputeArgs): string => {
	const {
		gamemasterPokemon,
		rankLists,
		raidDPS,
		lowAttackMap,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
	} = a;

	const enumValues: Array<PokemonTypes> = Object.keys(PokemonTypes)
		.filter((key) => isNaN(Number(key)) && key !== 'Normal')
		.map((key) => key as unknown as PokemonTypes);

	const isBadRank = (rank: number, rankLimit: number) => rank === Infinity || rank > rankLimit;

	const needsLessThanFiveAttack = (p: IGamemasterPokemon, leagueIndex: number) => {
		const cap = leagueIndex === 0 ? 1500 : 2500;
		return lowAttackMap?.[p.speciesId]?.[cap] ?? true;
	};

	const isGoodForRaids = (p: IGamemasterPokemon) => {
		let minRaidRank = Infinity;
		const finalCollection = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, undefined, true));
		enumValues.forEach((t) => {
			finalCollection.forEach((pk) => {
				const rank = Object.keys(raidDPS[t.toString().toLocaleLowerCase()] ?? {}).indexOf(pk.speciesId);
				if (rank !== -1) {
					minRaidRank = Math.min(minRaidRank, rank + 1);
				}
			});
		});
		return minRaidRank <= trashRaid;
	};

	const isBadForEverythingIfItHasHighAttack = (p: IGamemasterPokemon) => {
		if (isGoodForRaids(p)) {
			return false;
		}
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		if (reachablePokemon.some((k) => !isBadRank(rankLists[2][k.speciesId]?.rank ?? Infinity, trashMaster))) {
			return false;
		}
		if (
			reachablePokemon.some(
				(k) => !isBadRank(rankLists[0][k.speciesId]?.rank ?? Infinity, trashGreat) && !needsLessThanFiveAttack(k, 0)
			)
		) {
			return false;
		}
		if (
			reachablePokemon.some(
				(k) => !isBadRank(rankLists[1][k.speciesId]?.rank ?? Infinity, trashUltra) && !needsLessThanFiveAttack(k, 1)
			)
		) {
			return false;
		}
		return true;
	};

	const isBadForEverything = (p: IGamemasterPokemon) => {
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		const glLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[0][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		const ulLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[1][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		const mlLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[2][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		return (
			!isGoodForRaids(p) &&
			isBadRank(glLowestRank, trashGreat) &&
			isBadRank(ulLowestRank, trashUltra) &&
			isBadRank(mlLowestRank, trashMaster)
		);
	};

	const potentiallyDeletablePokemon = new Set<number>();
	const alwaysBadIfHighAtk: Record<string, Set<IGamemasterPokemon>> = {};
	const alwaysGood: Record<string, Set<IGamemasterPokemon>> = {};

	Object.values(gamemasterPokemon)
		.filter((p) => !p.aliasId && !p.isMega && !p.isLegendary && !p.isMythical && !p.isBeast)
		.forEach((p) => {
			if (isBadForEverything(p)) {
				potentiallyDeletablePokemon.add(p.dex);
			} else if (isBadForEverythingIfItHasHighAttack(p)) {
				potentiallyDeletablePokemon.add(p.dex);
				if (!alwaysBadIfHighAtk[p.dex]) {
					alwaysBadIfHighAtk[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysBadIfHighAtk[p.dex].add(p);
			} else {
				if (!alwaysGood[p.dex]) {
					alwaysGood[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysGood[p.dex].add(p);
			}
		});

	type PokemonForm = { dexNumber: number; types: Array<string>; isShadow: boolean; p: IGamemasterPokemon };
	type UniqueTypes = Record<number, Set<string>>;

	const buildUniqueTypes = (pokemonForms: Array<PokemonForm>): UniqueTypes => {
		const typeOccurrences: Record<number, Record<string, number>> = {};
		pokemonForms.forEach(({ dexNumber, types }) => {
			if (!typeOccurrences[dexNumber]) typeOccurrences[dexNumber] = {};
			types.forEach((type) => {
				typeOccurrences[dexNumber][type] = (typeOccurrences[dexNumber][type] || 0) + 1;
			});
		});
		const uniqueTypes: UniqueTypes = {};
		for (const dex in typeOccurrences) {
			const dexNumber = parseInt(dex);
			uniqueTypes[dexNumber] = new Set<string>();
			for (const type in typeOccurrences[dexNumber]) {
				if (typeOccurrences[dexNumber][type] === 1) {
					uniqueTypes[dexNumber].add(type);
				}
			}
		}
		return uniqueTypes;
	};

	const generatePokemonId = (
		dexNumber: number,
		types: Array<string>,
		uniqueTypes: UniqueTypes,
		formSiblings: Array<PokemonForm>,
		form: PokemonForm
	) => {
		if (formSiblings.length === 1) {
			return `${dexNumber}`;
		}
		let identifier = `${dexNumber}`;
		const uniqueTypesForDex = uniqueTypes[dexNumber] || new Set<string>();
		const siblingTypesToNegate = new Set<string>();
		const uniqueType = types.find((type) => uniqueTypesForDex.has(type));
		if (uniqueType) {
			identifier += `,${uniqueType}`;
		} else {
			types.forEach((type) => {
				if (formSiblings.some((t) => !t.types.includes(type))) {
					identifier += `,${type}`;
				}
			});
			formSiblings.forEach((sibling) => {
				if (sibling !== form) {
					sibling.types.forEach((siblingType) => {
						if (!types.includes(siblingType) && sibling.types.some((t) => types.includes(t))) {
							siblingTypesToNegate.add(siblingType);
						}
					});
				}
			});
			siblingTypesToNegate.forEach((type) => {
				identifier += `,!${type}`;
			});
		}
		return identifier;
	};

	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: e.isShadow,
			p: e,
		}));

	const uniqueTypes = buildUniqueTypes(allPokemonForms.filter((c) => !c.isShadow));
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber && !f.isShadow);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});

	let str = '';
	const potentiallyDeletablePokemonArray = Array.from(potentiallyDeletablePokemon);
	str += potentiallyDeletablePokemonArray.join(',');
	const terms = new Set<string>();

	potentiallyDeletablePokemonArray.forEach((d) => {
		if (alwaysGood[d]) {
			alwaysGood[d].forEach((e) => {
				let newStr = '';
				const baseId = baseIds[`${e.dex},${e.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
				newStr +=
					'&' +
					baseId
						.split(',')
						.map((f) => (f.startsWith('!') ? f.substring(1) : `!${f}`))
						.join(',');
				if (e.isShadow) {
					newStr += `,!shadow`;
				} else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
					newStr += `,shadow`;
				}
				if (!terms.has(newStr)) {
					str += newStr;
					terms.add(newStr);
				}
			});
		}
		if (alwaysBadIfHighAtk[d]) {
			alwaysBadIfHighAtk[d].forEach((e) => {
				let newStr = '';
				const baseId = baseIds[`${e.dex},${e.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
				newStr +=
					'&' +
					baseId
						.split(',')
						.map((f) => (f.startsWith('!') ? f.substring(1) : `!${f}`))
						.join(',');
				if (e.isShadow) {
					newStr += `,!shadow`;
				} else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
					newStr += `,shadow`;
				}
				newStr += `,2-${gameTranslator(GameTranslatorKeys.AttackSearch, gl)}`;
				if (!terms.has(newStr)) {
					str += newStr;
					terms.add(newStr);
				}
			});
		}
	});

	// keep the query short — Android's search box caps out around 5k characters
	const parts = str.split('&');
	const allDexes = new Set(
		Object.values(gamemasterPokemon)
			.filter((e) => !e.isMega && !e.aliasId)
			.map((f) => f.dex)
	);
	const actualDexes = new Set(parts[0].split(',').map((f) => +f));
	const specialDexes = new Set(
		Object.values(gamemasterPokemon)
			.filter((d2) => !d2.aliasId && !d2.isMega && (d2.isBeast || d2.isLegendary || d2.isMythical))
			.map((d2) => +d2.dex)
	);
	const oppositeDexes =
		'!' +
		Array.from(allDexes)
			.filter((j) => !actualDexes.has(j) || specialDexes.has(j))
			.join('&!');

	let newStr = parts[0].length <= oppositeDexes.length ? parts[0] : oppositeDexes;

	let currentDex = '';
	const buffer = new Map<string, string>();
	for (let i = 1; i < parts.length; i++) {
		const current = parts[i];
		const readDex = current.substring(1, current.indexOf(','));
		if (currentDex !== readDex) {
			currentDex = readDex;
			if (buffer.size > 0) {
				newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
				buffer.clear();
			}
		}
		const termWithoutShadowModifier = current.replaceAll(',!shadow', '').replaceAll(',shadow', '');
		if (!buffer.has(termWithoutShadowModifier)) {
			buffer.set(termWithoutShadowModifier, current);
		} else {
			buffer.set(termWithoutShadowModifier, termWithoutShadowModifier);
		}
	}
	if (buffer.size > 0) {
		newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
	}

	if (gl === GameLanguage.ptbr) {
		newStr = newStr
			.replaceAll('bug', 'inseto')
			.replaceAll('dark', 'sombrio')
			.replaceAll('dragon', 'dragão')
			.replaceAll('electric', 'elétrico')
			.replaceAll('fairy', 'fada')
			.replaceAll('fighting', 'lutador')
			.replaceAll('fire', 'fogo')
			.replaceAll('flying', 'voador')
			.replaceAll('ghost', 'fantasma')
			.replaceAll('grass', 'planta')
			.replaceAll('ground', 'terrestre')
			.replaceAll('ice', 'gelo')
			.replaceAll('poison', 'venenoso')
			.replaceAll('psychic', 'psíquico')
			.replaceAll('rock', 'pedra')
			.replaceAll('steel', 'aço')
			.replaceAll('water', 'água')
			.replaceAll('shadow', 'sombroso');
	}

	newStr += `&!4*&!#&!${gameTranslator(GameTranslatorKeys.CP, gl)}${cp}-&!${gameTranslator(
		GameTranslatorKeys.Favorite,
		gl
	)}&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;

	return newStr;
};

/* -------------------------------------------------------------------------- */

const NumSelect = ({
	label,
	value,
	onChange,
	count,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	count: number;
}) => (
	<select className='r-md-select' aria-label={label} value={value} onChange={(e) => onChange(+e.target.value)}>
		{Array.from({ length: count }, (_x, i) => i).map((n) => (
			<option key={n} value={n}>
				{n}
			</option>
		))}
	</select>
);

const MassDelete = () => {
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { movesFetchCompleted } = useMoves();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { currentGameLanguage: gl } = useLanguage();

	const [trashGreat, setTrashGreat] = useState(() => numCfg(ConfigKeys.TrashGreat, 50));
	const [trashUltra, setTrashUltra] = useState(() => numCfg(ConfigKeys.TrashUltra, 50));
	const [trashMaster, setTrashMaster] = useState(() => numCfg(ConfigKeys.TrashMaster, 110));
	const [trashRaid, setTrashRaid] = useState(() => numCfg(ConfigKeys.TrashRaid, 5));
	const [cp, setCp] = useState(() => numCfg(ConfigKeys.TrashCP, 2500));

	const [isCalculating, setIsCalculating] = useState(false);
	const [result, setResult] = useState('');
	const [copied, setCopied] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);

	const outRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => void writePersistentValue(ConfigKeys.TrashGreat, String(trashGreat)), [trashGreat]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashUltra, String(trashUltra)), [trashUltra]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashMaster, String(trashMaster)), [trashMaster]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashRaid, String(trashRaid)), [trashRaid]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashCP, String(cp)), [cp]);

	// changing any knob invalidates a stale result
	useEffect(() => {
		setResult('');
	}, [trashGreat, trashUltra, trashMaster, trashRaid, cp, gl]);

	const candidates = useMemo(
		() =>
			Object.values(gamemasterPokemon)
				.filter((p) => !p.aliasId)
				.map((p) => ({
					speciesId: p.speciesId,
					atk: p.baseStats.atk,
					def: p.baseStats.def,
					hp: p.baseStats.hp,
				})),
		[gamemasterPokemon]
	);

	const { data: lowAttackMap } = useQuery({
		enabled: isCalculating && fetchCompleted,
		queryKey: ['trash-low-attack'],
		queryFn: () => getComputeWorker().lowAttackViable({ candidates, caps: [1500, 2500] }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	useEffect(() => {
		if (
			!isCalculating ||
			!fetchCompleted ||
			!pvpFetchCompleted ||
			!raidDPSFetchCompleted ||
			!movesFetchCompleted ||
			!lowAttackMap
		) {
			return;
		}
		const id = window.setTimeout(() => {
			setResult(
				computeTrashString({
					gamemasterPokemon,
					rankLists: rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS: raidDPS as unknown as ComputeArgs['raidDPS'],
					lowAttackMap,
					gl,
					cp,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
				})
			);
			setIsCalculating(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [
		isCalculating,
		fetchCompleted,
		pvpFetchCompleted,
		raidDPSFetchCompleted,
		movesFetchCompleted,
		lowAttackMap,
		gamemasterPokemon,
		rankLists,
		raidDPS,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
	]);

	const copy = () => {
		if (!result) return;
		void navigator.clipboard?.writeText(result);
		outRef.current?.select();
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};

	const ready = fetchCompleted && pvpFetchCompleted;

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>Mass delete</h1>

			<div className='r-card r-md-help'>
				<p className={helpOpen ? '' : 'r-md-help-clamp'}>{HELP_TEXT}</p>
				<button type='button' className='r-md-more' onClick={() => setHelpOpen((v) => !v)}>
					{helpOpen ? 'Read less' : 'Read more'}
				</button>
			</div>

			<div className='r-section-h'>What to keep</div>
			<div className='r-card r-md-knobs'>
				<div className='r-md-row'>
					<span className='r-md-k'>Never delete at or above CP</span>
					<select
						className='r-md-select'
						aria-label='Never delete at or above CP'
						value={cp}
						onChange={(e) => setCp(+e.target.value)}
					>
						{CP_OPTIONS.map((n) => (
							<option key={n} value={n}>
								{n}
							</option>
						))}
					</select>
				</div>
				<div className='r-md-row'>
					<span className='r-md-k'>
						<img src='/images/leagues/great.png' alt='' width={18} height={18} />
						Keep top Great League
					</span>
					<NumSelect label='Keep top Great League' value={trashGreat} onChange={setTrashGreat} count={2000} />
				</div>
				<div className='r-md-row'>
					<span className='r-md-k'>
						<img src='/images/leagues/ultra.png' alt='' width={18} height={18} />
						Keep top Ultra League
					</span>
					<NumSelect label='Keep top Ultra League' value={trashUltra} onChange={setTrashUltra} count={2000} />
				</div>
				<div className='r-md-row'>
					<span className='r-md-k'>
						<img src='/images/leagues/master.png' alt='' width={18} height={18} />
						Keep top Master League
					</span>
					<NumSelect label='Keep top Master League' value={trashMaster} onChange={setTrashMaster} count={2000} />
				</div>
				<div className='r-md-row'>
					<span className='r-md-k'>
						<img src='/images/tx_raid_coin.png' alt='' width={18} height={18} />
						Keep top raid attackers
					</span>
					<NumSelect label='Keep top raid attackers' value={trashRaid} onChange={setTrashRaid} count={2000} />
				</div>
			</div>

			<button
				type='button'
				className='r-md-compute'
				disabled={!ready || isCalculating}
				onClick={() => {
					setResult('');
					setIsCalculating(true);
				}}
			>
				{isCalculating ? 'Computing…' : ready ? 'Compute' : 'Loading data…'}
			</button>

			<textarea
				ref={outRef}
				className='r-md-out'
				readOnly
				value={isCalculating ? 'Computing… this sweeps every species, give it a moment.' : result}
				placeholder='Your search string appears here. Paste it into the Pokémon GO search bar, review the matches, then delete.'
				onClick={copy}
			/>
			{result && (
				<button type='button' className='r-md-copy' onClick={copy}>
					{copied ? 'Copied ✓' : 'Copy search string'}
				</button>
			)}
		</div>
	);
};

export default MassDelete;
