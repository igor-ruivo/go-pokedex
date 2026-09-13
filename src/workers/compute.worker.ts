/**
 * Off-main-thread home for the expensive, synchronous number crunching:
 * the per-family IV brute force and the whole-dex raid DPS comparison.
 *
 * Everything imported here must be pure (no React, no DOM, no TanStack Query).
 * `pokemon-helper` qualifies — its only runtime import is a plain enum.
 */
import { expose } from 'comlink';

import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import type { DPSEntry } from '../queries/raid-ranker';
import {
	calculateCP,
	computeBestIVs,
	computeDPSEntry,
	fetchReachablePokemonIncludingSelf,
	guessRaidTier,
	levelToLevelIndex,
	MAX_LEVEL,
	MAX_LEVEL_INDEX,
	type RaidOpts,
	type RaidTier,
	type RankEntry,
} from '../utils/pokemon-helper';

// Keep in sync with `customCupCPLimit` in src/queries/pvp.ts. Duplicated (not imported)
// so the worker bundle doesn't pull in TanStack Query.
const CUSTOM_CUP_CP_LIMIT = 1500;

export interface FamilyMember {
	speciesId: string;
	atk: number;
	def: number;
	hp: number;
	isShadow: boolean;
}

export interface FamilyIvPercentsInput {
	reachable: Array<FamilyMember>;
	/** Is the species whose page this is (not `p` below — the family member
	 * being ranked) a Shadow? Its non-shadow relatives can only ever be reached
	 * by purifying first, which adds +2 to every IV — so the queried spread
	 * (the Shadow's own, unpurified IVs) is projected through that bonus
	 * before ranking, matching what the family member will actually end up
	 * with. */
	selfIsShadow: boolean;
	attackIV: number;
	defenseIV: number;
	hpIV: number;
	/** Level ceiling to rank against — {@link MAX_LEVEL} unless Best Buddy (51) is on. */
	maxLevel?: number;
}

const familyIvPercents = ({
	reachable,
	selfIsShadow,
	attackIV,
	defenseIV,
	hpIV,
	maxLevel = MAX_LEVEL,
}: FamilyIvPercentsInput): Record<string, IIvPercents> => {
	const result: Record<string, IIvPercents> = {};

	for (const p of reachable) {
		// A shadow's non-shadow relatives get a +2 bonus on every IV once purified.
		const effIV = (iv: number) => Math.min(15, selfIsShadow && !p.isShadow ? 2 + iv : iv);
		const effectiveAtk = effIV(attackIV);
		const effectiveDef = effIV(defenseIV);
		const effectiveHP = effIV(hpIV);

		const resLC = computeBestIVs(p.atk, p.def, p.hp, CUSTOM_CUP_CP_LIMIT, maxLevel);
		const resGL = computeBestIVs(p.atk, p.def, p.hp, 1500, maxLevel);
		const resUL = computeBestIVs(p.atk, p.def, p.hp, 2500, maxLevel);
		const resML = computeBestIVs(p.atk, p.def, p.hp, Number.MAX_VALUE, maxLevel);

		const flatLResult = Object.values(resLC).flat();
		const flatGLResult = Object.values(resGL).flat();
		const flatULResult = Object.values(resUL).flat();
		const flatMLResult = Object.values(resML).flat();

		const matches = (r: (typeof flatGLResult)[number]) =>
			r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP;

		const rankLIndex = flatLResult.findIndex(matches);
		const rankGLIndex = flatGLResult.findIndex(matches);
		const rankULIndex = flatULResult.findIndex(matches);
		const rankMLIndex = flatMLResult.findIndex(matches);

		result[p.speciesId] = {
			greatLeagueRank: rankGLIndex,
			greatLeagueLvl: flatGLResult[rankGLIndex].L,
			greatLeagueCP: flatGLResult[rankGLIndex].CP,
			greatLeagueAttack: flatGLResult[rankGLIndex].battle.A,
			greatLeagueDefense: flatGLResult[rankGLIndex].battle.D,
			greatLeagueHP: flatGLResult[rankGLIndex].battle.S,
			greatLeaguePerfect: flatGLResult[0].IVs,
			greatLeaguePerfectLevel: flatGLResult[0].L,
			greatLeaguePerfectCP: flatGLResult[0].CP,
			ultraLeagueRank: rankULIndex,
			ultraLeagueLvl: flatULResult[rankULIndex].L,
			ultraLeagueCP: flatULResult[rankULIndex].CP,
			ultraLeagueAttack: flatULResult[rankULIndex].battle.A,
			ultraLeagueDefense: flatULResult[rankULIndex].battle.D,
			ultraLeagueHP: flatULResult[rankULIndex].battle.S,
			ultraLeaguePerfect: flatULResult[0].IVs,
			ultraLeaguePerfectLevel: flatULResult[0].L,
			ultraLeaguePerfectCP: flatULResult[0].CP,
			masterLeagueRank: rankMLIndex,
			masterLeagueLvl: flatMLResult[rankMLIndex].L,
			masterLeagueCP: flatMLResult[rankMLIndex].CP,
			masterLeagueAttack: flatMLResult[rankMLIndex].battle.A,
			masterLeagueDefense: flatMLResult[rankMLIndex].battle.D,
			masterLeagueHP: flatMLResult[rankMLIndex].battle.S,
			masterLeaguePerfect: flatMLResult[0].IVs,
			masterLeaguePerfectLevel: flatMLResult[0].L,
			masterLeaguePerfectCP: flatMLResult[0].CP,
			customLeagueRank: rankLIndex,
			customLeagueLvl: flatLResult[rankLIndex].L,
			customLeagueCP: flatLResult[rankLIndex].CP,
			customLeagueAttack: flatLResult[rankLIndex].battle.A,
			customLeagueDefense: flatLResult[rankLIndex].battle.D,
			customLeagueHP: flatLResult[rankLIndex].battle.S,
			customLeaguePerfect: flatLResult[0].IVs,
			customLeaguePerfectLevel: flatLResult[0].L,
			customLeaguePerfectCP: flatLResult[0].CP,
		};
	}

	return result;
};

export interface BestIvsInput {
	atk: number;
	def: number;
	hp: number;
	/** CP cap; use Number.MAX_VALUE for an uncapped (Master) ranking. */
	league: number;
	/** Level ceiling to rank against — {@link MAX_LEVEL} unless Best Buddy (51) is on. */
	maxLevel?: number;
}

/** Every IV spread ranked for one base-stat line + CP cap, best first. */
const bestIvs = ({ atk, def, hp, league, maxLevel = MAX_LEVEL }: BestIvsInput): Array<RankEntry> =>
	Object.values(computeBestIVs(atk, def, hp, league, maxLevel)).flat();

export interface LowAttackViableInput {
	candidates: Array<{ speciesId: string; atk: number; def: number; hp: number }>;
	/** CP caps to evaluate (e.g. 1500 for Great, 2500 for Ultra). */
	caps: Array<number>;
	/** Level ceiling to rank against — {@link MAX_LEVEL} unless Best Buddy (51) is on. */
	maxLevel?: number;
}

/**
 * For each candidate and cap: do the top 5 best-IV spreads all get by with an
 * attack IV below 5? Powers the "trash" analyzer's high-attack check.
 * @returns speciesId -> cap -> boolean
 */
const lowAttackViable = ({
	candidates,
	caps,
	maxLevel = MAX_LEVEL,
}: LowAttackViableInput): Record<string, Record<number, boolean>> => {
	const out: Record<string, Record<number, boolean>> = {};
	for (const c of candidates) {
		const perCap: Record<number, boolean> = {};
		for (const cap of caps) {
			const best = Object.values(computeBestIVs(c.atk, c.def, c.hp, cap, maxLevel)).flat();
			let allLow = true;
			for (let i = 0; i < 5; i++) {
				if ((best[i]?.IVs.A ?? 0) >= 5) {
					allLow = false;
					break;
				}
			}
			perCap[cap] = allLow;
		}
		out[c.speciesId] = perCap;
	}
	return out;
};

export interface RaidComparisonsInput {
	candidates: Array<IGamemasterPokemon>;
	moves: Record<string, IGameMasterMove>;
	target: IGamemasterPokemon;
	/** Weather / friendship / party-power / mega-aura / tier knobs from the Counters UI. */
	opts?: {
		weatherBoostedTypes?: Array<string> | undefined;
		friendship?: number | undefined;
		partySize?: number | undefined;
		megaBoostType?: string | undefined;
		/** Explicit tier override; falls back to `guessRaidTier(target)`. */
		tier?: RaidTier | undefined;
	};
	/** Level ceiling to evaluate attackers at — {@link MAX_LEVEL} unless Best Buddy (51) is on. */
	maxLevel?: number;
}

/**
 * Every candidate's best-moveset DPS / TDO / eDPS against the real `target`
 * (tier inferred from Game Master flags unless `opts.tier` overrides it),
 * sorted strongest DPS first.
 */
const raidComparisons = ({
	candidates,
	moves,
	target,
	opts,
	maxLevel = MAX_LEVEL,
}: RaidComparisonsInput): Array<DPSEntry> => {
	const raidOpts: RaidOpts = {
		tier: opts?.tier ?? guessRaidTier(target),
		friendship: opts?.friendship,
		partySize: opts?.partySize,
		megaBoostType: opts?.megaBoostType,
		weatherBoostedTypes: opts?.weatherBoostedTypes ? new Set(opts.weatherBoostedTypes) : undefined,
	};
	const levelIndex = maxLevel === MAX_LEVEL ? MAX_LEVEL_INDEX : levelToLevelIndex(maxLevel);
	const out: Array<DPSEntry> = candidates.map((p) =>
		computeDPSEntry(p, {}, moves, 15, levelIndex, '', target, undefined, raidOpts)
	);
	return out.sort((a, b) => (b.dps !== a.dps ? b.dps - a.dps : a.speciesId.localeCompare(b.speciesId)));
};

export interface BadIvPattern {
	A: number;
	D: number;
	S: number;
}

export interface BadIvCarveOut {
	speciesId: string;
	cap: number;
	pattern: BadIvPattern;
}

export interface BadIvCarveOutsInput {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	/** CP caps to evaluate (e.g. [1500, 2500]). */
	caps: Array<number>;
}

// Always level 50 (`MAX_LEVEL`), deliberately never the Best Buddy toggle —
// this whole mode is meta-agnostic and CP-cap-driven, not a ranking, and its
// "reaches 90% of the cap at 15/15/15" pre-filter is defined against 50.
const LEVEL_50_INDEX = MAX_LEVEL_INDEX;
const CP_THRESHOLD_RATIO = 0.9;

const ivBucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));
// Keep the top spread only if Attack is bucket 0-1 (IV 0-5) AND Defense/HP are
// bucket 3-4 (IV 11-15) — the classic low-Attack/max-bulk CP-cap spread.
const matchesDefault = (ivs: BadIvPattern) => {
	const a = ivBucket(ivs.A),
		d = ivBucket(ivs.D),
		s = ivBucket(ivs.S);
	return a <= 1 && d >= 3 && s >= 3;
};
// An exact hundo is already unconditionally protected by `!4*` regardless of
// league — nothing short of it gets a free pass from this check.
const isExactHundo = (ivs: BadIvPattern) => ivBucket(ivs.A) === 4 && ivBucket(ivs.D) === 4 && ivBucket(ivs.S) === 4;
const isProtectedByBlanket = (ivs: BadIvPattern) => matchesDefault(ivs) || isExactHundo(ivs);

/**
 * Meta-agnostic "bad IV" carve-outs — see the "Mass Delete only Bad IV
 * Pokémon" tab. For every non-alias/mega/shadow/legendary/mythical/UB species
 * and every requested CP cap, walks that species' whole *forward*-reachable
 * family (raw IVs never change through evolution, so a wild catch's fate
 * depends on every stage it could become, not just itself) looking for
 * reachable stages that both (a) clear 90% of the cap at 15/15/15/L50 — below
 * that the cap doesn't meaningfully bind, so there's nothing to compromise —
 * and (b) have a genuinely optimal top-1 spread that `isProtectedByBlanket`
 * doesn't already cover. Collects every *distinct* such pattern (not just the
 * first one found) — an earlier stage being unprotected isn't excused by a
 * later one being fine, since bucket-matching is purely about a wild catch's
 * own fixed IVs, not which species it currently is.
 */
const findBadIvCarveOuts = ({ gamemasterPokemon, caps }: BadIvCarveOutsInput): Array<BadIvCarveOut> => {
	const isExcludedCategory = (p: IGamemasterPokemon) =>
		!!p.aliasId || !!p.isMega || !!p.isShadow || !!p.isLegendary || !!p.isMythical || !!p.isBeast;
	const candidates = Object.values(gamemasterPokemon).filter((p) => !isExcludedCategory(p));
	const domainFilter = (r: IGamemasterPokemon) => !isExcludedCategory(r);

	const bestCache = new Map<string, BadIvPattern | null>();
	const getBest = (r: IGamemasterPokemon, cap: number): BadIvPattern | null => {
		const key = `${r.speciesId}|${cap}`;
		const cached = bestCache.get(key);
		if (cached !== undefined) return cached;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			bestCache.set(key, null);
			return null;
		}
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		const pattern: BadIvPattern = { A: best.IVs.A, D: best.IVs.D, S: best.IVs.S };
		bestCache.set(key, pattern);
		return pattern;
	};

	const carveOuts: Array<BadIvCarveOut> = [];
	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, domainFilter));
		for (const cap of caps) {
			const distinctPatterns = new Map<string, BadIvPattern>();
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best || isProtectedByBlanket(best)) continue;
				const key = `${ivBucket(best.A)}-${ivBucket(best.D)}-${ivBucket(best.S)}`;
				if (!distinctPatterns.has(key)) distinctPatterns.set(key, best);
			}
			for (const pattern of distinctPatterns.values()) carveOuts.push({ speciesId: p.speciesId, cap, pattern });
		}
	}
	return carveOuts;
};

export const api = { familyIvPercents, bestIvs, lowAttackViable, raidComparisons, findBadIvCarveOuts };
export type ComputeApi = typeof api;

expose(api);
