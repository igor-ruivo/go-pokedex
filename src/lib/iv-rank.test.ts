import { describe, expect, it } from 'vitest';

import type { RankEntry } from '../utils/pokemon-helper';
import { bestSpread, competitionRanks, highestLevelUnderCap, ivRankOf } from './iv-rank';
import { cpAt } from './pvp-sim/cp';

const row = (A: number, D: number, S: number, product: number): RankEntry => ({
	IVs: { A, D, S, star: 0 },
	battle: { A: product, D: 1, S: 1 },
	L: 1,
	CP: 1,
});

describe('competitionRanks', () => {
	it('shares a rank between equal stat products and skips the ranks it used', () => {
		const rows = [100, 100, 90, 80, 80, 80, 70].map((product, i) => row(i, 0, 0, product));
		expect(competitionRanks(rows)).toEqual([1, 1, 3, 4, 4, 4, 7]);
	});

	it('ranks an empty table as nothing', () => {
		expect(competitionRanks([])).toEqual([]);
	});

	it('compares the rounded product', () => {
		const rows = [row(0, 0, 0, 100.2), row(1, 0, 0, 99.8)];
		expect(competitionRanks(rows)).toEqual([1, 1]);
	});
});

describe('ivRankOf', () => {
	const rows = [row(0, 15, 14, 100), row(1, 15, 15, 100), row(5, 5, 5, 90)];
	const ranks = competitionRanks(rows);

	it('finds the rank of a spread, ties included', () => {
		expect(ivRankOf(rows, ranks, [0, 15, 14])).toBe(1);
		expect(ivRankOf(rows, ranks, [1, 15, 15])).toBe(1);
		expect(ivRankOf(rows, ranks, [5, 5, 5])).toBe(3);
	});

	it('has no rank for a spread outside the table, or for an empty table', () => {
		expect(ivRankOf(rows, ranks, [15, 15, 15])).toBeUndefined();
		expect(ivRankOf([], [], [0, 0, 0])).toBeUndefined();
	});
});

describe('highestLevelUnderCap', () => {
	const base = { atk: 200, def: 200, hp: 200 };
	const ivs: [number, number, number] = [15, 15, 15];

	it('is the highest level that fits the cap: one more half level would not', () => {
		for (const cap of [500, 1500, 2500]) {
			const level = highestLevelUnderCap(base, ivs, cap, 50);
			expect(cpAt(base, ivs, level), `cap ${cap}`).toBeLessThanOrEqual(cap);
			if (level < 50) expect(cpAt(base, ivs, level + 0.5), `cap ${cap}`).toBeGreaterThan(cap);
		}
	});

	it('stops at the ceiling when the cap leaves room, up to a Super Max Mega’s 52 and the 53 of both statuses', () => {
		expect(highestLevelUnderCap(base, ivs, 10000, 50)).toBe(50);
		expect(highestLevelUnderCap(base, ivs, 10000, 51)).toBe(51);
		expect(highestLevelUnderCap(base, ivs, 10000, 52)).toBe(52);
		expect(highestLevelUnderCap(base, ivs, 10000, 53)).toBe(53);
	});

	it('is level 1 when nothing fits', () => {
		expect(highestLevelUnderCap(base, ivs, 5, 50)).toBe(1);
	});

	it('does not go higher with a higher ceiling when the cap is what holds the level back', () => {
		const capped = highestLevelUnderCap(base, ivs, 1500, 50);
		expect(highestLevelUnderCap(base, ivs, 1500, 52)).toBe(capped);
	});
});

describe('bestSpread', () => {
	const base = { atk: 200, def: 200, hp: 200 };

	it('takes the rank-1 spread, breaking ties by Attack, then Defense, then HP', () => {
		const rows = [
			row(0, 15, 15, 100),
			row(2, 10, 10, 100),
			row(2, 12, 9, 100),
			row(2, 12, 11, 100),
			row(15, 15, 15, 50),
		];
		const best = bestSpread(rows, competitionRanks(rows), base, 1500, 50)!;
		expect(best.ivs).toEqual([2, 12, 11]);
	});

	it('gives the highest level that spread fits under the cap and the ceiling', () => {
		const rows = [row(3, 4, 5, 100)];
		const ranks = competitionRanks(rows);
		expect(bestSpread(rows, ranks, base, 1500, 50)!.level).toBe(highestLevelUnderCap(base, [3, 4, 5], 1500, 50));
		expect(bestSpread(rows, ranks, base, 10000, 52)!.level).toBe(52);
	});

	it('has no spread for an empty table', () => {
		expect(bestSpread([], [], base, 1500, 50)).toBeUndefined();
	});
});
