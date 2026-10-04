import { computeBestIVs, type IVs, type RankEntry } from '../utils/pokemon-helper';
import { cpAt } from './pvp-sim/cp';
import type { SlotIvs } from './team-analysis';

/**
 * "Competition ranking" (1224, not 1234) of an IV table already sorted best first: a spread ties the rank of the
 * one above it whenever they share the exact (rounded) stat product, otherwise it takes its own 1-based position,
 * which already accounts for every tie before it (e.g. 1, 1, 3, 4, 5, 6, 7, 7, 7, 10, 11 — never 1, 1, 2, 3…).
 */
export const competitionRanks = (rows: ReadonlyArray<RankEntry>): Array<number> => {
	const prodOf = (r: RankEntry) => Math.round(r.battle.A * r.battle.D * r.battle.S);
	const out = new Array<number>(rows.length);
	for (let i = 0; i < rows.length; i++) {
		out[i] = i > 0 && prodOf(rows[i]) === prodOf(rows[i - 1]) ? out[i - 1] : i + 1;
	}
	return out;
};

/** The rank of one spread in a sorted IV table, or `undefined` if the table is empty / not loaded yet. */
export const ivRankOf = (
	rows: ReadonlyArray<RankEntry>,
	ranks: ReadonlyArray<number>,
	ivs: readonly [number, number, number]
): number | undefined => {
	const idx = rows.findIndex((r: { IVs: IVs }) => r.IVs.A === ivs[0] && r.IVs.D === ivs[1] && r.IVs.S === ivs[2]);
	return idx >= 0 ? ranks[idx] : undefined;
};

type Base = { atk: number; def: number; hp: number };

/** The highest level, up to `ceiling`, at which these IVs stay within the CP cap. */
export const highestLevelUnderCap = (base: Base, ivs: SlotIvs, cpCap: number, ceiling: number): number => {
	for (let level = ceiling; level > 1; level -= 0.5) {
		if (cpAt(base, ivs, level) <= cpCap) return level;
	}
	return 1;
};

/** The rank-1 spread of an IV table (ties: highest Attack, then Defense, then HP) and the highest level it fits at. */
export const bestSpread = (
	rows: ReadonlyArray<RankEntry>,
	ranks: ReadonlyArray<number>,
	base: Base,
	cpCap: number,
	ceiling: number
): { ivs: SlotIvs; level: number } | undefined => {
	const top = rows
		.filter((_, i) => ranks[i] === 1)
		.sort((a, b) => b.IVs.A - a.IVs.A || b.IVs.D - a.IVs.D || b.IVs.S - a.IVs.S)[0];
	if (!top) return undefined;
	const ivs: SlotIvs = [top.IVs.A, top.IVs.D, top.IVs.S];
	return { ivs, level: highestLevelUnderCap(base, ivs, cpCap, ceiling) };
};

/** The best spread (and level) for a base-stat line at a CP cap and level ceiling, computed on the spot. */
export const bestSpreadAt = (
	base: Base,
	cpCap: number,
	ceiling: number
): { ivs: SlotIvs; level: number } | undefined => {
	const rows = Object.values(computeBestIVs(base.atk, base.def, base.hp, cpCap, ceiling)).flat();
	return bestSpread(rows, competitionRanks(rows), base, cpCap, ceiling);
};
