import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { type RaidMetric, raidRankOf } from '../lib/raid-metric';
import {
	buildUniqueTypes,
	complementOfBucket,
	generatePokemonId,
	groupAttr,
	ivBucket,
	negateIdentity,
	translatePtBrTypeNames,
} from '../lib/search-string';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf, isNormalPokemonAndHasShadowVersion } from '../utils/pokemon-helper';
import type { BadIvCarveOut } from '../workers/compute.worker';
import { getComputeWorker } from '../workers/compute-client';

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

const BAD_IV_HELP_TEXT =
	'This mode ignores the current PvP/raid meta entirely — it never looks at rankings, so it won’t change as the meta ' +
	'does. Instead, for every species it works out its own best possible IV spread for Great League (1500 CP) and ' +
	'Ultra League (2500 CP), independent of how that species stacks up against any other. The rule of thumb: a spread ' +
	'with low Attack (0-5) and high Defense/HP (11-15) is normally the best a species can do under a CP cap — trading ' +
	'Attack for a higher level buys more Defense and HP than the Attack was worth. Species whose real best spread ' +
	'doesn’t fit that shape (because their own stats are too weak to spare the Attack, or the cap barely binds them at ' +
	'all) get their own exact spread protected instead, individually. For Master League (no CP cap), more IVs are ' +
	'always strictly better, so it’s just a flat “keep anything 11+ in every stat”. A perfect 15/15/15 is always kept, ' +
	'in every league, no matter what. This never deletes any favorite, tagged, legendary, ultra beast, mythical, or ' +
	'mega-evolvable Pokémon either.';

interface ComputeArgs {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	rankLists: Array<Record<string, { rank: number } | undefined>>;
	raidDPS: Record<string, Record<string, DPSEntry>>;
	raidMetric: RaidMetric;
	lowAttackMap: Record<string, Record<number, boolean>> | undefined;
	gl: GameLanguage;
	cp: number;
	trashGreat: number;
	trashUltra: number;
	trashMaster: number;
	trashRaid: number;
	/** See `isBadForEverythingIfItHasHighAttack`'s doc comment. */
	keepForTrade: boolean;
}

/* ---- verbatim port of the legacy DeleteTrash `computeStr` ------------------- */
const computeTrashString = (a: ComputeArgs): string => {
	const {
		gamemasterPokemon,
		rankLists,
		raidDPS,
		raidMetric,
		lowAttackMap,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		keepForTrade,
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
			const list = raidDPS[t.toString().toLocaleLowerCase()];
			finalCollection.forEach((pk) => {
				const entry = list?.[pk.speciesId];
				const rank = entry && raidRankOf(entry, raidMetric);
				if (rank != null) {
					minRaidRank = Math.min(minRaidRank, rank);
				}
			});
		});
		return minRaidRank <= trashRaid;
	};

	// A Great/Ultra-relevant reachable stage that doesn't need a sub-5 Attack IV
	// to earn that relevance can always be fixed later by a Best Friend trade
	// (which floors every stat at 5) — so with `keepForTrade` on (the default,
	// matching the pre-revamp behavior), a currently-bad-IV catch of it is kept
	// unconditionally rather than trashed, on the assumption it'll get traded up
	// eventually. With it off, that assumption is disregarded entirely: those
	// two checks are skipped, so such a species falls through to the same
	// "only the naturally low-Attack catches survive" bucket as a species that
	// actually needs low Attack — for someone who knows they won't trade it,
	// not `alwaysGood`.
	const isBadForEverythingIfItHasHighAttack = (p: IGamemasterPokemon) => {
		if (isGoodForRaids(p)) {
			return false;
		}
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		if (reachablePokemon.some((k) => !isBadRank(rankLists[2][k.speciesId]?.rank ?? Infinity, trashMaster))) {
			return false;
		}
		if (
			keepForTrade &&
			reachablePokemon.some(
				(k) => !isBadRank(rankLists[0][k.speciesId]?.rank ?? Infinity, trashGreat) && !needsLessThanFiveAttack(k, 0)
			)
		) {
			return false;
		}
		if (
			keepForTrade &&
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
				newStr += '&' + negateIdentity(baseId);
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
				newStr += '&' + negateIdentity(baseId);
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
		newStr = translatePtBrTypeNames(newStr);
	}

	newStr += `&!4*&!#&!${gameTranslator(GameTranslatorKeys.CP, gl)}${cp}-&!${gameTranslator(
		GameTranslatorKeys.Favorite,
		gl
	)}&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;

	return newStr;
};

/**
 * "Mass Delete only Bad IV Pokémon" — meta-agnostic: never looks at PvP/raid
 * rankings at all, just each species' own intrinsic best-possible IV spread
 * per CP cap (see `findBadIvCarveOuts` in the compute worker, which does the
 * actual brute-force analysis this only turns into a string). Default keep
 * rule is the classic low-Attack/max-bulk CP-cap spread (0-5 Attack, 11-15
 * Defense, 11-15 HP); `carveOuts` are the species where that default doesn't
 * match their own real optimum, each protected via its own exact bucket
 * pattern instead. An exact hundo is always kept regardless (`!4*`), so
 * nothing here ever needs to special-case one.
 */
const computeBadIvString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	carveOuts: Array<BadIvCarveOut>,
	gl: GameLanguage,
	cp: number
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CP, gl);

	// Shadow forms mirror their non-shadow counterpart's stats exactly — CP
	// depends only on base stats, and shadow doesn't change those — so this
	// whole mode never needs to distinguish shadow from non-shadow at all.
	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId && !e.isShadow)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: false,
			p: e,
		}));
	const uniqueTypes = buildUniqueTypes(allPokemonForms);
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});

	// The shared Great/Ultra default clause is the primary selection criterion
	// (no leading `&`, matching Tab 1's own convention of always starting with
	// a bare positive term). Master's broader "11+ everywhere" rule is
	// deliberately not included — only an exact hundo gets a free pass, and
	// that's `!4*` at the tail, unconditionally.
	let result = `2-4${A},0-2${D},0-2${S}`;

	const seenClauses = new Set<string>();
	carveOuts.forEach(({ speciesId, pattern }) => {
		const p = gamemasterPokemon[speciesId];
		if (!p) return;
		const baseId = baseIds[`${p.dex},${p.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
		if (!baseId) return;
		const negA = groupAttr(complementOfBucket(ivBucket(pattern.A)), A);
		const negD = groupAttr(complementOfBucket(ivBucket(pattern.D)), D);
		const negS = groupAttr(complementOfBucket(ivBucket(pattern.S)), S);
		const clause = `&${negateIdentity(baseId)}${negA}${negD}${negS}`;
		if (!seenClauses.has(clause)) {
			result += clause;
			seenClauses.add(clause);
		}
	});

	if (gl === GameLanguage.ptbr) {
		result = translatePtBrTypeNames(result);
	}

	result += `&!4*&!#&!${CP}${cp}-&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}&!${gameTranslator(
		GameTranslatorKeys.MegaEvolve,
		gl
	)}&!${gameTranslator(GameTranslatorKeys.Legendary, gl)}&!${gameTranslator(
		GameTranslatorKeys.Mythical,
		gl
	)}&!${gameTranslator(GameTranslatorKeys.UltraBeast, gl)}`;

	return result;
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
	const { maxLevel } = useBestBuddy();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { raidMetric } = useRaidMetric();
	const { currentGameLanguage: gl } = useLanguage();

	const [mode, setMode] = useState<'meta' | 'badIv'>(() =>
		readPersistentValue(ConfigKeys.MassDeleteMode) === 'badIv' ? 'badIv' : 'meta'
	);
	useEffect(() => void writePersistentValue(ConfigKeys.MassDeleteMode, mode), [mode]);

	const [trashGreat, setTrashGreat] = useState(() => numCfg(ConfigKeys.TrashGreat, 50));
	const [trashUltra, setTrashUltra] = useState(() => numCfg(ConfigKeys.TrashUltra, 50));
	const [trashMaster, setTrashMaster] = useState(() => numCfg(ConfigKeys.TrashMaster, 110));
	const [trashRaid, setTrashRaid] = useState(() => numCfg(ConfigKeys.TrashRaid, 5));
	const [cp, setCp] = useState(() => numCfg(ConfigKeys.TrashCP, 2500));
	// Default true: a wild catch that only needs a future Best Friend trade
	// (floors every stat at 5) to become meta-relevant is kept, not trashed —
	// see `isBadForEverythingIfItHasHighAttack`'s doc comment.
	const [keepForTrade, setKeepForTrade] = useState(() => readPersistentValue(ConfigKeys.TrashKeepForTrade) !== 'false');

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
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepForTrade, String(keepForTrade)), [keepForTrade]);

	// changing any knob invalidates a stale result
	useEffect(() => {
		setResult('');
	}, [trashGreat, trashUltra, trashMaster, trashRaid, cp, gl, raidMetric, keepForTrade]);

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
		queryKey: ['trash-low-attack', maxLevel],
		queryFn: () => getComputeWorker().lowAttackViable({ candidates, caps: [1500, 2500], maxLevel }),
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
					raidDPS,
					raidMetric,
					lowAttackMap,
					gl,
					cp,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
					keepForTrade,
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
		raidMetric,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		keepForTrade,
	]);

	// ---- "Bad IV" mode ----
	const [isCalculatingBadIv, setIsCalculatingBadIv] = useState(false);
	const [badIvResult, setBadIvResult] = useState('');

	// The heavy part — the brute-force sweep for every species' own best spread
	// per cap — never depends on `cp`/`gl`, so it's cached indefinitely and only
	// ever runs once per session; only the (cheap) string assembly below reacts
	// to those.
	const { data: badIvCarveOuts } = useQuery({
		enabled: isCalculatingBadIv && fetchCompleted,
		queryKey: ['bad-iv-carveouts'],
		queryFn: () => getComputeWorker().findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	useEffect(() => {
		if (!isCalculatingBadIv || !fetchCompleted || !badIvCarveOuts) return;
		const id = window.setTimeout(() => {
			setBadIvResult(computeBadIvString(gamemasterPokemon, badIvCarveOuts, gl, cp));
			setIsCalculatingBadIv(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [isCalculatingBadIv, fetchCompleted, badIvCarveOuts, gamemasterPokemon, gl, cp]);

	// changing the CP floor or language invalidates a stale result (the
	// carve-out sweep itself is unaffected, so no need to recompute that part)
	useEffect(() => {
		setBadIvResult('');
	}, [cp, gl]);

	const isBadIv = mode === 'badIv';
	const activeResult = isBadIv ? badIvResult : result;
	const activeCalculating = isBadIv ? isCalculatingBadIv : isCalculating;

	const copy = () => {
		if (!activeResult) return;
		void navigator.clipboard?.writeText(activeResult);
		outRef.current?.select();
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};

	const ready = fetchCompleted && pvpFetchCompleted;

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>
				{isBadIv ? 'Mass Delete only Bad IV Pokémon' : 'Mass Delete current non-meta relevant Pokémon'}
			</h1>

			<div className='r-seg r-seg--wrap r-md-mode-seg' role='tablist' aria-label='Mass delete mode'>
				<button type='button' data-active={!isBadIv} onClick={() => setMode('meta')}>
					Non-meta relevant
				</button>
				<button type='button' data-active={isBadIv} onClick={() => setMode('badIv')}>
					Bad IV
				</button>
			</div>

			<div className='r-card r-md-help'>
				<p className={helpOpen ? '' : 'r-md-help-clamp'}>{isBadIv ? BAD_IV_HELP_TEXT : HELP_TEXT}</p>
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
				{!isBadIv && (
					<>
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
						<div className='r-md-row'>
							<button
								type='button'
								className='r-ss-toggle'
								data-on={keepForTrade ? '' : undefined}
								aria-pressed={keepForTrade}
								onClick={() => setKeepForTrade((v) => !v)}
							>
								<span className='r-ss-box' aria-hidden='true' />
								Keep pokémon relevant for trade
							</button>
						</div>
					</>
				)}
			</div>

			<button
				type='button'
				className='r-md-compute'
				disabled={!ready || activeCalculating}
				onClick={() => {
					if (isBadIv) {
						setBadIvResult('');
						setIsCalculatingBadIv(true);
					} else {
						setResult('');
						setIsCalculating(true);
					}
				}}
			>
				{activeCalculating ? 'Computing…' : ready ? 'Compute' : 'Loading data…'}
			</button>

			<textarea
				ref={outRef}
				className='r-md-out'
				readOnly
				value={activeCalculating ? 'Computing… this sweeps every species, give it a moment.' : activeResult}
				placeholder='Your search string appears here. Paste it into the Pokémon GO search bar, review the matches, then delete.'
				onClick={copy}
			/>
			{activeResult && (
				<button type='button' className='r-md-copy' onClick={copy}>
					{copied ? 'Copied ✓' : 'Copy search string'}
				</button>
			)}
		</div>
	);
};

export default MassDelete;
