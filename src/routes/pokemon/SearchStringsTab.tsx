import { useEffect, useMemo, useState } from 'react';

import { handleSpriteError, spriteUrl } from '../../components/Sprite';
import { Stepper } from '../../components/Stepper';
import { useImageSource } from '../../contexts/imageSource-context';
import { type GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { ISpeciesSearchMetadata } from '../../DTOs/ISpeciesSearchMetadata';
import { useBestIvs } from '../../hooks/useBestIvs';
import { cleanName } from '../../lib/format';
import { typeVar } from '../../lib/types';
import { usePokemon } from '../../queries/pokemon';
import { useSpeciesSearchMetadata } from '../../queries/species-search-metadata';
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
const LEAGUE_COLOR_VAR = ['--lg-great', '--lg-ultra', '--lg-master'] as const;

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

/** Looks up `species`'s metadata entry, throwing loudly if it's missing —
 *  callers must gate on `useSpeciesSearchMetadata`'s own `fetchCompleted`
 *  before ever rendering anything that reaches this. There is no on-the-fly
 *  fallback computation; dex-server is the single source of truth. */
const requireMetadata = (
	species: IGamemasterPokemon,
	metadata: Record<string, ISpeciesSearchMetadata>
): ISpeciesSearchMetadata => {
	const entry = metadata[species.speciesId];
	if (!entry) {
		throw new Error(
			`speciesSearchMetadata is missing an entry for "${species.speciesId}" — metadata isn't loaded yet.`
		);
	}
	return entry;
};

/** dex-server's precomputed `searchFormId` — the shortest `dex[&type[&!type]]`
 *  identifier that pins down this species' own form among every dex number
 *  shared by multiple species (see `form-identifier-calculator.ts` in
 *  dex-server for how it's built). */
export const formIdentifierFor = (
	species: IGamemasterPokemon,
	metadata: Record<string, ISpeciesSearchMetadata>
): string => requireMetadata(species, metadata).searchFormId;

/** `&shadow`/`&!shadow`, ANDed onto the leading identity — needed whenever
 *  ambiguity is actually possible: always for a Shadow species block (its
 *  criteria are purification-shifted, genuinely different from any
 *  non-Shadow catch of the same form), and for a non-Shadow species block
 *  only when a Shadow form of it actually exists in the gamemaster (nothing
 *  to disambiguate against otherwise). `''` otherwise — unconditionally
 *  appending it would be harmless but pointless extra bytes.
 *
 *  Reads `species.shadowSpecies` directly (precomputed by dex-server's
 *  `family-relations-calculator.ts`) — no `speciesSearchMetadata` needed at
 *  all here any more, and no gamemaster scan. */
export const shadowSuffixFor = (species: IGamemasterPokemon, gl: GameLanguage): string => {
	const shadowKw = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);
	if (species.isShadow) return `&${shadowKw}`;
	return species.shadowSpecies !== undefined ? `&!${shadowKw}` : '';
};

/* ---- backward chain: predecessors, PLUS each one's Shadow counterpart ------
   (purifying it also reaches the same, non-Shadow, target) -------------------- */

export interface SearchChainEntry {
	/** The non-Shadow species at this evolutionary stage — present unless
	 *  `target` itself is Shadow, in which case the whole chain is
	 *  Shadow-only and this is undefined on every entry. */
	nonShadow?: IGamemasterPokemon;
	/** The Shadow species at this stage: either the purify-reachable Shadow
	 *  counterpart of `nonShadow` (when one exists in the gamemaster and
	 *  `target` is non-Shadow — the case `computeMergedSearchString` merges
	 *  with `nonShadow`), or, when `target` itself is Shadow, this stage's
	 *  own (only) species, with `nonShadow` left undefined — nothing to
	 *  merge with in that case, since a Shadow chain never involves
	 *  purification math at all (Shadow evolves into Shadow, raw IVs
	 *  unchanged, same as any other evolution). */
	shadow?: IGamemasterPokemon;
}

/**
 * The inverse of `fetchReachablePokemonIncludingSelf`: every earlier
 * evolutionary stage that can still become `target`, starting from `target`
 * and expanding backward — one entry per STAGE (not per Shadow status), each
 * carrying its non-Shadow species and, when one exists, its Shadow
 * counterpart too, ready for `computeMergedSearchString` to combine into a
 * single string. A wild-caught Shadow of an earlier stage purifies into the
 * ordinary (non-Shadow) stage, which then evolves normally, same as any
 * other non-Shadow catch of that stage — that's what makes it a legitimate
 * additional predecessor at all, not just a stray inclusion.
 */
export const buildSearchChain = (
	target: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
): Array<SearchChainEntry> => {
	const direct = Array.from(fetchPredecessorPokemonIncludingSelf(target, gamemasterPokemon));

	if (target.isShadow) {
		return direct
			.map((species) => ({ shadow: species }))
			.sort((a, b) => sortPokemonByBattlePowerAsc(a.shadow, b.shadow));
	}

	// Direct field read (precomputed by dex-server's own
	// `family-relations-calculator.ts`) — no whole-gamemaster scan, no
	// speciesId string surgery.
	return direct
		.map((species) => {
			const shadow = species.shadowSpecies ? gamemasterPokemon[species.shadowSpecies] : undefined;
			return shadow ? { nonShadow: species, shadow } : { nonShadow: species };
		})
		.sort((a, b) => sortPokemonByBattlePowerAsc(a.nonShadow, b.nonShadow));
};

/* ---- per-star-tier bucket/CP/HP bookkeeping — shared by the solo and -------
   merged string builders below ------------------------------------------- */

interface TierBucket {
	cps: Set<number>;
	hps: Set<number>;
	atkivs: Set<number>;
	defivs: Set<number>;
	hpivs: Set<number>;
	maxCP: number;
	maxHP: number;
}

const emptyTierBucket = (): TierBucket => ({
	cps: new Set(),
	hps: new Set(),
	atkivs: new Set(),
	defivs: new Set(),
	hpivs: new Set(),
	maxCP: 0,
	maxHP: 0,
});

/** Buckets every combo (optionally purify-expanded first) into its own star
 *  tier's CP/HP/IV-bucket sets, for `species`'s own base stats. */
const computeTierBuckets = (
	species: IGamemasterPokemon,
	topIVCombinations: ReadonlyArray<RankEntry>,
	viaPurify: boolean
): Array<TierBucket> => {
	const combos = viaPurify ? topIVCombinations.flatMap(rawShadowSourcesFor) : topIVCombinations;
	const tiers: Array<TierBucket> = Array.from({ length: 5 }, emptyTierBucket);
	const baseatk = species.baseStats.atk;
	const basedef = species.baseStats.def;
	const basesta = species.baseStats.hp;

	for (const c of combos) {
		// `c.L` is the level at which THIS combo's CP, on the TARGET species'
		// own base stats, reaches the league cap — not this species' own CP.
		// That's deliberate, not an oversight: a wild catch's level can only
		// ever go up (never down), so what actually determines whether a
		// catch is still relevant to this league is whether evolving it (at
		// its own, as-caught level, no higher) would already push the FINAL
		// species over the cap — this species' own CP along the way is
		// irrelevant to that question, it's just what the search bar can
		// actually match on for the still-unevolved catch.
		const maxLevel = c.L;
		const atkBucket = c.IVs.A === 15 ? 4 : Math.ceil(c.IVs.A / 5);
		const defBucket = c.IVs.D === 15 ? 4 : Math.ceil(c.IVs.D / 5);
		const hpBucket = c.IVs.S === 15 ? 4 : Math.ceil(c.IVs.S / 5);
		const tier = tiers[c.IVs.star];

		for (let j = 0; j <= (Math.min(35, maxLevel) - 1) * 2; j += 2) {
			const cp = calculateCP(baseatk, c.IVs.A, basedef, c.IVs.D, basesta, c.IVs.S, j);
			const hp = calculateHP(basesta, c.IVs.S, j);
			tier.cps.add(cp);
			tier.hps.add(hp);
			tier.atkivs.add(atkBucket);
			tier.defivs.add(defBucket);
			tier.hpivs.add(hpBucket);
			if (tier.maxCP < cp) tier.maxCP = cp;
			if (tier.maxHP < hp) tier.maxHP = hp;
		}
	}
	return tiers;
};

/** "Except" mode's bucket/CP/HP complement — mutates every tier in place,
 *  same as the solo builder always did. */
const applyTrashFlipToTiers = (tiers: ReadonlyArray<TierBucket>): void => {
	for (const tier of tiers) {
		tier.atkivs = trashFlip(tier.atkivs, 4, true);
		tier.defivs = trashFlip(tier.defivs, 4, true);
		tier.hpivs = trashFlip(tier.hpivs, 4, true);
		if (tier.cps.size > 0) {
			tier.cps = trashFlip(tier.cps, tier.maxCP, false);
			if (tier.hps.size > 0) tier.hps = trashFlip(tier.hps, tier.maxHP, false);
		}
	}
};

const setsEqual = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean => {
	if (a.size !== b.size) return false;
	for (const v of a) if (!b.has(v)) return false;
	return true;
};

/** Whether two tiers need IDENTICAL criteria — `maxCP`/`maxHP` are derived
 *  from `cps`/`hps` so comparing those two is redundant once the sets match. */
const tierBucketsEqual = (a: TierBucket, b: TierBucket): boolean =>
	setsEqual(a.cps, b.cps) &&
	setsEqual(a.hps, b.hps) &&
	setsEqual(a.atkivs, b.atkivs) &&
	setsEqual(a.defivs, b.defivs) &&
	setsEqual(a.hpivs, b.hpivs);

/** Renders one star tier's contribution to the string. `scope` is `''` for a
 *  solo (non-merged) string or a tier both sides agree on (Case A); it's
 *  `,shadow` or `,!shadow` — folded into every clause this tier emits, right
 *  alongside the tier's own `!i*` escape — when the two sides differ (Case
 *  B) and this is one side's own half of the pair. Empty in "except" mode
 *  means literally nothing to emit (an empty tier already needs no
 *  protection, scoped or not); empty in "find" mode still needs the bare
 *  `!i*[,scope]` exclusion so that shadow status alone doesn't accidentally
 *  make this tier match everything. */
const renderTier = (
	i: number,
	tier: TierBucket,
	trash: boolean,
	A: string,
	D: string,
	S: string,
	CP: string,
	scope: string
): string => {
	if (tier.cps.size === 0) return trash ? '' : `&!${i}*${scope}`;

	const sortedCps = Array.from(tier.cps).sort((a, b) => a - b);
	if (trash) {
		let s = `&!${i}*${scope}${groupAttr(tier.atkivs, A)}${groupAttr(tier.defivs, D)}${groupAttr(tier.hpivs, S)}`;
		s += `,${getMatchingString(sortedCps, CP)},${CP}${tier.maxCP + 1}-`;
		if (tier.hps.size > 0) {
			const sortedHps = Array.from(tier.hps).sort((a, b) => a - b);
			s += `,${getMatchingString(sortedHps, S)},${S}${tier.maxHP + 1}-`;
		}
		return s;
	}

	let s = `&!${i}*${scope}${groupAttr(tier.atkivs, A)}`;
	s += `&!${i}*${scope}${groupAttr(tier.defivs, D)}`;
	s += `&!${i}*${scope}${groupAttr(tier.hpivs, S)}`;
	s += `&!${i}*${scope},${getMatchingString(sortedCps, CP)}`;
	if (tier.hps.size > 0) {
		const sortedHps = Array.from(tier.hps).sort((a, b) => a - b);
		s += `&!${i}*${scope},${getMatchingString(sortedHps, S)}`;
	}
	return s;
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
	const tiers = computeTierBuckets(predecessor, opts.topIVCombinations, viaPurify);
	if (trash) applyTrashFlipToTiers(tiers);

	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CP, gl);

	let result = formId + shadowSuffix;
	// Populated tiers render in order as encountered; empty ("find" mode
	// only) tiers are collected and appended after every populated one —
	// matches this function's original, already-tested ordering exactly.
	let emptyBuf = '';
	for (let i = 0; i < 4; i++) {
		if (tiers[i].cps.size > 0) {
			result += renderTier(i, tiers[i], trash, A, D, S, CP, '');
		} else if (!trash) {
			emptyBuf += `&!${i}*`;
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
	} else if (tiers[4].cps.size > 0) result += ',4*';

	return result;
};

/**
 * Combines a species' non-Shadow and Shadow-purify blocks into ONE string
 * instead of two — with EXACTLY the same matched/protected population as
 * running them separately, never a looser approximation of it. Per star
 * tier: when both sides need IDENTICAL criteria, one shared clause is
 * emitted (Case A — purification didn't actually change anything for this
 * tier, so the Shadow distinction was never doing any work here). When they
 * differ (Case B — the common case, since purification usually shifts which
 * raw buckets are optimal), each of that tier's clauses is emitted twice,
 * once per side, with a `shadow`/`!shadow` term folded into its own OR-list
 * rather than as a separate leading AND'd clause. That's the standard
 * two-clause CNF encoding of "if shadow then (this side's criteria) else
 * (the other side's)" — provably a strict rewrite of the same boolean
 * condition the two separate strings already computed, not a shortcut:
 * for a mon that's genuinely tier `i`, its own OWN shadow status makes the
 * OTHER side's clause trivially pass (via the escape term) while its own
 * side's clause still gates it exactly as the un-merged string would have.
 */
export const computeMergedSearchString = (
	nonShadow: IGamemasterPokemon,
	shadow: IGamemasterPokemon,
	opts: { trash: boolean; topIVCombinations: ReadonlyArray<RankEntry>; gl: GameLanguage; formId: string }
): string => {
	const { trash, gl, formId } = opts;
	const tiersA = computeTierBuckets(nonShadow, opts.topIVCombinations, false);
	const tiersB = computeTierBuckets(shadow, opts.topIVCombinations, true);
	if (trash) {
		applyTrashFlipToTiers(tiersA);
		applyTrashFlipToTiers(tiersB);
	}

	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CP, gl);
	const shadowKw = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);

	let result = formId;
	for (let i = 0; i < 4; i++) {
		if (tierBucketsEqual(tiersA[i], tiersB[i])) {
			result += renderTier(i, tiersA[i], trash, A, D, S, CP, '');
		} else {
			result += renderTier(i, tiersA[i], trash, A, D, S, CP, `,${shadowKw}`);
			result += renderTier(i, tiersB[i], trash, A, D, S, CP, `,!${shadowKw}`);
		}
	}

	if (trash) {
		result += '&!4*';
		result += `&0-2${A},0-2${D},0-2${S},!${shadowKw}`;
	} else if (tiersA[4].cps.size > 0 || tiersB[4].cps.size > 0) {
		result += ',4*';
	}

	return result;
};

/* -------------------------------------------------------------------------- */

const ClipIcon = () => (
	<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
		<rect x='9' y='9' width='11' height='11' rx='2' />
		<path d='M5 15V5a2 2 0 0 1 2-2h8' />
	</svg>
);

/** A species name painted with its own primary type's colour — the same
 *  `--t-*` vars the rest of the app already tints itself from (see
 *  `typeVar`/`accentStyle` in lib/types.ts). */
const NameLabel = ({ p }: { p: IGamemasterPokemon }) => (
	<span style={{ color: typeVar(p.types[0]), fontWeight: 600 }}>
		{(p.isShadow ? 'Shadow ' : '') + cleanName(p.speciesName)}
	</span>
);

/** A league name painted with that league's own identity colour — the same
 *  `--lg-*` vars used elsewhere (e.g. the league dots on the ranking cards),
 *  not a page-specific colour, so it stays consistent across the app. */
const LeagueLabel = ({ leagueName, colorVar }: { leagueName: string; colorVar: string }) => (
	<span style={{ color: `var(${colorVar})`, fontWeight: 600 }}>{leagueName} League</span>
);

/** Legacy sentence construction — the wording matters, it tells the user what they're matching. */
const sentence = (
	entry: SearchChainEntry,
	target: IGamemasterPokemon,
	top: number,
	trash: boolean,
	leagueName: string,
	leagueColorVar: string
) => {
	const except = trash ? 'all except the ' : '';
	// "the" belongs right before "top" only in the default phrasing ("to the
	// top 10") — the "except" phrasing already supplies its own "the" further
	// in ("to all except the top 10"), so a second one would double up.
	const toThe = trash ? '' : 'the ';
	const caught = '(wild caught and still unpowered)';
	const league = <LeagueLabel leagueName={leagueName} colorVar={leagueColorVar} />;

	if (entry.nonShadow && entry.shadow) {
		const p = entry.nonShadow;
		const who = (
			<>
				<NameLabel p={p} /> — Shadow or not —
			</>
		);
		const isTargetItself = p.speciesId === target.speciesId;
		if (isTargetItself) {
			return (
				<>
					Find {except}top {top} {who} {caught} for {league}:
				</>
			);
		}
		return (
			<>
				Find {who} {caught} that evolve to {toThe}
				{except}top {top} <NameLabel p={target} /> for {league}:
			</>
		);
	}

	const p = (entry.nonShadow ?? entry.shadow)!;
	const isTargetItself = p.speciesId === target.speciesId;
	if (isTargetItself) {
		return (
			<>
				Find {except}top {top} <NameLabel p={p} /> {caught} for {league}:
			</>
		);
	}
	return (
		<>
			Find <NameLabel p={p} /> {caught} that evolve to {toThe}
			{except}top {top} <NameLabel p={target} /> for {league}:
		</>
	);
};

const SearchStringsTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { gamemasterPokemon } = usePokemon();
	const { speciesSearchMetadata, fetchCompleted: speciesSearchMetadataFetchCompleted } = useSpeciesSearchMetadata();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();

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
	// Always honors whichever single level ceiling (50, or 51 with Best Buddy)
	// the player currently has toggled — see the note above
	// `selectTopIVCombinations`. No cross-level floor: the other level's own
	// rank-1 spread is deliberately never pulled in, matching every other
	// tab's own single-level-only rule now.
	const topIVs = useBestIvs(pokemon, cpCap, isPvp);
	const topIVCombinations = useMemo(() => selectTopIVCombinations(topIVs, top), [topIVs, top]);

	const chain = useMemo(() => buildSearchChain(pokemon, gamemasterPokemon), [pokemon, gamemasterPokemon]);

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
	// `formIdentifierFor`/`shadowSuffixFor` below trust `speciesSearchMetadata`
	// unconditionally (no on-the-fly fallback) — this tab simply can't render
	// until dex-server's data has actually loaded.
	if (topIVs.length === 0 || !speciesSearchMetadataFetchCompleted) {
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

			{chain.map((entry) => {
				const p = (entry.nonShadow ?? entry.shadow)!;
				const formId = formIdentifierFor(p, speciesSearchMetadata);
				const str =
					entry.nonShadow && entry.shadow
						? computeMergedSearchString(entry.nonShadow, entry.shadow, { trash, topIVCombinations, gl, formId })
						: computeSearchString(p, {
								trash,
								topIVCombinations,
								gl,
								formId,
								shadowSuffix: shadowSuffixFor(p, gl),
							});
				const key = p.speciesId;
				const isOpen = open === key;
				return (
					<div key={key} className='r-ss-block'>
						<div className='r-ss-head'>
							<span className='r-ss-sprite'>
								<img
									src={spriteUrl(p, imageSource)}
									alt=''
									loading='lazy'
									decoding='async'
									onError={handleSpriteError(p)}
								/>
							</span>
							<p className='r-ss-sentence'>
								{sentence(entry, pokemon, top, trash, leagueName, LEAGUE_COLOR_VAR[league])}
							</p>
						</div>
						<div className='r-ss-actions'>
							<button type='button' className='r-ss-copybtn' onClick={() => copy(key, str)}>
								<ClipIcon />
								{copied === key ? 'Copied ✓' : 'Copy string'}
							</button>
							<button
								type='button'
								className='r-ss-reveal'
								data-on={isOpen ? '' : undefined}
								aria-expanded={isOpen}
								onClick={() => setOpen((c) => (c === key ? '' : key))}
							>
								<span className='r-ss-preview'>{str}</span>
								<span className='r-ss-chev' aria-hidden='true'>
									⌄
								</span>
							</button>
						</div>
						{isOpen && (
							<button type='button' className='r-ss-raw' onClick={() => copy(key, str)} title='Click to copy'>
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
