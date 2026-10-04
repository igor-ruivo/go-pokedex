import type { RankEntry } from '../utils/pokemon-helper';
import { bestSpread, competitionRanks, highestLevelUnderCap, ivRankOf } from './iv-rank';
import { maxLevelOf, type SlotIvs } from './team-analysis';

export interface OptimalBuild {
	ivRank: number | undefined;
	ivsOptimal: boolean;
	levelOptimal: boolean;
	/** The rank-1 spread (and its level) at the Pokémon's own level ceiling. */
	best: { ivs: SlotIvs; level: number } | undefined;
	/** The best at the ceiling after flipping its Best Buddy state (keeping its Super Max Mega state): what the toggle sets. */
	buddy: { ivs: SlotIvs; level: number } | undefined;
	/** Same for its Super Max Mega state (keeping its Best Buddy state). Only for a species that can be one. */
	superMega: { ivs: SlotIvs; level: number } | undefined;
}

/**
 * How a member's IVs and level compare with what is optimal for the member itself: a Best Buddy is measured against the
 * level-51 IV table, everyone else against level 50's — a Super Max Mega's two extra levels don't change its best spread
 * (see dex-server's super-mega-guard), they only raise the level the spread is taken to. The website's own Best Buddy
 * setting is not consulted: the only inputs are the Pokémon, its build, its two statuses and the CP cap.
 */
export const computeOptimalBuild = (input: {
	baseStats: { atk: number; def: number; hp: number } | undefined;
	canSuperMega: boolean;
	ivs: SlotIvs | undefined;
	level: number | undefined;
	flags: { buddy: boolean; superMega: boolean };
	cpCap: number;
	/** The league's IV tables, best first: up to level 50, and up to level 51 for a Best Buddy. */
	rows50: ReadonlyArray<RankEntry>;
	rows51: ReadonlyArray<RankEntry>;
}): OptimalBuild => {
	const { baseStats, ivs, level, flags, cpCap } = input;
	if (!baseStats || !ivs) {
		return {
			ivRank: undefined,
			ivsOptimal: false,
			levelOptimal: false,
			best: undefined,
			buddy: undefined,
			superMega: undefined,
		};
	}
	const tableFor = (buddy: boolean) => (buddy ? input.rows51 : input.rows50);
	const ceiling = maxLevelOf(flags);
	const buddyCeiling = maxLevelOf({ buddy: !flags.buddy, superMega: flags.superMega });
	const superCeiling = maxLevelOf({ buddy: flags.buddy, superMega: !flags.superMega });
	const rowsNow = tableFor(flags.buddy);
	const rowsBuddy = tableFor(!flags.buddy);
	const rowsSuper = tableFor(flags.buddy);
	const ranks = competitionRanks(rowsNow);
	const ivRank = ivRankOf(rowsNow, ranks, ivs);
	return {
		ivRank,
		ivsOptimal: ivRank === 1,
		levelOptimal: level === highestLevelUnderCap(baseStats, ivs, cpCap, ceiling),
		best: bestSpread(rowsNow, ranks, baseStats, cpCap, ceiling),
		buddy: bestSpread(rowsBuddy, competitionRanks(rowsBuddy), baseStats, cpCap, buddyCeiling),
		superMega: input.canSuperMega
			? bestSpread(rowsSuper, competitionRanks(rowsSuper), baseStats, cpCap, superCeiling)
			: undefined,
	};
};
