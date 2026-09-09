import { useEffect, useMemo, useState } from 'react';

import { Stepper } from '../../components/Stepper';
import { type GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useBestIvs } from '../../hooks/useBestIvs';
import { cleanName } from '../../lib/format';
import { usePokemon } from '../../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import {
	calculateCP,
	calculateHP,
	fetchPredecessorPokemonIncludingSelf,
	type RankEntry,
	sortPokemonByBattlePowerAsc,
} from '../../utils/pokemon-helper';

const CAP = [1500, 2500, Number.MAX_VALUE] as const;
const LEAGUE_NAME = ['Great', 'Ultra', 'Master'] as const;

/* ---- verbatim from the legacy search-string generator ---------------------- */

const getRanges = (array: Array<number>): Array<string> => {
	if (array.length === 0) return [];
	const sorted = [...array].sort((a, b) => a - b);
	const result: Array<string> = [];
	let start = sorted[0];
	let end = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		if (current === end + 1) {
			end = current;
		} else {
			result.push(start === end ? `${start}` : `${start}-${end}`);
			start = end = current;
		}
	}
	result.push(start === end ? `${start}` : `${start}-${end}`);
	return result;
};

const groupAttr = (input: Set<number>, lang: string): string => {
	const output = Array.from(input);
	output.sort((a, b) => a - b);
	const ranges = getRanges(output);
	if (ranges.length < 1) return '';
	let checkStr = ranges.join(',') + lang;
	const splitStr = checkStr.split(',');
	if (splitStr.length > 1) {
		for (let i = 0; i < splitStr.length; i++) {
			if (!splitStr[i].includes(lang)) splitStr[i] = splitStr[i] + lang;
		}
		checkStr = splitStr.join(',');
	}
	return ',' + checkStr;
};

const getMatchingString = (a: Array<number>, t: string): string => {
	let list = '';
	let last = -1;
	for (let i = 0; i < a.length; i++) {
		if (a[i] === last + 1) {
			list += '-';
			last = a[i];
			while (++i < a.length) {
				if (a[i] !== last + 1) break;
				last = a[i];
			}
			if (a[--i] < 9999) list += a[i];
		} else {
			list += ',' + t + a[i];
			last = a[i];
		}
	}
	return list.substring(1);
};

const trashFlip = (cps: Set<number>, maxCP: number, attr: boolean): Set<number> => {
	for (let i = attr ? 0 : 10; i <= maxCP; i++) {
		if (cps.has(i)) cps.delete(i);
		else cps.add(i);
	}
	return cps;
};

const computeSearchString = (
	predecessor: IGamemasterPokemon,
	opts: { top: number; trash: boolean; topIVCombinations: ReadonlyArray<RankEntry>; gl: GameLanguage }
): string => {
	const { top, trash, topIVCombinations, gl } = opts;

	const cps: Array<Set<number>> = [];
	const hps: Array<Set<number>> = [];
	const atkivs: Array<Set<number>> = [];
	const defivs: Array<Set<number>> = [];
	const hpivs: Array<Set<number>> = [];
	for (let i = 0; i <= 4; i++) {
		cps[i] = new Set<number>();
		hps[i] = new Set<number>();
		atkivs[i] = new Set<number>();
		defivs[i] = new Set<number>();
		hpivs[i] = new Set<number>();
	}

	const maxCP: Array<number> = Array.from({ length: 5 }, () => 0);
	const maxHP: Array<number> = Array.from({ length: 5 }, () => 0);

	for (let i = 0; i < top; i++) {
		const c = topIVCombinations[i];
		if (!c) break;
		const maxLevel = c.L;
		const atkBucket = c.IVs.A === 15 ? 4 : Math.ceil(c.IVs.A / 5);
		const defBucket = c.IVs.D === 15 ? 4 : Math.ceil(c.IVs.D / 5);
		const hpBucket = c.IVs.S === 15 ? 4 : Math.ceil(c.IVs.S / 5);
		const star = c.IVs.star;
		const baseatk = predecessor.baseStats.atk;
		const basedef = predecessor.baseStats.def;
		const basesta = predecessor.baseStats.hp;

		for (let j = 0; j <= (Math.min(35, maxLevel) - 1) * 2; j += 2) {
			const cp = calculateCP(baseatk, c.IVs.A, basedef, c.IVs.D, basesta, c.IVs.S, j);
			const hp = calculateHP(basesta, c.IVs.S, j);
			cps[star].add(cp);
			hps[star].add(hp);
			atkivs[star].add(atkBucket);
			defivs[star].add(defBucket);
			hpivs[star].add(hpBucket);
			if (maxCP[star] < cp) maxCP[star] = cp;
			if (maxHP[star] < hp) maxHP[star] = hp;
		}
	}

	let result = predecessor.dex.toString();

	if (trash) {
		for (let i = 0; i < atkivs.length; i++) {
			atkivs[i] = trashFlip(atkivs[i], 4, true);
			defivs[i] = trashFlip(defivs[i], 4, true);
			hpivs[i] = trashFlip(hpivs[i], 4, true);
		}
	}

	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CP, gl);

	let emptyBuf = '';
	for (let i = 0; i < 4; i++) {
		if (cps[i].size > 0) {
			if (trash) {
				cps[i] = trashFlip(cps[i], maxCP[i], false);
				if (hps[i].size > 0) hps[i] = trashFlip(hps[i], maxHP[i], false);
			}
			const sortedCps = Array.from(cps[i]).sort((a, b) => a - b);
			result += '&!' + i + '*' + groupAttr(atkivs[i], A);
			if (!trash) result += '&!' + i + '*';
			result += groupAttr(defivs[i], D);
			if (!trash) result += '&!' + i + '*';
			result += groupAttr(hpivs[i], S);
			if (!trash) result += '&!' + i + '*';
			result += ',' + getMatchingString(sortedCps, CP);
			if (!trash) result += '&!' + i + '*';
			else result += ',' + CP + String(maxCP[i] + 1) + '-';
			if (hps[i].size > 0) {
				const sortedHps = Array.from(hps[i]).sort((a, b) => a - b);
				result += ',' + getMatchingString(sortedHps, S);
				if (trash) result += ',' + S + String(maxHP[i] + 1) + '-';
			}
		} else if (!trash) {
			emptyBuf += '&!' + i + '*';
		}
	}

	result += emptyBuf;
	if (trash) result += '&!4*';
	else if (cps[4].size > 0) result += ',4*';

	return result;
};

/* -------------------------------------------------------------------------- */

const ClipIcon = () => (
	<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
		<rect x='9' y='9' width='11' height='11' rx='2' />
		<path d='M5 15V5a2 2 0 0 1 2-2h8' />
	</svg>
);

/** Legacy sentence construction — the wording matters, it tells the user what they're matching. */
const sentence = (
	p: IGamemasterPokemon,
	target: IGamemasterPokemon,
	top: number,
	trash: boolean,
	leagueName: string
): string => {
	const nm = (x: IGamemasterPokemon) => (x.isShadow ? 'Shadow ' : '') + cleanName(x.speciesName);
	const except = trash ? 'all except the ' : '';
	if (p.speciesId === target.speciesId) {
		return `Find ${except}top ${top} ${nm(p)} (wild caught and still unpowered) for ${leagueName} League:`;
	}
	return `Find ${nm(p)} (wild caught and still unpowered) that evolve to the ${except}top ${top} ${nm(
		target
	)} for ${leagueName} League:`;
};

const SearchStringsTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { gamemasterPokemon } = usePokemon();
	const { currentGameLanguage: gl } = useLanguage();

	const [top, setTop] = useState(() => {
		const v = readPersistentValue(ConfigKeys.TopPokemonInSearchString);
		return v ? Math.min(4096, Math.max(1, +v)) : 10;
	});
	const [trash, setTrash] = useState(() => readPersistentValue(ConfigKeys.TrashString) === 'true');
	const [copied, setCopied] = useState('');
	const [open, setOpen] = useState('');

	useEffect(() => {
		writePersistentValue(ConfigKeys.TopPokemonInSearchString, String(top));
	}, [top]);
	useEffect(() => {
		writePersistentValue(ConfigKeys.TrashString, String(trash));
	}, [trash]);

	const isPvp = league === 0 || league === 1 || league === 2;
	const topIVs = useBestIvs(pokemon, isPvp ? CAP[league] : 1500, isPvp);

	const chain = useMemo(
		() => [...fetchPredecessorPokemonIncludingSelf(pokemon, gamemasterPokemon)].sort(sortPokemonByBattlePowerAsc),
		[pokemon, gamemasterPokemon]
	);

	const copy = (id: string, str: string) => {
		void navigator.clipboard?.writeText(str);
		setCopied(id);
		window.setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1400);
	};

	if (!isPvp) {
		return (
			<div className='r-movecontent'>
				<div className='r-card' style={{ textAlign: 'center' }}>
					<p className='r-muted'>Search strings are a PvP thing — pick Great, Ultra or Master above.</p>
				</div>
			</div>
		);
	}
	if (topIVs.length === 0) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	const leagueName = LEAGUE_NAME[league];

	return (
		<div className='r-movecontent'>
			<div className='r-section-h'>{leagueName} League · in-game search strings</div>

			<div className='r-card r-ss-controls'>
				<div className='r-ss-cut'>
					<span>Rank cutoff</span>
					<Stepper
						value={top}
						min={1}
						max={4096}
						step={1}
						onChange={(v) => setTop(Math.round(v))}
						format={(v) => `Top ${v}`}
					/>
				</div>
				<button
					type='button'
					className='r-ss-toggle'
					data-on={trash ? '' : undefined}
					aria-pressed={trash}
					onClick={() => setTrash((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					Match everything <em>except</em> the top {top}
				</button>
			</div>

			<p className='r-muted' style={{ margin: '0 2px 12px', fontSize: 12 }}>
				Each line matches wild, unpowered catches whose family reaches the cutoff. Copy it, then paste into the Pokémon
				GO search bar.
			</p>

			{chain.map((p) => {
				const str = computeSearchString(p, { top, trash, topIVCombinations: topIVs, gl });
				const isOpen = open === p.speciesId;
				return (
					<div key={p.speciesId} className='r-ss-block'>
						<p className='r-ss-sentence'>{sentence(p, pokemon, top, trash, leagueName)}</p>
						<div className='r-ss-actions'>
							<button type='button' className='r-ss-copybtn' onClick={() => copy(p.speciesId, str)}>
								<ClipIcon />
								{copied === p.speciesId ? 'Copied ✓' : 'Copy string'}
							</button>
							<button
								type='button'
								className='r-ss-reveal'
								data-on={isOpen ? '' : undefined}
								aria-expanded={isOpen}
								onClick={() => setOpen((c) => (c === p.speciesId ? '' : p.speciesId))}
							>
								<span className='r-ss-preview'>{str}</span>
								<span className='r-ss-chev' aria-hidden='true'>
									⌄
								</span>
							</button>
						</div>
						{isOpen && (
							<button type='button' className='r-ss-raw' onClick={() => copy(p.speciesId, str)} title='Click to copy'>
								{str}
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
};

export default SearchStringsTab;
