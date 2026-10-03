import type { IVs, RankEntry } from '../utils/pokemon-helper';

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
