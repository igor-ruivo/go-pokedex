import type { RankEntry } from '../utils/pokemon-helper';
import { bestSpread, competitionRanks, highestLevelUnderCap, ivRankOf } from './iv-rank';
import { maxLevelOf, type SlotIvs } from './team-analysis';

const NO_ROWS: ReadonlyArray<RankEntry> = [];

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
 * How a member's IVs and level compare with what is optimal for the member itself: each member is measured against the IV
 * table of its own level ceiling — 50, 51 as a Best Buddy, 52 as a Super Max Mega, 53 as both (see `maxLevelOf`). A Super
 * Max Mega's extra levels do change its best spread wherever it fits a capped league at level 50. The website's own Best
 * Buddy setting is not consulted: the only inputs are the Pokémon, its build, its two statuses and the CP cap.
 */
export const computeOptimalBuild = (input: {
	baseStats: { atk: number; def: number; hp: number } | undefined;
	canSuperMega: boolean;
	ivs: SlotIvs | undefined;
	level: number | undefined;
	flags: { buddy: boolean; superMega: boolean };
	cpCap: number;
	/**
	 * The league's IV tables, best first, by the level ceiling they were computed for: 50, 51 (Best Buddy) and — for a species
	 * that can be a Super Max Mega — 52 and 53 (with the ribbon too). A ceiling with no table reads as an empty one.
	 */
	rows: Readonly<Partial<Record<number, ReadonlyArray<RankEntry>>>>;
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
	const tableFor = (statuses: { buddy: boolean; superMega: boolean }) => input.rows[maxLevelOf(statuses)] ?? NO_ROWS;
	const ceiling = maxLevelOf(flags);
	const buddyCeiling = maxLevelOf({ buddy: !flags.buddy, superMega: flags.superMega });
	const superCeiling = maxLevelOf({ buddy: flags.buddy, superMega: !flags.superMega });
	const rowsNow = tableFor(flags);
	const rowsBuddy = tableFor({ buddy: !flags.buddy, superMega: flags.superMega });
	const rowsSuper = tableFor({ buddy: flags.buddy, superMega: !flags.superMega });
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
