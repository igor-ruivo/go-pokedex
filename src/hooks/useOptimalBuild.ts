import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { computeOptimalBuild, type OptimalBuild } from '../lib/optimal-build';
import { maxLevelOf, type SlotIvs } from '../lib/team-analysis';
import { useBestIvsAtLevel } from './useBestIvs';

/**
 * How a member's IVs and level compare with what is optimal for the member itself (see `computeOptimalBuild`). The IV
 * tables come in the sizes the level ceilings give: up to 50, or 51 for a Best Buddy — and, for a Pokémon that can be a Super
 * Max Mega, 52, or 53 with the ribbon too.
 */
export const useOptimalBuild = (
	pokemon: IGamemasterPokemon | undefined,
	ivs: SlotIvs | undefined,
	level: number | undefined,
	flags: { buddy: boolean; superMega: boolean },
	cpCap: number
): OptimalBuild => {
	const enabled = !!pokemon && !!ivs;
	const canSuperMega = !!pokemon?.isSuperMega;
	const rows50 = useBestIvsAtLevel(pokemon, cpCap, maxLevelOf({}), enabled);
	const rows51 = useBestIvsAtLevel(pokemon, cpCap, maxLevelOf({ buddy: true }), enabled);
	const rows52 = useBestIvsAtLevel(pokemon, cpCap, maxLevelOf({ superMega: true }), enabled && canSuperMega);
	const rows53 = useBestIvsAtLevel(
		pokemon,
		cpCap,
		maxLevelOf({ buddy: true, superMega: true }),
		enabled && canSuperMega
	);
	const ivKey = ivs?.join('.');
	return useMemo(
		() =>
			computeOptimalBuild({
				baseStats: pokemon?.baseStats,
				canSuperMega,
				ivs,
				level,
				flags,
				cpCap,
				rows: { 50: rows50, 51: rows51, 52: rows52, 53: rows53 },
			}),
		// `ivs` is tracked through `ivKey` so a fresh array with the same numbers doesn't recompute
		[rows50, rows51, rows52, rows53, pokemon, ivKey, level, flags.buddy, flags.superMega, cpCap]
	);
};
