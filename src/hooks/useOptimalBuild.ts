import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { competitionRanks, ivRankOf } from '../lib/iv-rank';
import { cpAt } from '../lib/pvp-sim/cp';
import type { SlotIvs } from '../lib/team-analysis';
import { BEST_BUDDY_LEVEL, MAX_LEVEL, type RankEntry } from '../utils/pokemon-helper';
import { useBestIvsAtLevel } from './useBestIvs';

/** The rank-1 spread of an IV table (ties: highest Attack, then Defense, then HP) and the highest level it fits at. */
const bestOf = (
	rows: ReadonlyArray<RankEntry>,
	ranks: ReadonlyArray<number>,
	pokemon: IGamemasterPokemon,
	cpCap: number,
	ceiling: number
): { ivs: SlotIvs; level: number } | undefined => {
	const top = rows
		.filter((_, i) => ranks[i] === 1)
		.sort((a, b) => b.IVs.A - a.IVs.A || b.IVs.D - a.IVs.D || b.IVs.S - a.IVs.S)[0];
	if (!top) return undefined;
	const ivs: SlotIvs = [top.IVs.A, top.IVs.D, top.IVs.S];
	return { ivs, level: highestLevel(pokemon, ivs, cpCap, ceiling) };
};

const highestLevel = (pokemon: IGamemasterPokemon, ivs: SlotIvs, cpCap: number, ceiling: number) => {
	for (let level = ceiling; level > 1; level -= 0.5) {
		if (cpAt(pokemon.baseStats, ivs, level) <= cpCap) return level;
	}
	return 1;
};

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
	isBuddy: boolean,
	cpCap: number
): {
	ivRank: number | undefined;
	ivsOptimal: boolean;
	levelOptimal: boolean;
	best: { ivs: SlotIvs; level: number } | undefined;
	buddy: { ivs: SlotIvs; level: number } | undefined;
} => {
	const rows50 = useBestIvsAtLevel(pokemon, cpCap, MAX_LEVEL, !!pokemon && !!ivs);
	const rows51 = useBestIvsAtLevel(pokemon, cpCap, BEST_BUDDY_LEVEL, !!pokemon && !!ivs);
	const ivKey = ivs?.join('.');
	return useMemo(() => {
		if (!pokemon || !ivs) {
			return { ivRank: undefined, ivsOptimal: false, levelOptimal: false, best: undefined, buddy: undefined };
		}
		const ceiling = isBuddy ? BEST_BUDDY_LEVEL : MAX_LEVEL;
		const rows = isBuddy ? rows51 : rows50;
		const ranks = competitionRanks(rows);
		const ivRank = ivRankOf(rows, ranks, ivs);
		const best = bestOf(rows, ranks, pokemon, cpCap, ceiling);
		const buddy = bestOf(rows51, competitionRanks(rows51), pokemon, cpCap, BEST_BUDDY_LEVEL);
		return {
			ivRank,
			ivsOptimal: ivRank === 1,
			levelOptimal: level === highestLevel(pokemon, ivs, cpCap, ceiling),
			best,
			buddy,
		};
		// `ivs` is tracked through `ivKey` so a fresh array with the same numbers doesn't recompute
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rows50, rows51, pokemon, ivKey, level, isBuddy, cpCap]);
};
