import { useQuery } from '@tanstack/react-query';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { RankEntry } from '../utils/pokemon-helper';
import { getComputeWorker } from '../workers/compute-client';

const EMPTY: ReadonlyArray<RankEntry> = [];

/**
 * Every IV spread for `pokemon`, ranked for the given CP cap. The 16x16x16 brute
 * force runs in the compute worker; results are cached per (species, cap).
 */
export const useBestIvs = (
	pokemon: IGamemasterPokemon | undefined,
	cpCap: number,
	enabled = true
): ReadonlyArray<RankEntry> => {
	const { data } = useQuery({
		enabled: enabled && !!pokemon,
		queryKey: ['best-ivs', pokemon?.speciesId, cpCap],
		queryFn: () =>
			getComputeWorker().bestIvs({
				atk: pokemon!.baseStats.atk,
				def: pokemon!.baseStats.def,
				hp: pokemon!.baseStats.hp,
				league: cpCap,
			}),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	return data ?? EMPTY;
};
