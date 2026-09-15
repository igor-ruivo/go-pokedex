import { useEffect, useMemo, useState } from 'react';

import { Stepper } from '../../components/Stepper';
import { type GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useBestIvs, useBestIvsAtLevel } from '../../hooks/useBestIvs';
import { cleanName } from '../../lib/format';
import { buildUniqueTypes, generatePokemonId } from '../../lib/search-string';
import { usePokemon } from '../../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import {
	BEST_BUDDY_LEVEL,
	calculateCP,
	calculateHP,
	fetchPredecessorPokemonIncludingSelf,
	isNormalPokemonAndHasShadowVersion,
	MAX_LEVEL,
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

/* ---- rank-tie-aware top-N selection ----------------------------------------
   Deliberately single-level: this page's whole point is computing the exact
   result for whichever level ceiling (50, or 51 with Best Buddy) the player
   currently has toggled — `useBestIvs` below already reads that setting, and
   nothing here should second-guess it by also pulling in the OTHER level's
   own optimum "just in case". That's the opposite of this page's nature:
   unlike Mass Delete's meta-agnostic, always-both-levels carve-out sweep
   (`findBadIvCarveOuts`), a single Pokémon's search string is meant to match
   its own current setting exactly, not hedge across both. --------------- */

const statProdOf = (r: RankEntry) => Math.round(r.battle.A * r.battle.D * r.battle.S);

/**
 * "Top N" the same way the IV Table's own 1224-style competition ranking
 * works (see `competitionRank` in the compute worker): a stat-product tie
 * AT the cutoff is never split — every entry sharing the cutoff's exact
 * (rounded) stat product is included, even past the requested count. E.g.
 * ranks 1,1,3,4,5,6,6,6,9,10,10,10 asked for "top 10" returns all 12 —
 * dropping the trailing pair tied at rank 10 would silently treat two
 * genuinely-tied-for-best spreads as worse than one another.
 */
export const selectTopIVCombinations = (
	sortedDesc: ReadonlyArray<RankEntry>,
	top: number
): ReadonlyArray<RankEntry> => {
	if (top <= 0) return [];
	if (top >= sortedDesc.length) return sortedDesc;
	const boundaryProd = statProdOf(sortedDesc[top - 1]);
	let count = top;
	while (count < sortedDesc.length && statProdOf(sortedDesc[count]) === boundaryProd) count++;
	return sortedDesc.slice(0, count);
};

const dedupeCombosByIVs = (lists: ReadonlyArray<ReadonlyArray<RankEntry>>): ReadonlyArray<RankEntry> => {
	const merged = new Map<string, RankEntry>();
	for (const list of lists) {
		for (const combo of list) {
			const key = `${combo.IVs.A}-${combo.IVs.D}-${combo.IVs.S}`;
			const existing = merged.get(key);
			if (!existing || existing.L < combo.L) merged.set(key, combo);
		}
	}
	return Array.from(merged.values());
};

/**
 * The rank-1 (tie-inclusive) safety floor: no matter what cutoff the player
 * chose, and no matter which single level `core` was computed at (whichever
 * the Best Buddy toggle currently says), the species' own literal #1 stat
 * product — at BOTH level 50 AND level 51 — always rides along on top of it.
 * A spread that's rank-1 only at the OTHER level (not the one the toggle
 * currently has selected) would otherwise never appear in `core` at all and
 * could get swept up in "except" mode, or never surface in plain "find" mode,
 * purely because of which level happens to be toggled right now.
 *
 * This can't be bolted on as a literal trailing clause the way `!4*` is —
 * Pokémon GO's search grammar has no parentheses/OR-of-whole-clauses (see
 * `lib/search-string.ts`'s own top-of-file note), so a genuine "also match
 * this, as an alternative to everything else" can only be expressed by
 * feeding it into the SAME per-star-tier bucket/CP/HP bookkeeping
 * `computeSearchString` already builds from `core` — a plain unconditional
 * `&`-appended clause would instead AND onto (over-restrict) every other
 * match in "find" mode. Functionally, that's exactly the "final suffix" this
 * is meant to be: an unconditional floor added ON TOP of the core, toggle-
 * respecting selection, never a replacement for it.
 */
export const withBestBuddySafetyFloor = (
	core: ReadonlyArray<RankEntry>,
	level50: ReadonlyArray<RankEntry>,
	level51: ReadonlyArray<RankEntry>
): ReadonlyArray<RankEntry> => {
	const floor = dedupeCombosByIVs([selectTopIVCombinations(level50, 1), selectTopIVCombinations(level51, 1)]);
	return dedupeCombosByIVs([core, floor]);
};

/* ---- Shadow purification (backward direction): a raw Shadow IV that, once --
   purified (+2/stat, capped 15), becomes one of the target's own top combos -- */

/** Raw (pre-purification) IV values that purify (+2, capped 15) into `iv` —
 *  a unique value below 15 (`iv - 2`), one of three (13/14/15) exactly at 15,
 *  or none at all for 0/1 (purifying can never show less than 2). */
const purifiedSources = (iv: number): ReadonlyArray<number> => {
	if (iv === 15) return [13, 14, 15];
	if (iv >= 2) return [iv - 2];
	return [];
};

const starFromSum = (sum: number): number => {
	if (sum < 23) return 0;
	if (sum < 30) return 1;
	if (sum < 37) return 2;
	if (sum < 45) return 3;
	return 4;
};

/**
 * Expands one of the target's own (purified-space) top combos into every
 * raw, unpurified Shadow IV combo that becomes it once purified — up to 27
 * (3x3x3) when every stat is 15, one when none is. Two different target
 * combos can never share a raw preimage (purification is a function), so no
 * de-duplication is needed across calls. `L` is deliberately carried over
 * UNCHANGED from the source (purified-space) combo, not recomputed from the
 * raw IVs: purifying (like evolving) never changes a catch's level, so it's
 * still the target species' own CP-vs-level relationship, evaluated at the
 * PURIFIED IVs, that decides the highest level at which this catch is still
 * relevant to the league — exactly the same reasoning `computeSearchString`
 * already applies to every other (non-Shadow) combo via `c.L`. `CP`/`battle`
 * are unused either way; only `IVs`/`star` (the raw catch's own bucket/IV-sum
 * rating) genuinely need to be freshly computed here.
 */
const rawShadowSourcesFor = (combo: RankEntry): ReadonlyArray<RankEntry> => {
	const out: Array<RankEntry> = [];
	for (const a of purifiedSources(combo.IVs.A)) {
		for (const d of purifiedSources(combo.IVs.D)) {
			for (const s of purifiedSources(combo.IVs.S)) {
				out.push({ ...combo, IVs: { A: a, D: d, S: s, star: starFromSum(a + d + s) } });
			}
		}
	}
	return out;
};

/* ---- species identity: form + Shadow disambiguation ------------------------ */

/**
 * The shortest `dex[&type[&!type]]` identifier that pins down one specific
 * form among every dex number shared by multiple species — built once from
 * the whole gamemaster (memoize per `gamemasterPokemon` reference), keyed by
 * `dex,types` so a Shadow reuses its non-Shadow counterpart's identical
 * entry (Shadow never changes a species' dex or types). Unlike Mass Delete's
 * own use of `generatePokemonId` (always embedded in a NEGATED exclusion
 * clause via `negateIdentity`), this is a standalone, unnegated, top-level
 * positive filter — Pokémon GO's search bar ORs comma-joined terms but ANDs
 * `&`-joined ones, so `generatePokemonId`'s comma-joined output (designed to
 * become an OR-of-negations that protects an AND via De Morgan) has to be
 * re-joined with `&` here instead, to positively AND "this dex" with "this
 * type" rather than OR them.
 */
export const buildFormIds = (gamemasterPokemon: Record<string, IGamemasterPokemon>): Record<string, string> => {
	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId && !e.isShadow)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: false,
			p: e,
		}));
	const uniqueTypes = buildUniqueTypes(allPokemonForms);
	const formIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		formIds[`${form.dexNumber},${form.types.join(',')}`] = id.replaceAll(',', '&');
	});
	return formIds;
};

export const formIdentifierFor = (species: IGamemasterPokemon, formIds: Record<string, string>): string => {
	const key = `${species.dex},${species.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`;
	return formIds[key] ?? String(species.dex);
};

/** `&shadow`/`&!shadow`, ANDed onto the leading identity — needed whenever
 *  ambiguity is actually possible: always for a Shadow species block (its
 *  criteria are purification-shifted, genuinely different from any
 *  non-Shadow catch of the same form), and for a non-Shadow species block
 *  only when a Shadow form of it actually exists in the gamemaster (nothing
 *  to disambiguate against otherwise). `''` otherwise — unconditionally
 *  appending it would be harmless but pointless extra bytes. */
export const shadowSuffixFor = (
	species: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	gl: GameLanguage
): string => {
	const shadowKw = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);
	if (species.isShadow) return `&${shadowKw}`;
	return isNormalPokemonAndHasShadowVersion(species, gamemasterPokemon) ? `&!${shadowKw}` : '';
};

/* ---- backward chain: predecessors, PLUS each one's Shadow counterpart ------
   (purifying it also reaches the same, non-Shadow, target) -------------------- */

export interface SearchChainEntry {
	species: IGamemasterPokemon;
	/** True for a Shadow species included only because purifying it reaches
	 *  the (non-Shadow) target — its raw IVs need `rawShadowSourcesFor`
	 *  before matching the target's own top combos. Always false when the
	 *  target itself is Shadow (a Shadow chain needs no purification math at
	 *  all — Shadow evolves into Shadow, raw IVs unchanged, same as any
	 *  other evolution). */
	viaPurify: boolean;
}

/**
 * The inverse of `fetchReachablePokemonIncludingSelf`: every earlier
 * evolutionary stage that can still become `target`, starting from `target`
 * and expanding backward. On top of the plain (Shadow-status-matching)
 * predecessor walk, when `target` itself is non-Shadow this also adds the
 * Shadow counterpart of every one of those predecessors (target included)
 * that actually exists in the gamemaster — a wild-caught Shadow of an
 * earlier stage purifies into the ordinary (non-Shadow) stage, which then
 * evolves normally, same as any other non-Shadow catch of that stage.
 */
export const buildSearchChain = (
	target: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
): Array<SearchChainEntry> => {
	const direct = Array.from(fetchPredecessorPokemonIncludingSelf(target, gamemasterPokemon));
	const entries: Array<SearchChainEntry> = direct.map((species) => ({ species, viaPurify: false }));

	if (!target.isShadow) {
		const shadowByBase = new Map<string, IGamemasterPokemon>();
		Object.values(gamemasterPokemon).forEach((p) => {
			if (p.isShadow && !p.aliasId) shadowByBase.set(p.speciesId.replaceAll('_shadow', ''), p);
		});
		for (const species of direct) {
			const shadow = shadowByBase.get(species.speciesId);
			if (shadow) entries.push({ species: shadow, viaPurify: true });
		}
	}

	return entries.sort(
		(a, b) => sortPokemonByBattlePowerAsc(a.species, b.species) || Number(a.species.isShadow) - Number(b.species.isShadow)
	);
};

export const computeSearchString = (
	predecessor: IGamemasterPokemon,
	opts: {
		trash: boolean;
		topIVCombinations: ReadonlyArray<RankEntry>;
		gl: GameLanguage;
		formId: string;
		shadowSuffix?: string;
		viaPurify?: boolean;
	}
): string => {
	const { trash, gl, formId, shadowSuffix = '', viaPurify = false } = opts;
	const topIVCombinations = viaPurify ? opts.topIVCombinations.flatMap(rawShadowSourcesFor) : opts.topIVCombinations;

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

	for (const c of topIVCombinations) {
		// `c.L` is the level at which THIS combo's CP, on the TARGET species'
		// own base stats, reaches the league cap — not the predecessor's own
		// CP. That's deliberate, not an oversight: a wild catch's level can
		// only ever go up (never down), so what actually determines whether a
		// catch is still relevant to this league is whether evolving it (at
		// its own, as-caught level, no higher) would already push the FINAL
		// species over the cap — the predecessor's own CP along the way is
		// irrelevant to that question, it's just what the search bar can
		// actually match on for the still-unevolved catch. A weaker
		// predecessor's own CP staying well under the cap doesn't change
		// this: if the target's CP at level 30 already exceeds the cap,
		// a catch encountered at level 30 is permanently unusable for this
		// league regardless of how low the predecessor's own CP looks.
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

	let result = formId + shadowSuffix;

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
	if (trash) {
		result += '&!4*';
		// Unconditional, right alongside the exact-hundo guard above — same
		// treatment as Mass Delete's own copy of this rule (see
		// `shadowPurifyHundoGuard` in MassDelete.tsx for the full reasoning).
		// A Shadow catch with Attack, Defense, AND HP already bucket 3-4 (raw
		// 11-15) might purify (+2/stat, capped 15) into an exact 15/15/15 —
		// raw 13 or 14 reaches 15 once purified, raw 15 already is one —
		// so it's never safe to match it here on its raw IVs alone.
		result += `&0-2${A},0-2${D},0-2${S},!${gameTranslator(GameTranslatorKeys.ShadowSearch, gl)}`;
	} else if (cps[4].size > 0) result += ',4*';

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
	leagueName: string,
	viaPurify: boolean
): string => {
	const nm = (x: IGamemasterPokemon) => (x.isShadow ? 'Shadow ' : '') + cleanName(x.speciesName);
	const except = trash ? 'all except the ' : '';
	const caught = viaPurify ? '(wild caught, still unpurified and unpowered)' : '(wild caught and still unpowered)';
	const isTargetItself = p.speciesId.replaceAll('_shadow', '') === target.speciesId;
	if (isTargetItself && !viaPurify) {
		return `Find ${except}top ${top} ${nm(p)} ${caught} for ${leagueName} League:`;
	}
	if (isTargetItself) {
		return `Find ${nm(p)} ${caught} that, once purified, become the ${except}top ${top} ${nm(
			target
		)} for ${leagueName} League:`;
	}
	const evolveClause = viaPurify ? 'that, once purified, evolve to the' : 'that evolve to the';
	return `Find ${nm(p)} ${caught} ${evolveClause} ${except}top ${top} ${nm(target)} for ${leagueName} League:`;
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
	const cpCap = isPvp ? CAP[league] : 1500;
	// The core "top N" selection respects whichever level ceiling (50, or 51
	// with Best Buddy) the player currently has toggled — see the note above
	// `selectTopIVCombinations`. `safety50`/`safety51` are ONLY used to build
	// the rank-1 safety floor below (`withBestBuddySafetyFloor`) — they never
	// change which level the core "top N" itself is computed at.
	const topIVs = useBestIvs(pokemon, cpCap, isPvp);
	const safety50 = useBestIvsAtLevel(pokemon, cpCap, MAX_LEVEL, isPvp);
	const safety51 = useBestIvsAtLevel(pokemon, cpCap, BEST_BUDDY_LEVEL, isPvp);
	const topIVCombinations = useMemo(
		() => withBestBuddySafetyFloor(selectTopIVCombinations(topIVs, top), safety50, safety51),
		[topIVs, safety50, safety51, top]
	);

	const chain = useMemo(() => buildSearchChain(pokemon, gamemasterPokemon), [pokemon, gamemasterPokemon]);
	const formIds = useMemo(() => buildFormIds(gamemasterPokemon), [gamemasterPokemon]);

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
	if (topIVs.length === 0 || safety50.length === 0 || safety51.length === 0) {
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

			{chain.map(({ species: p, viaPurify }) => {
				const formId = formIdentifierFor(p, formIds);
				const shadowSuffix = shadowSuffixFor(p, gamemasterPokemon, gl);
				const str = computeSearchString(p, { trash, topIVCombinations, gl, formId, shadowSuffix, viaPurify });
				const isOpen = open === p.speciesId;
				return (
					<div key={p.speciesId} className='r-ss-block'>
						<p className='r-ss-sentence'>{sentence(p, pokemon, top, trash, leagueName, viaPurify)}</p>
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
