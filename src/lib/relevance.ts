import { useMemo } from 'react';

import { useRelevanceSets } from '../contexts/relevance-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { fetchReachablePokemonIncludingSelf, sortByFamilyLine } from '../utils/pokemon-helper';

export type LeagueKey = 'great' | 'ultra' | 'master' | 'raid';
export const LEAGUE_KEYS: ReadonlyArray<LeagueKey> = ['great', 'ultra', 'master', 'raid'];
/** Badge importance, most to least — used to break a tied badge COUNT by
 *  which specific badges each side has, not by any underlying rank number
 *  (see `sortByCalendarRelevance`). */
const BADGE_IMPORTANCE: ReadonlyArray<LeagueKey> = ['raid', 'master', 'ultra', 'great'];

export interface RelevanceSets {
	great: Set<string>;
	ultra: Set<string>;
	master: Set<string>;
	raid: Set<string>;
	ready: boolean;
}

// The actual computation (and its site-wide sharing via context) now lives in
// `RelevanceSetsProvider`/`useRelevanceSets` in `contexts/relevance-context.tsx`
// — re-exported here so every existing call site (`'../lib/relevance'`) keeps
// working unchanged. See that file's doc comment for why this moved out of a
// plain per-component `useMemo`.
export { useRelevanceSets };

/** The family-reachability sweep `leagueBadgesFor` needs — a plain helper so
 *  `sortByCalendarRelevance` can pass in an already-computed family instead
 *  of making it walk the same reachable set itself. */
const familyIdsFor = (pokemon: IGamemasterPokemon, gamemasterPokemon: Record<string, IGamemasterPokemon>) =>
	Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)).map((m) => m.speciesId);

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
	sets: RelevanceSets,
	family?: Array<string>
): Array<LeagueKey> => {
	if (!pokemon || !sets.ready) return [];
	const familyIds = family ?? familyIdsFor(pokemon, gamemasterPokemon);
	const hits = (set: Set<string>) => familyIds.some((id) => set.has(id));
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

/**
 * Calendar chip ordering (also used by Move Detail's Recommended/Also-learned
 * -by/Elite/Legacy lists), in this exact priority order:
 *
 *  1. A live countdown (`timeLeftOf`, e.g. a "current" raid/spawn's own
 *     "Xh/Xm/Xs left" adorner) always outranks having none at all.
 *  2. Between two both counting down, the one ending SOONER comes first.
 *  3. However many league/raid badges a Pokémon earns (see `leagueBadgesFor`)
 *     — more badges wins, full stop.
 *  4. Tied on badge COUNT: which specific badges, by importance (Raid, then
 *     Master, then Ultra, then Great — see `BADGE_IMPORTANCE`) — presence of
 *     the higher-priority badge wins; the underlying PvP/raid rank NUMBER
 *     plays no part at all here, only whether each badge is present.
 *  5. Exactly the same badges on both sides: rank stops mattering entirely —
 *     falls straight to `sortByFamilyLine`'s own dex/family-branch order,
 *     which also covers a pair of otherwise-unrelated, badge-less species.
 */
export const sortByCalendarRelevance = <T>(
	items: ReadonlyArray<T>,
	speciesIdOf: (item: T) => string,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	sets: RelevanceSets,
	/** Remaining ms for a live countdown this item is showing (e.g. Calendar's
	 *  "current" raid/spawn chips) — `undefined` when it has none at all. */
	timeLeftOf?: (item: T) => number | undefined
): Array<T> => {
	const known = items.filter((item) => gamemasterPokemon[speciesIdOf(item)]);
	const uniquePokemon = [
		...new Map(known.map((item) => [speciesIdOf(item), gamemasterPokemon[speciesIdOf(item)]])).values(),
	];
	const familyOrder = sortByFamilyLine(uniquePokemon, gamemasterPokemon);
	const familyRank = new Map(familyOrder.map((p, i) => [p.speciesId, i]));
	const badgesOf = new Map(
		uniquePokemon.map((p) => [p.speciesId, new Set(leagueBadgesFor(p, gamemasterPokemon, sets))])
	);

	return [...items].sort((a, b) => {
		const idA = speciesIdOf(a);
		const idB = speciesIdOf(b);

		const timeA = timeLeftOf?.(a);
		const timeB = timeLeftOf?.(b);
		if ((timeA !== undefined) !== (timeB !== undefined)) return timeA !== undefined ? -1 : 1;
		if (timeA !== undefined && timeB !== undefined && timeA !== timeB) return timeA - timeB;

		const badgesA = badgesOf.get(idA) ?? new Set<LeagueKey>();
		const badgesB = badgesOf.get(idB) ?? new Set<LeagueKey>();
		if (badgesA.size !== badgesB.size) return badgesB.size - badgesA.size;

		for (const key of BADGE_IMPORTANCE) {
			const hasA = badgesA.has(key);
			const hasB = badgesB.has(key);
			if (hasA !== hasB) return hasA ? -1 : 1;
		}

		return (familyRank.get(idA) ?? 0) - (familyRank.get(idB) ?? 0);
	});
};
