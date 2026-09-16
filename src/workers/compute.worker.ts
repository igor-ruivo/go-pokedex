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
	BEST_BUDDY_LEVEL,
	BEST_BUDDY_LEVEL_INDEX,
	calculateCP,
	calculateHP,
	computeBestIVs,
	computeDPSEntry,
	cpm,
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

/**
 * "Competition ranking" (1224, not 1234): walks backward from a matched
 * index to the earliest entry sharing its exact (rounded) stat product —
 * `flat` is always sorted descending, so ties are always contiguous — and
 * returns that entry's 1-based position. Two spreads that are a genuine
 * stat-product tie always report the same rank this way (e.g. #2 and #3
 * both reporting "#2"), matching the IV Table's own ranking.
 */
const competitionRank = (flat: Array<RankEntry>, idx: number): number => {
	const prodOf = (r: RankEntry) => Math.round(r.battle.A * r.battle.D * r.battle.S);
	const prod = prodOf(flat[idx]);
	let i = idx;
	while (i > 0 && prodOf(flat[i - 1]) === prod) i--;
	return i + 1;
};

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
			greatLeagueRank: competitionRank(flatGLResult, rankGLIndex),
			greatLeagueLvl: flatGLResult[rankGLIndex].L,
			greatLeagueCP: flatGLResult[rankGLIndex].CP,
			greatLeagueAttack: flatGLResult[rankGLIndex].battle.A,
			greatLeagueDefense: flatGLResult[rankGLIndex].battle.D,
			greatLeagueHP: flatGLResult[rankGLIndex].battle.S,
			greatLeaguePerfect: flatGLResult[0].IVs,
			greatLeaguePerfectLevel: flatGLResult[0].L,
			greatLeaguePerfectCP: flatGLResult[0].CP,
			greatLeaguePerfectBattle: flatGLResult[0].battle,
			greatLeagueWorstBattle: flatGLResult[flatGLResult.length - 1].battle,
			ultraLeagueRank: competitionRank(flatULResult, rankULIndex),
			ultraLeagueLvl: flatULResult[rankULIndex].L,
			ultraLeagueCP: flatULResult[rankULIndex].CP,
			ultraLeagueAttack: flatULResult[rankULIndex].battle.A,
			ultraLeagueDefense: flatULResult[rankULIndex].battle.D,
			ultraLeagueHP: flatULResult[rankULIndex].battle.S,
			ultraLeaguePerfect: flatULResult[0].IVs,
			ultraLeaguePerfectLevel: flatULResult[0].L,
			ultraLeaguePerfectCP: flatULResult[0].CP,
			ultraLeaguePerfectBattle: flatULResult[0].battle,
			ultraLeagueWorstBattle: flatULResult[flatULResult.length - 1].battle,
			masterLeagueRank: competitionRank(flatMLResult, rankMLIndex),
			masterLeagueLvl: flatMLResult[rankMLIndex].L,
			masterLeagueCP: flatMLResult[rankMLIndex].CP,
			masterLeagueAttack: flatMLResult[rankMLIndex].battle.A,
			masterLeagueDefense: flatMLResult[rankMLIndex].battle.D,
			masterLeagueHP: flatMLResult[rankMLIndex].battle.S,
			masterLeaguePerfect: flatMLResult[0].IVs,
			masterLeaguePerfectLevel: flatMLResult[0].L,
			masterLeaguePerfectCP: flatMLResult[0].CP,
			masterLeaguePerfectBattle: flatMLResult[0].battle,
			masterLeagueWorstBattle: flatMLResult[flatMLResult.length - 1].battle,
			customLeagueRank: competitionRank(flatLResult, rankLIndex),
			customLeagueLvl: flatLResult[rankLIndex].L,
			customLeagueCP: flatLResult[rankLIndex].CP,
			customLeagueAttack: flatLResult[rankLIndex].battle.A,
			customLeagueDefense: flatLResult[rankLIndex].battle.D,
			customLeagueHP: flatLResult[rankLIndex].battle.S,
			customLeaguePerfect: flatLResult[0].IVs,
			customLeaguePerfectLevel: flatLResult[0].L,
			customLeaguePerfectCP: flatLResult[0].CP,
			customLeaguePerfectBattle: flatLResult[0].battle,
			customLeagueWorstBattle: flatLResult[flatLResult.length - 1].battle,
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

// Deliberately never reads the Best Buddy toggle — this whole mode is
// meta-agnostic and CP-cap-driven, not a ranking. But it can't just pick one
// of level 50 / level 51 either: which raw spread is the true top-1 for a
// given cap sometimes differs between the two (the extra half-level can push
// a different spread's CP just over, or just under, the cap first), so a
// carve-out computed at only one level can miss a pattern that's genuinely
// optimal at the other. Both are always evaluated, unconditionally, and their
// tied-top-1 patterns unioned — regardless of which level the player actually
// has toggled, a wild catch that's the true best at EITHER level keeps its
// protection.
const LEVEL_50_INDEX = MAX_LEVEL_INDEX;
const LEVEL_51_INDEX = BEST_BUDDY_LEVEL_INDEX;
const PROTECTION_LEVELS: ReadonlyArray<{ levelIndex: number; level: number }> = [
	{ levelIndex: LEVEL_50_INDEX, level: MAX_LEVEL },
	{ levelIndex: LEVEL_51_INDEX, level: BEST_BUDDY_LEVEL },
];
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

// A Best Friend-level purify adds +2 to every one of a Shadow's own raw IVs,
// capped at 15 — a real, always-available, zero-cost transition, not a
// hypothetical like a trade. A Shadow catch's raw IVs are what the search
// string actually has to match (that's what the game shows before you
// purify it), but its *true* ceiling — whether keeping it unpurified is
// wasted potential — depends on what those raw IVs become *after* purifying,
// not on the raw IVs' own (unpurified) stat product.
const PURIFY_BONUS = 2;
const purify = (iv: number) => Math.min(iv + PURIFY_BONUS, 15);

/**
 * Meta-agnostic "bad IV" carve-outs — see the "Mass Delete only Bad IV
 * Pokémon" tab. For every non-alias/mega/shadow species and every requested
 * CP cap, walks that species' whole *forward*-reachable family (raw IVs
 * never change through evolution, so a wild catch's fate depends on every
 * stage it could become, not just itself) looking for reachable stages that
 * both (a) clear 90% of the cap at 15/15/15/L50 — below that the cap doesn't
 * meaningfully bind, so there's nothing to compromise — and (b) have a
 * genuinely optimal top-1 spread that `isProtectedByBlanket` doesn't already
 * cover. Collects every *distinct* such pattern (not just the first one
 * found) — an earlier stage being unprotected isn't excused by a later one
 * being fine, since bucket-matching is purely about a wild catch's own fixed
 * IVs, not which species it currently is.
 *
 * Deliberately does NOT exclude Legendary/Mythical/Ultra Beast species (only
 * Mega/alias/Shadow, which are structural — never real standalone catches to
 * protect): whether those categories are actually excluded from the
 * generated string is the caller's call (each corresponds to a togglable,
 * independently-added `!keyword` in `computeBadIvString`), and if a caller
 * turns that toggle off, a Legendary genuinely re-enters the swept
 * population and needs its own verified carve-out exactly like anything
 * else — computing one unconditionally here, always, is what makes that
 * later toggle safe to flip in either direction.
 */
export const findBadIvCarveOuts = ({ gamemasterPokemon, caps }: BadIvCarveOutsInput): Array<BadIvCarveOut> => {
	const isExcludedCategory = (p: IGamemasterPokemon) => !!p.aliasId || !!p.isMega || !!p.isShadow;
	const candidates = Object.values(gamemasterPokemon).filter((p) => !isExcludedCategory(p));
	const domainFilter = (r: IGamemasterPokemon) => !isExcludedCategory(r);

	// A "top-1" spread is only unique because `computeBestIVs` has to pick
	// *some* order for its own internal tie-break — real, exact stat-product
	// ties for the very top spot happen often enough to matter (confirmed
	// against real data: dozens of species tie an exact hundo's stat product
	// with a 15/15/14 spread at some cap). Taking only index 0 silently
	// dropped every OTHER tied-for-best spread — e.g. the 15/15/14 tie, which
	// isn't itself a hundo (no `!4*` safety net) and doesn't fit the default
	// low-Attack shape either, so it would have been swept as "bad" despite
	// being statistically as good as it gets for that species. This returns
	// every spread tied for the top stat product, not just the first one
	// `computeBestIVs` happens to list.
	const bestCache = new Map<string, Array<BadIvPattern>>();
	const getBestTied = (r: IGamemasterPokemon, cap: number, levelIndex: number, level: number): Array<BadIvPattern> => {
		const key = `${r.speciesId}|${cap}|${levelIndex}`;
		const cached = bestCache.get(key);
		if (cached !== undefined) return cached;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, levelIndex);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			bestCache.set(key, []);
			return [];
		}
		const flat = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap, level)).flat();
		if (flat.length === 0) {
			bestCache.set(key, []);
			return [];
		}
		// `flat` is sorted descending by stat product (see computeBestIVs), so
		// every tie for the top spot is contiguous starting at index 0.
		const topProd = Math.round(flat[0].battle.A * flat[0].battle.D * flat[0].battle.S);
		const patterns: Array<BadIvPattern> = [];
		for (const entry of flat) {
			if (Math.round(entry.battle.A * entry.battle.D * entry.battle.S) !== topProd) break;
			patterns.push({ A: entry.IVs.A, D: entry.IVs.D, S: entry.IVs.S });
		}
		bestCache.set(key, patterns);
		return patterns;
	};

	const carveOuts: Array<BadIvCarveOut> = [];
	// speciesId+cap -> set of "A-D-S" bucket keys already covered by the
	// regular (non-Shadow) analysis above — read by the Shadow pass below to
	// skip a purified-optimal raw pattern that a plain, shadow-agnostic
	// clause already protects, so it isn't emitted twice.
	const rawPatternKeys = new Map<string, Set<string>>();
	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, domainFilter));
		for (const cap of caps) {
			const distinctPatterns = new Map<string, BadIvPattern>();
			for (const r of reachable) {
				for (const { levelIndex, level } of PROTECTION_LEVELS) {
					for (const best of getBestTied(r, cap, levelIndex, level)) {
						if (isProtectedByBlanket(best)) continue;
						const key = `${ivBucket(best.A)}-${ivBucket(best.D)}-${ivBucket(best.S)}`;
						if (!distinctPatterns.has(key)) distinctPatterns.set(key, best);
					}
				}
			}
			rawPatternKeys.set(`${p.speciesId}|${cap}`, new Set(distinctPatterns.keys()));
			for (const pattern of distinctPatterns.values()) carveOuts.push({ speciesId: p.speciesId, cap, pattern });
		}
	}

	// Every entry above was computed with Shadow forms entirely absent — both
	// as candidates and as reachable family members (`isExcludedCategory`
	// excludes `isShadow` on both sides) — because a Shadow's own raw IVs
	// don't tell the whole story: purifying it is a real, free, always-
	// available action that adds +2 to every stat, so its true ceiling is
	// what its raw IVs *become* once purified, not their own unpurified stat
	// product. Walked separately here, over each Shadow's own reachable
	// Shadow-only family (evolutions preserve Shadow status, so this never
	// overlaps with the non-Shadow walk above), ranking raw spreads by their
	// *purified* outcome instead.
	//
	// Also, because purification collapses several raw buckets onto the same
	// purified outcome, this is — by a wide margin — the single biggest source
	// of carve-out entries, hence generated-string length (confirmed against
	// real data: ~11k characters without this pass, ~64k with it). That's an
	// accepted cost, not a bug: skipping it would mean some Shadow catches
	// that *would* purify into their species' true optimum lose their
	// protection and get swept up for deletion after all — worse than a long
	// string.
	const purifiedBestCache = new Map<string, Array<BadIvPattern>>();
	const getBestPurifiedTied = (r: IGamemasterPokemon, cap: number, levelIndex: number): Array<BadIvPattern> => {
		const key = `${r.speciesId}|${cap}|${levelIndex}`;
		const cached = purifiedBestCache.get(key);
		if (cached !== undefined) return cached;
		const { atk, def, hp } = r.baseStats;
		// Purifying 15 stays 15 — the hundo-reachability pre-filter is
		// identical whether or not purification is in play.
		const maxCP = calculateCP(atk, 15, def, 15, hp, 15, levelIndex);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			purifiedBestCache.set(key, []);
			return [];
		}
		let bestProd = -1;
		let patterns: Array<BadIvPattern> = [];
		for (let a = 0; a <= 15; a++) {
			for (let d = 0; d <= 15; d++) {
				for (let s = 0; s <= 15; s++) {
					const pa = purify(a);
					const pd = purify(d);
					const ps = purify(s);
					let level = levelIndex;
					while (level >= 0 && calculateCP(atk, pa, def, pd, hp, ps, level) > cap) level--;
					if (level < 0) continue;
					const aSt = (atk + pa) * cpm[level];
					const dSt = (def + pd) * cpm[level];
					const sSt = calculateHP(hp, ps, level);
					const prod = Math.round(aSt * dSt * sSt);
					if (prod > bestProd) {
						bestProd = prod;
						patterns = [{ A: a, D: d, S: s }];
					} else if (prod === bestProd) {
						patterns.push({ A: a, D: d, S: s });
					}
				}
			}
		}
		purifiedBestCache.set(key, patterns);
		return patterns;
	};

	const shadowCandidates = Object.values(gamemasterPokemon).filter((p) => p.isShadow && !p.aliasId && !p.isMega);
	const shadowDomainFilter = (r: IGamemasterPokemon) => r.isShadow && !r.aliasId && !r.isMega;
	for (const p of shadowCandidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, shadowDomainFilter));
		const nonShadowId = p.speciesId.replaceAll('_shadow', '');
		for (const cap of caps) {
			const alreadyCovered = rawPatternKeys.get(`${nonShadowId}|${cap}`);
			const distinctPatterns = new Map<string, BadIvPattern>();
			for (const r of reachable) {
				for (const { levelIndex } of PROTECTION_LEVELS) {
					for (const best of getBestPurifiedTied(r, cap, levelIndex)) {
						// The raw spread the game will actually show for this
						// catch — evaluated against the blanket rules exactly
						// like the non-Shadow pass, since a raw hundo or a raw
						// catch already in the default good shape needs no
						// Shadow-specific help either.
						if (isProtectedByBlanket(best)) continue;
						const key = `${ivBucket(best.A)}-${ivBucket(best.D)}-${ivBucket(best.S)}`;
						if (alreadyCovered?.has(key)) continue;
						if (!distinctPatterns.has(key)) distinctPatterns.set(key, best);
					}
				}
			}
			for (const pattern of distinctPatterns.values()) carveOuts.push({ speciesId: p.speciesId, cap, pattern });
		}
	}

	return carveOuts;
};

export interface TradeFloors {
	great: boolean;
	ultra: boolean;
}

export interface TradeFloorsInput {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
}

/**
 * Per non-alias/Mega/Shadow species: whether AT LEAST ONE of its tied rank-1
 * (best stat product) IV spreads for Great (1500) / Ultra (2500) has every
 * stat at IV 5 or higher — the floor a Best Friend trade always guarantees
 * (12, on a Lucky Trade). Checked at both level 50 and 51 (Best Buddy), same
 * as `findBadIvCarveOuts`'s own `PROTECTION_LEVELS` sweep, and unioned: a
 * species only needs to clear this bar at EITHER level to count, since a
 * trade's outcome isn't tied to whichever level ceiling the player currently
 * has toggled. When true, a trade *could* in principle land exactly on that
 * species' own best possible spread for the league; when false, no trade
 * ever can (a trade never produces below floor 5 in a stat, but every tied
 * top spread needs less there), so suggesting one for that league would be
 * pointless regardless of its current PvP rank — see `computeTradeableString`
 * in MassDelete.tsx, the sole consumer.
 */
export const findTradeableFloors = ({ gamemasterPokemon }: TradeFloorsInput): Record<string, TradeFloors> => {
	const candidates = Object.values(gamemasterPokemon).filter((p) => !p.aliasId && !p.isMega && !p.isShadow);

	const meetsFloor = (atk: number, def: number, hp: number, cap: number): boolean =>
		PROTECTION_LEVELS.some(({ level }) => {
			const flat = Object.values(computeBestIVs(atk, def, hp, cap, level)).flat();
			if (flat.length === 0) return false;
			const topProd = Math.round(flat[0].battle.A * flat[0].battle.D * flat[0].battle.S);
			for (const entry of flat) {
				if (Math.round(entry.battle.A * entry.battle.D * entry.battle.S) !== topProd) break;
				if (entry.IVs.A >= 5 && entry.IVs.D >= 5 && entry.IVs.S >= 5) return true;
			}
			return false;
		});

	const result: Record<string, TradeFloors> = {};
	for (const p of candidates) {
		const { atk, def, hp } = p.baseStats;
		result[p.speciesId] = {
			great: meetsFloor(atk, def, hp, 1500),
			ultra: meetsFloor(atk, def, hp, 2500),
		};
	}
	return result;
};

export const api = { familyIvPercents, bestIvs, raidComparisons, findBadIvCarveOuts, findTradeableFloors };
export type ComputeApi = typeof api;

// Guarded: this module is also imported directly (not through a real Worker)
// by tests exercising the pure functions above — `self` doesn't exist there,
// and Comlink's `expose` assumes a genuine worker global scope.
if (typeof self !== 'undefined') {
	expose(api);
}
