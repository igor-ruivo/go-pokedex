import { useMemo } from 'react';

import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import { ConfigKeys, readPersistentValue } from '../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf, sortByFamilyLine } from '../utils/pokemon-helper';
import { raidRankOf } from './raid-metric';

export type LeagueKey = 'great' | 'ultra' | 'master' | 'raid';
export const LEAGUE_KEYS: ReadonlyArray<LeagueKey> = ['great', 'ultra', 'master', 'raid'];

/**
 * Relevance cut-offs are whatever the user set on the Mass-delete (/trash) page —
 * "keep top N …" — so a mon is relevant exactly when it wouldn't be trashed.
 * Defaults match that page's defaults.
 */
const cfgNum = (key: ConfigKeys, fallback: number): number => {
	const raw = readPersistentValue(key);
	const n = raw == null ? NaN : Number(raw);
	return Number.isFinite(n) && n > 0 ? n : fallback;
};

export interface RelevanceSets {
	great: Set<string>;
	ultra: Set<string>;
	master: Set<string>;
	raid: Set<string>;
	/** Each species' own best (lowest) rank in that category — `undefined`
	 *  when it doesn't appear there at all. Membership in the `Set`s above is
	 *  just "rank <= the /trash-page cutoff"; these carry the actual number,
	 *  for ranking WITHIN a tied badge count (see `sortByCalendarRelevance`). */
	greatRank: Map<string, number>;
	ultraRank: Map<string, number>;
	masterRank: Map<string, number>;
	raidRank: Map<string, number>;
	ready: boolean;
}

const EMPTY: RelevanceSets = {
	great: new Set(),
	ultra: new Set(),
	master: new Set(),
	raid: new Set(),
	greatRank: new Map(),
	ultraRank: new Map(),
	masterRank: new Map(),
	raidRank: new Map(),
	ready: false,
};

/** Species ids that are directly relevant for each league / raids. Computed once. */
export const useRelevanceSets = (): RelevanceSets => {
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	// Which figure (DPS/TDO/eDPS) counts as "top N" for raids — the same
	// device-wide setting Rankings' raid tab ranks by, not the feed's own
	// baked-in `rank` field (always DPS-ordered regardless of this choice).
	const { raidMetric } = useRaidMetric();

	// Read fresh every render so edits on /trash take effect on the next navigation.
	const greatCut = cfgNum(ConfigKeys.TrashGreat, 50);
	const ultraCut = cfgNum(ConfigKeys.TrashUltra, 50);
	const masterCut = cfgNum(ConfigKeys.TrashMaster, 110);
	const raidCut = cfgNum(ConfigKeys.TrashRaid, 5);

	return useMemo(() => {
		if (!pvpFetchCompleted || !raidDPSFetchCompleted) return EMPTY;
		const pvpSet = (list: Record<string, { speciesId: string; rank: number }> | undefined, cutoff: number) => {
			const s = new Set<string>();
			for (const r of Object.values(list ?? {})) if (r.rank <= cutoff) s.add(r.speciesId);
			return s;
		};
		const pvpRankMap = (list: Record<string, { speciesId: string; rank: number }> | undefined) => {
			const m = new Map<string, number>();
			for (const r of Object.values(list ?? {})) m.set(r.speciesId, r.rank);
			return m;
		};
		const raid = new Set<string>();
		// A species can appear in several type-specific attacker lists with a
		// different rank in each — keep its BEST (lowest) one, same "relevant
		// for raids at all" spirit the membership set already has.
		const raidRank = new Map<string, number>();
		for (const [key, list] of Object.entries(raidDPS)) {
			if (key === '') continue; // the '' key is the type-agnostic overall list; we want "top N of any type"
			for (const e of Object.values(list)) {
				const rank = raidRankOf(e, raidMetric);
				if (rank == null) continue;
				if (rank <= raidCut) raid.add(e.speciesId);
				const existing = raidRank.get(e.speciesId);
				if (existing == null || rank < existing) raidRank.set(e.speciesId, rank);
			}
		}
		return {
			great: pvpSet(rankLists[0], greatCut),
			ultra: pvpSet(rankLists[1], ultraCut),
			master: pvpSet(rankLists[2], masterCut),
			raid,
			greatRank: pvpRankMap(rankLists[0]),
			ultraRank: pvpRankMap(rankLists[1]),
			masterRank: pvpRankMap(rankLists[2]),
			raidRank,
			ready: true,
		};
	}, [
		rankLists,
		raidDPS,
		raidMetric,
		pvpFetchCompleted,
		raidDPSFetchCompleted,
		greatCut,
		ultraCut,
		masterCut,
		raidCut,
	]);
};

/**
 * Which leagues a Pokémon is relevant for — directly, or through any member of
 * its evolution line (megas included for the raid check). Plain function (not
 * a hook) so it can also run inside a sort comparator — see
 * `sortByCalendarRelevance` below; `useLeagueBadges` is the memoized,
 * per-component-render wrapper for everywhere else (the dot badges themselves).
 */
export const leagueBadgesFor = (
	pokemon: IGamemasterPokemon | undefined,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	sets: RelevanceSets
): Array<LeagueKey> => {
	if (!pokemon || !sets.ready) return [];
	const family = Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)).map(
		(m) => m.speciesId
	);
	const hits = (set: Set<string>) => family.some((id) => set.has(id));
	const out: Array<LeagueKey> = [];
	if (hits(sets.great)) out.push('great');
	if (hits(sets.ultra)) out.push('ultra');
	if (hits(sets.master)) out.push('master');
	if (hits(sets.raid)) out.push('raid');
	return out;
};

export const useLeagueBadges = (
	pokemon: IGamemasterPokemon | undefined,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
): Array<LeagueKey> => {
	const sets = useRelevanceSets();
	return useMemo(() => leagueBadgesFor(pokemon, gamemasterPokemon, sets), [pokemon, gamemasterPokemon, sets]);
};

interface BestRanks {
	raid: number;
	master: number;
	ultra: number;
	great: number;
}

/** Each category's best (lowest) rank across the whole reachable family —
 *  `Infinity` where the family never shows up in that category at all.
 *  Same family-reachability sweep `leagueBadgesFor` already does, just
 *  keeping the actual number instead of collapsing it to "relevant or not". */
const bestRanksFor = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	sets: RelevanceSets
): BestRanks => {
	if (!sets.ready) return { raid: Infinity, master: Infinity, ultra: Infinity, great: Infinity };
	const family = Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)).map(
		(m) => m.speciesId
	);
	const bestOf = (map: Map<string, number>) => {
		let best = Infinity;
		for (const id of family) {
			const rank = map.get(id);
			if (rank != null && rank < best) best = rank;
		}
		return best;
	};
	return {
		raid: bestOf(sets.raidRank),
		master: bestOf(sets.masterRank),
		ultra: bestOf(sets.ultraRank),
		great: bestOf(sets.greatRank),
	};
};

/**
 * Calendar chip ordering (also used by Move Detail's Recommended/Also-learned
 * -by/Elite/Legacy lists): most relevant first (however many league/raid dots
 * a Pokémon earns — see `leagueBadgesFor`); on a tie, whichever has the
 * better (lower) raid rank wins, using the player's own preferred raid metric
 * (`useRaidMetric` — DPS/TDO/eDPS, baked into `sets.raidRank` already); still
 * tied, Master, then Ultra, then Great League rank, same "better rank wins"
 * comparison each time; still tied after all four, the exact same ordering a
 * Pokémon's own family-line strip uses (`sortByFamilyLine`), reused as-is
 * rather than re-implemented — unrelated species just fall back to its
 * dex/name tiebreak, which reads fine for a mixed bag of Pokémon too.
 */
export const sortByCalendarRelevance = <T>(
	items: ReadonlyArray<T>,
	speciesIdOf: (item: T) => string,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	sets: RelevanceSets
): Array<T> => {
	const known = items.filter((item) => gamemasterPokemon[speciesIdOf(item)]);
	const uniquePokemon = [
		...new Map(known.map((item) => [speciesIdOf(item), gamemasterPokemon[speciesIdOf(item)]])).values(),
	];
	const familyOrder = sortByFamilyLine(uniquePokemon, gamemasterPokemon);
	const familyRank = new Map(familyOrder.map((p, i) => [p.speciesId, i]));
	const badgeCount = new Map(
		uniquePokemon.map((p) => [p.speciesId, leagueBadgesFor(p, gamemasterPokemon, sets).length])
	);
	const bestRanks = new Map(uniquePokemon.map((p) => [p.speciesId, bestRanksFor(p, gamemasterPokemon, sets)]));
	const ranksOf = (id: string): BestRanks =>
		bestRanks.get(id) ?? { raid: Infinity, master: Infinity, ultra: Infinity, great: Infinity };

	return [...items].sort((a, b) => {
		const idA = speciesIdOf(a);
		const idB = speciesIdOf(b);
		const ranksA = ranksOf(idA);
		const ranksB = ranksOf(idB);
		return (
			(badgeCount.get(idB) ?? 0) - (badgeCount.get(idA) ?? 0) ||
			ranksA.raid - ranksB.raid ||
			ranksA.master - ranksB.master ||
			ranksA.ultra - ranksB.ultra ||
			ranksA.great - ranksB.great ||
			(familyRank.get(idA) ?? 0) - (familyRank.get(idB) ?? 0)
		);
	});
};
