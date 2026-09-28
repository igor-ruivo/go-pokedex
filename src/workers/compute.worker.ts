/**
 * Off-main-thread home for the expensive, synchronous number crunching (the
 * per-family IV brute force, the whole-dex raid DPS comparison) — and, via
 * `fetchJson` below, for fetching + JSON-parsing the largest dex-server
 * payloads (PvP rankings, raid DPS ranks, species-search-metadata). `fetch`
 * and `Response.json()` are Web Platform APIs available in a worker's global
 * scope too, not DOM — the actual parse of a multi-MB response is a genuine
 * synchronous main-thread task otherwise, and this is the one place in the
 * app already set up to run work off it.
 *
 * Everything imported here must be pure (no React, no DOM, no TanStack Query).
 * `pokemon-helper` qualifies — its only runtime import is a plain enum.
 */
import { expose } from 'comlink';

import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { ISpeciesSearchMetadata } from '../DTOs/ISpeciesSearchMetadata';
import type { IIvPercents, ILeagueIvBlock } from '../DTOs/ivs';
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
	type MegaLevel,
	type RaidOpts,
	type RaidTier,
	type RankEntry,
} from '../utils/pokemon-helper';

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

/** One league tier's `ILeagueIvBlock` — `undefined` when `flat` is empty,
 *  i.e. even the CP floor (level 1, 0/0/0 IVs) exceeds this league's cap, so
 *  there is no legal spread at all (a Mega in Great/Ultra League, most
 *  commonly). Indexing `flat[0]`/`flat[rankIdx]` unconditionally here used
 *  to throw for exactly that case (`flat[rankIdx]` is `undefined` once
 *  `rankIdx` — from `findIndex` on an empty array — is `-1`), which failed
 *  the whole `familyIvPercents` call, not just this one league's slice. */
const leagueBlock = (flat: Array<RankEntry>, rankIdx: number): ILeagueIvBlock | undefined => {
	if (flat.length === 0 || rankIdx === -1) return undefined;
	return {
		rank: competitionRank(flat, rankIdx),
		lvl: flat[rankIdx].L,
		cp: flat[rankIdx].CP,
		battle: flat[rankIdx].battle,
		perfect: flat[0].IVs,
		perfectLvl: flat[0].L,
		perfectCP: flat[0].CP,
		perfectBattle: flat[0].battle,
		worstBattle: flat[flat.length - 1].battle,
	};
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

		const resGL = computeBestIVs(p.atk, p.def, p.hp, 1500, maxLevel);
		const resUL = computeBestIVs(p.atk, p.def, p.hp, 2500, maxLevel);
		const resML = computeBestIVs(p.atk, p.def, p.hp, Number.MAX_VALUE, maxLevel);

		const flatGLResult = Object.values(resGL).flat();
		const flatULResult = Object.values(resUL).flat();
		const flatMLResult = Object.values(resML).flat();

		const matches = (r: (typeof flatGLResult)[number]) =>
			r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP;

		const rankGLIndex = flatGLResult.findIndex(matches);
		const rankULIndex = flatULResult.findIndex(matches);
		const rankMLIndex = flatMLResult.findIndex(matches);

		const great = leagueBlock(flatGLResult, rankGLIndex);
		const ultra = leagueBlock(flatULResult, rankULIndex);
		// Master is always uncapped (`league: Number.MAX_VALUE`), so this can
		// never actually be empty/`-1` — `leagueBlock`'s return type still
		// says "possibly undefined" since it doesn't know that, so this is
		// asserted rather than optional-chained; `IIvPercents.master` stays
		// required.
		const master = leagueBlock(flatMLResult, rankMLIndex)!;

		result[p.speciesId] = {
			...(great && { great }),
			...(ultra && { ultra }),
			master,
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
		/** Base/High/Max/Super Max — defaults to Max (3) inside `computeDPSEntry`. */
		megaLevel?: MegaLevel | undefined;
	};
	/** Level ceiling to evaluate attackers at — {@link MAX_LEVEL} unless Best Buddy (51) is on. */
	maxLevel?: number;
}

/**
 * Every candidate's best-moveset DPS / TDO against the real `target`
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
		megaLevel: opts?.megaLevel,
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
	/** dex-server's precomputed per-species `bestIvSpreads`/
	 *  `bestIvSpreadsPurified` — the ONLY source of this data; there is no
	 *  fallback computation. The caller must have this fully loaded (see
	 *  `useSpeciesSearchMetadata`'s own doc comment) before calling this
	 *  function at all — a missing speciesId throws. */
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>;
	/** CP caps to evaluate (e.g. [1500, 2500]) — `Number.MAX_VALUE` is a valid
	 *  entry too, for the uncapped Master cap. Master isn't tie-free the way a
	 *  quick glance suggests: Attack/Defense are never floored so they can't
	 *  tie below 15, but HP IS floored (`calculateHP`), so a 15/15/14 spread
	 *  regularly ties an exact hundo's Master stat product too — same
	 *  phenomenon as the well-documented Great/Ultra ties below, just via a
	 *  different mechanism (HP-floor coincidence instead of a CP-cap trade-off). */
	caps: Array<number>;
	/** Default `true`. Set `false` to skip the Shadow-purify pass entirely —
	 *  for a caller whose own candidates can never include a Shadow catch in
	 *  the first place (nothing to protect), computing it would be pure
	 *  wasted work: confirmed against real data, that pass alone is ~87% of
	 *  an equivalent Master sweep's total cost. */
	includeShadowPurify?: boolean;
	/** Default `true`. Whether the main (non-Shadow) pass considers a
	 *  candidate's reachable Mega form(s) at all — a plain catch's raw IVs
	 *  get a carve-out when they're the top-1 (or tied) stat product for a
	 *  Mega it can reach by evolving, not just for its own non-Mega line.
	 *
	 *  Defaults `true` because the shared, uncapped "Master carve-outs" query
	 *  (`masterCarveOuts` in MassDelete.tsx, consumed by *both* the
	 *  non-meta-relevant tab's Master stat-product-tie protection and the
	 *  bad-IV tab) always wants this on — the non-meta-relevant tab has its
	 *  own separate, already-unconditional Mega-reachability checks
	 *  (`isGoodForRaids`/`isBadForEverything` in `computeTrashString`), so
	 *  this needs to stay consistent with those rather than following the
	 *  bad-IV tab's own toggle. The bad-IV tab's OWN carve-out query
	 *  (`badIvCarveOuts`) explicitly overrides this to track its "Preserve
	 *  Megas IVs" checkbox instead — that tab wants Mega reachability to be
	 *  opt-in, full stop, covering both this pass and `preserveMegaIvs`
	 *  below. */
	includeMegaForNonShadow?: boolean;
	/** Default `false` (opt-in — "Preserve Megas IVs" in Mass Delete's bad-IV
	 *  tab). When `true`, the Shadow-purify pass (see `includeShadowPurify`)
	 *  also checks each Shadow candidate's reachable Mega form(s) — a
	 *  Shadow's evolution line can continue *past* purification into a Mega
	 *  (Shadow Charmander → purify → Charmander → Charmeleon → Charizard →
	 *  Mega Charizard X/Y) — so a catch that's exactly the top-1 (or tied)
	 *  purified stat product for one of those Megas gets a carve-out too,
	 *  not just for its own Shadow-only evolution line. Off by default: it's
	 *  extra work for a case that, while real, is narrower than the default
	 *  Shadow-purify pass already covers (matching what the checkbox next to
	 *  it protects against by default). No effect at all when
	 *  `includeShadowPurify` is `false` — nothing to extend. */
	preserveMegaIvs?: boolean;
	/** {@link MAX_LEVEL} (50) or 51 (Best Buddy) — the single
	 *  level ceiling to evaluate every tied-top-1 spread at. Never both: the
	 *  caller must pass whichever one the player currently has toggled (see
	 *  `useBestBuddy`). Default {@link MAX_LEVEL} only for callers that don't
	 *  care (e.g. a test not exercising this specifically). */
	maxLevel?: number;
}

// Always honors whichever single level ceiling (50, or 51 with Best Buddy)
// the player currently has toggled — every caller passes its own `maxLevel`
// explicitly, never both at once. This used to unconditionally evaluate BOTH
// levels and union their tied-top-1 patterns, on the reasoning that the true
// top-1 spread for a cap can differ between the two; that produced strictly
// more accurate, but also strictly longer, search strings than a single-level
// player actually needs — every consumer of this data now trades that
// extra-level accuracy for a shorter string instead.
const CP_THRESHOLD_RATIO = 0.9;

/** Every caller must gate on `speciesSearchMetadata` actually being loaded
 *  (e.g. `usePokemon`-style `fetchCompleted`) before calling
 *  `findBadIvCarveOuts`/`findTradeableSpeciesData` at all — there is no
 *  on-the-fly fallback if a species is missing from it, by design (dex-server
 *  is the single source of truth for this data). This throws loudly instead
 *  of silently producing wrong/incomplete carve-outs. */
const requireSpeciesMetadata = (
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>,
	speciesId: string
): ISpeciesSearchMetadata => {
	const metadata = speciesSearchMetadata[speciesId];
	if (!metadata) {
		throw new Error(
			`speciesSearchMetadata is missing an entry for "${speciesId}" — caller must wait for it to finish loading before calling this.`
		);
	}
	return metadata;
};

/** dex-server precomputes `bestIvSpreads`/`bestIvSpreadsPurified` keyed this
 *  way — every caller here only ever passes one of these three caps (see
 *  `BadIvCarveOutsInput.caps`'s own callers in MassDelete.tsx). */
const leagueKeyFor = (cap: number): 'great' | 'ultra' | 'master' =>
	cap === 1500 ? 'great' : cap === 2500 ? 'ultra' : 'master';
/** Same idea for the level axis — every caller passes {@link MAX_LEVEL} (50)
 *  or {@link BEST_BUDDY_LEVEL} (51), never anything else. */
const levelKeyFor = (level: number): 'level50' | 'level51' => (level === 51 ? 'level51' : 'level50');

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
export const findBadIvCarveOuts = ({
	gamemasterPokemon,
	speciesSearchMetadata,
	caps,
	includeShadowPurify = true,
	includeMegaForNonShadow = true,
	preserveMegaIvs = false,
	maxLevel = MAX_LEVEL,
}: BadIvCarveOutsInput): Array<BadIvCarveOut> => {
	const levelIndex = levelToLevelIndex(maxLevel);
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
		// The 90%-of-cap pre-filter only means something for a real CP ceiling —
		// for the uncapped Master cap (`Number.MAX_VALUE`) every species is
		// always "relevant" (there's no cap to fall short of), and the naive
		// `0.9 * Number.MAX_VALUE` comparison below would otherwise overflow to
		// `Infinity` and skip EVERY species unconditionally, silently producing
		// zero Master carve-outs no matter what.
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, levelIndex);
		if (cap !== Number.MAX_VALUE && maxCP < CP_THRESHOLD_RATIO * cap) {
			bestCache.set(key, []);
			return [];
		}
		// dex-server precomputes exactly this reduction per species — the only
		// source of it (no on-the-fly fallback).
		const patterns = requireSpeciesMetadata(speciesSearchMetadata, r.speciesId).bestIvSpreads[leagueKeyFor(cap)][
			levelKeyFor(level)
		];
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
		// `includeMega: includeMegaForNonShadow` — see that option's own doc
		// comment on `BadIvCarveOutsInput` for why this isn't just a bare
		// `true`/tied to `preserveMegaIvs` directly: the two carve-out
		// queries this function serves want different defaults here.
		// `domainFilter`'s own `!isMega` clause doesn't fight this either way
		// — it's only ever applied to evolution-chain children, never to the
		// Mega branch `includeMega` adds, so nothing else needs to change
		// here regardless of which way this flag goes.
		const reachable = Array.from(
			fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, domainFilter, includeMegaForNonShadow)
		);
		for (const cap of caps) {
			const distinctPatterns = new Map<string, BadIvPattern>();
			for (const r of reachable) {
				for (const best of getBestTied(r, cap, levelIndex, maxLevel)) {
					if (isProtectedByBlanket(best)) continue;
					const key = `${ivBucket(best.A)}-${ivBucket(best.D)}-${ivBucket(best.S)}`;
					if (!distinctPatterns.has(key)) distinctPatterns.set(key, best);
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
		// identical whether or not purification is in play. Same uncapped
		// (Master) special-case as `getBestTied` above.
		const maxCP = calculateCP(atk, 15, def, 15, hp, 15, levelIndex);
		if (cap !== Number.MAX_VALUE && maxCP < CP_THRESHOLD_RATIO * cap) {
			purifiedBestCache.set(key, []);
			return [];
		}
		// dex-server precomputes exactly this pass per Shadow species (`r` here
		// is a Shadow form via `shadowDomainFilter` below) *and* per Mega
		// species (`r` is one of a Shadow's reachable Mega forms, when
		// `preserveMegaIvs` is on — see that option's own doc comment on
		// `BadIvCarveOutsInput`) — the only source of this data either way
		// (no on-the-fly fallback).
		const metadata = requireSpeciesMetadata(speciesSearchMetadata, r.speciesId);
		if (!metadata.bestIvSpreadsPurified) {
			throw new Error(`speciesSearchMetadata for "${r.speciesId}" is missing bestIvSpreadsPurified.`);
		}
		const patterns = metadata.bestIvSpreadsPurified[leagueKeyFor(cap)][levelKeyFor(levelIndex / 2 + 1)];
		purifiedBestCache.set(key, patterns);
		return patterns;
	};

	// `shadowCandidates`/`shadowDomainFilter` are shared by both passes below
	// (only actually built when at least one of them needs it — both flags
	// default such that neither runs unless a caller opts in).
	if (includeShadowPurify || preserveMegaIvs) {
		const shadowCandidates = Object.values(gamemasterPokemon).filter((p) => p.isShadow && !p.aliasId && !p.isMega);
		const shadowDomainFilter = (r: IGamemasterPokemon) => r.isShadow && !r.aliasId && !r.isMega;
		for (const p of shadowCandidates) {
			// Skippable entirely by a caller whose own candidates structurally
			// can never include a Shadow catch (e.g. a trade-suggestion sweep —
			// Shadows can't be traded at all), or one that's opted out purely
			// for cost (the uncapped Master sweep — see this option's own doc
			// comment on `BadIvCarveOutsInput` for why that's worth doing, not
			// just legal) — see `includeShadowPurify`'s own doc comment.
			const reachable = includeShadowPurify
				? Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, shadowDomainFilter))
				: [];
			// `preserveMegaIvs` — see that option's own doc comment on
			// `BadIvCarveOutsInput`. Deliberately independent of
			// `includeShadowPurify` above: the Master-cap sweep always opts out
			// of the (expensive) default Shadow-purify pass for cost reasons,
			// but still wants this specific, narrower Mega-reachable check when
			// the player has it on. No domain filter at all here (just alias
			// forms excluded) and `includeMega: true`, narrowed to the Mega
			// entries afterward — `shadowDomainFilter` above exists to keep the
			// *default* pass cheap and purely Shadow-scoped, which is exactly
			// the boundary this needs to cross to find a Mega form at all
			// (every Mega is inherently non-Shadow).
			const reachableMegas = preserveMegaIvs
				? Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, (r) => !r.aliasId, true)).filter(
						(r) => r.isMega
					)
				: [];
			if (reachable.length === 0 && reachableMegas.length === 0) continue;
			const nonShadowId = p.nonShadowSpecies;
			for (const cap of caps) {
				const alreadyCovered = rawPatternKeys.get(`${nonShadowId}|${cap}`);
				const distinctPatterns = new Map<string, BadIvPattern>();
				for (const r of [...reachable, ...reachableMegas]) {
					for (const best of getBestPurifiedTied(r, cap, levelIndex)) {
						// The raw spread the game will actually show for this
						// catch — evaluated against the blanket rules exactly
						// like the non-Shadow pass, since a raw hundo or a raw
						// catch already in the default good shape needs no
						// Shadow-specific help either. Ties are handled for
						// free here: `getBestPurifiedTied` already returns
						// every tied-top-1 pattern (not just one), and this
						// dedup-by-bucket-key map keeps every distinct one,
						// whether it came from the Shadow-only walk or a
						// reachable Mega.
						if (isProtectedByBlanket(best)) continue;
						const key = `${ivBucket(best.A)}-${ivBucket(best.D)}-${ivBucket(best.S)}`;
						if (alreadyCovered?.has(key)) continue;
						if (!distinctPatterns.has(key)) distinctPatterns.set(key, best);
					}
				}
				for (const pattern of distinctPatterns.values()) carveOuts.push({ speciesId: p.speciesId, cap, pattern });
			}
		}
	}

	return carveOuts;
};

export interface TradeableLeagueData {
	/** Every tied-for-rank-1 (best stat product) raw IV pattern at this cap,
	 *  for whichever single level was requested — EXCLUDING the exact hundo
	 *  (15/15/15). The hundo is always in this tied set (Attack/Defense are
	 *  never floored so nothing can beat it, only tie it); the universal
	 *  `!4*` keyword already protects it unconditionally everywhere this data
	 *  is used, so carving it out again would be pure dead weight. */
	patterns: Array<BadIvPattern>;
	/** Only meaningful for Great/Ultra, where a real CP cap can force the true
	 *  best spread below floor 5 in some stat (the classic low-Attack shape —
	 *  a trade never produces below 5, so no trade could ever actually reach
	 *  that spread). Master has no cap to force that trade-off, so this is
	 *  always `true` there and callers should simply ignore it for Master.
	 *  `true` when the requested level's tied-rank-1 spread has every stat at
	 *  5 or higher. */
	floorOk: boolean;
}

export interface TradeableSpeciesData {
	great: TradeableLeagueData;
	ultra: TradeableLeagueData;
	master: TradeableLeagueData;
}

export interface TradeableSpeciesDataInput {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	/** See `BadIvCarveOutsInput.speciesSearchMetadata`'s own doc comment. */
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>;
	/** {@link MAX_LEVEL} (50) or 51 (Best Buddy) — see
	 *  `BadIvCarveOutsInput.maxLevel`'s own doc comment; same "never both"
	 *  rule applies here. Default {@link MAX_LEVEL}. */
	maxLevel?: number;
}

/**
 * Per non-alias/Mega/Shadow species, everything the "Find Tradeable" tab
 * needs to know about its own tied-for-rank-1 (best stat product) spreads,
 * for Great (1500), Ultra (2500), and the uncapped Master cap — always at
 * whichever single level the player currently has toggled, never both (see
 * `maxLevel`'s own doc comment on why this used to check both and no longer
 * does).
 *
 * Deliberately NOT a whole-reachable-family walk the way `findBadIvCarveOuts`
 * is — `computeTradeableString` itself does that walk, once per candidate,
 * pulling this per-species data for each reachable stage it visits; walking
 * the family here too would just duplicate that work. Also deliberately
 * skips the Shadow-purify pass `findBadIvCarveOuts` needs — a Shadow can
 * never be a trade candidate at all (the game doesn't allow it), so
 * purification is simply never relevant here, which is most of why this
 * stays cheap despite covering all three PvP leagues (see
 * `computeTradeableString`'s own doc comment for the measured comparison).
 */
export const findTradeableSpeciesData = ({
	gamemasterPokemon,
	speciesSearchMetadata,
	maxLevel = MAX_LEVEL,
}: TradeableSpeciesDataInput): Record<string, TradeableSpeciesData> => {
	const candidates = Object.values(gamemasterPokemon).filter((p) => !p.aliasId && !p.isMega && !p.isShadow);

	const toLeagueData = (patterns: ReadonlyArray<BadIvPattern>): TradeableLeagueData => {
		const patternMap = new Map<string, BadIvPattern>();
		let floorOk = false;
		for (const pattern of patterns) {
			const key = `${pattern.A}-${pattern.D}-${pattern.S}`;
			if (!patternMap.has(key)) patternMap.set(key, pattern);
			if (pattern.A >= 5 && pattern.D >= 5 && pattern.S >= 5) floorOk = true;
		}
		return { patterns: Array.from(patternMap.values()).filter((p) => !isExactHundo(p)), floorOk };
	};

	// dex-server precomputes exactly this per non-Shadow species — the only
	// source of it (no on-the-fly fallback).
	const analyze = (p: IGamemasterPokemon, cap: number): TradeableLeagueData =>
		toLeagueData(
			requireSpeciesMetadata(speciesSearchMetadata, p.speciesId).bestIvSpreads[leagueKeyFor(cap)][levelKeyFor(maxLevel)]
		);

	const result: Record<string, TradeableSpeciesData> = {};
	for (const p of candidates) {
		result[p.speciesId] = {
			great: analyze(p, 1500),
			ultra: analyze(p, 2500),
			master: analyze(p, Number.MAX_VALUE),
		};
	}
	return result;
};

/**
 * Fetches `url` and parses it as JSON entirely off the main thread — the
 * network transfer was already async either way, but `Response.json()`'s own
 * parse of a multi-MB payload is a genuine synchronous task, and running it
 * here means the main thread never blocks on it at all. The caller gets back
 * an already-parsed plain object via Comlink's structured-clone transfer
 * (cheaper than re-parsing raw text, though not literally free) rather than
 * the raw response.
 *
 * Untyped (`unknown`) rather than generic — Comlink's `Remote<ComputeApi>`
 * doesn't preserve a per-call type argument through the proxy, so every
 * caller casts the result itself, the same way `utils/fetch-json.ts`'s
 * main-thread `fetchJson<T>` is used at each of its own call sites.
 */
const fetchJson = async (url: string): Promise<unknown> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Network response was not ok for ${url} (HTTP ${response.status})`);
	}
	return await response.json();
};

export const api = {
	familyIvPercents,
	bestIvs,
	raidComparisons,
	findBadIvCarveOuts,
	findTradeableSpeciesData,
	fetchJson,
};
export type ComputeApi = typeof api;

// Guarded: this module is also imported directly (not through a real Worker)
// by tests exercising the pure functions above — `self` doesn't exist there,
// and Comlink's `expose` assumes a genuine worker global scope.
if (typeof self !== 'undefined') {
	expose(api);
}
