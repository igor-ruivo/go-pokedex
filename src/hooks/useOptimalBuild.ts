import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { bestSpread, competitionRanks, highestLevelUnderCap, ivRankOf } from '../lib/iv-rank';
import { maxLevelOf, type SlotIvs } from '../lib/team-analysis';
import { useBestIvsAtLevel } from './useBestIvs';

/**
 * How a member's IVs and level compare with what is optimal for the member itself: a Best Buddy is
 * measured against the level-51 ceiling, everyone else against level 50 — the website's own Best Buddy setting is not
 * consulted. `ivRank` is the spread's competition rank in that IV table (ties share a rank), `ivsOptimal` means rank 1,
 * `levelOptimal` means the highest level the cap allows under that ceiling, and `best` is that rank-1 spread with its level.
 *
 * `buddy` is the spread and level to give the Pokémon when it is made a Best Buddy: the best at the level-51 ceiling.
 */
export const useOptimalBuild = (
	pokemon: IGamemasterPokemon | undefined,
	ivs: SlotIvs | undefined,
	level: number | undefined,
	flags: { buddy: boolean; superMega: boolean },
	cpCap: number
): {
	ivRank: number | undefined;
	ivsOptimal: boolean;
	levelOptimal: boolean;
	/** The rank-1 spread (and its level) at the Pokémon's own level ceiling. */
	best: { ivs: SlotIvs; level: number } | undefined;
	/** The best at the ceiling after flipping its Best Buddy state (keeping its Super Max Mega state): what the toggle sets. */
	buddy: { ivs: SlotIvs; level: number } | undefined;
	/** Same for its Super Max Mega state (keeping its Best Buddy state). Only for a species that can be one. */
	superMega: { ivs: SlotIvs; level: number } | undefined;
} => {
	const canSuperMega = !!pokemon?.isSuperMega;
	const enabled = !!pokemon && !!ivs;
	const ceiling = maxLevelOf(flags);
	const buddyCeiling = maxLevelOf({ buddy: !flags.buddy, superMega: flags.superMega });
	const superCeiling = maxLevelOf({ buddy: flags.buddy, superMega: !flags.superMega });
	const rowsNow = useBestIvsAtLevel(pokemon, cpCap, ceiling, enabled);
	const rowsBuddy = useBestIvsAtLevel(pokemon, cpCap, buddyCeiling, enabled);
	const rowsSuper = useBestIvsAtLevel(pokemon, cpCap, superCeiling, enabled && canSuperMega);
	const ivKey = ivs?.join('.');
	return useMemo(() => {
		if (!pokemon || !ivs) {
			return {
				ivRank: undefined,
				ivsOptimal: false,
				levelOptimal: false,
				best: undefined,
				buddy: undefined,
				superMega: undefined,
			};
		}
		const ranks = competitionRanks(rowsNow);
		const ivRank = ivRankOf(rowsNow, ranks, ivs);
		return {
			ivRank,
			ivsOptimal: ivRank === 1,
			levelOptimal: level === highestLevelUnderCap(pokemon.baseStats, ivs, cpCap, ceiling),
			best: bestSpread(rowsNow, ranks, pokemon.baseStats, cpCap, ceiling),
			buddy: bestSpread(rowsBuddy, competitionRanks(rowsBuddy), pokemon.baseStats, cpCap, buddyCeiling),
			superMega: canSuperMega
				? bestSpread(rowsSuper, competitionRanks(rowsSuper), pokemon.baseStats, cpCap, superCeiling)
				: undefined,
		};
		// `ivs` is tracked through `ivKey` so a fresh array with the same numbers doesn't recompute
	}, [rowsNow, rowsBuddy, rowsSuper, pokemon, ivKey, level, ceiling, buddyCeiling, superCeiling, canSuperMega, cpCap]);
};
