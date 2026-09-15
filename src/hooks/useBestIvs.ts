import { useQuery } from '@tanstack/react-query';

import { useBestBuddy } from '../contexts/best-buddy-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { RankEntry } from '../utils/pokemon-helper';
import { getComputeWorker } from '../workers/compute-client';

const EMPTY: ReadonlyArray<RankEntry> = [];

/**
 * Every IV spread for `pokemon`, ranked for the given CP cap at an explicit
 * level ceiling — unlike {@link useBestIvs}, never reads the Best Buddy
 * toggle. Meant for a caller that needs one SPECIFIC level regardless of what
 * the player currently has set (e.g. the search-string generator's rank-1
 * safety floor, which must check both 50 and 51 no matter which one is
 * toggled — see `SearchStringsTab.tsx`'s own notes on why that floor is kept
 * separate from the toggle-respecting core selection). Shares its cache with
 * {@link useBestIvs}: the query key is identical to what that hook produces
 * for the same `maxLevel`.
 */
export const useBestIvsAtLevel = (
	pokemon: IGamemasterPokemon | undefined,
	cpCap: number,
	maxLevel: number,
	enabled = true
): ReadonlyArray<RankEntry> => {
	const { data } = useQuery({
		enabled: enabled && !!pokemon,
		queryKey: ['best-ivs', pokemon?.speciesId, cpCap, maxLevel],
		queryFn: () =>
			getComputeWorker().bestIvs({
				atk: pokemon!.baseStats.atk,
				def: pokemon!.baseStats.def,
				hp: pokemon!.baseStats.hp,
				league: cpCap,
				maxLevel,
			}),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	return data ?? EMPTY;
};

/**
 * Every IV spread for `pokemon`, ranked for the given CP cap at whichever
 * level ceiling the player currently has toggled (Best Buddy or not). The
 * 16x16x16 brute force runs in the compute worker; results are cached per
 * (species, cap, level).
 */
export const useBestIvs = (
	pokemon: IGamemasterPokemon | undefined,
	cpCap: number,
	enabled = true
): ReadonlyArray<RankEntry> => {
	const { maxLevel } = useBestBuddy();
	return useBestIvsAtLevel(pokemon, cpCap, maxLevel, enabled);
};
