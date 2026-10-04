import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { computeOptimalBuild, type OptimalBuild } from '../lib/optimal-build';
import type { SlotIvs } from '../lib/team-analysis';
import { useBestIvsAtLevel } from './useBestIvs';

/**
 * How a member's IVs and level compare with what is optimal for the member itself (see `computeOptimalBuild`). The IV
 * tables only ever come in two sizes: up to 50, or up to 51 for a Best Buddy.
 */
export const useOptimalBuild = (
	pokemon: IGamemasterPokemon | undefined,
	ivs: SlotIvs | undefined,
	level: number | undefined,
	flags: { buddy: boolean; superMega: boolean },
	cpCap: number
): OptimalBuild => {
	const enabled = !!pokemon && !!ivs;
	const rows50 = useBestIvsAtLevel(pokemon, cpCap, 50, enabled);
	const rows51 = useBestIvsAtLevel(pokemon, cpCap, 51, enabled);
	const ivKey = ivs?.join('.');
	return useMemo(
		() =>
			computeOptimalBuild({
				baseStats: pokemon?.baseStats,
				canSuperMega: !!pokemon?.isSuperMega,
				ivs,
				level,
				flags,
				cpCap,
				rows50,
				rows51,
			}),
		// `ivs` is tracked through `ivKey` so a fresh array with the same numbers doesn't recompute
		[rows50, rows51, pokemon, ivKey, level, flags.buddy, flags.superMega, cpCap]
	);
};
