import { describe, expect, it } from 'vitest';

import { rankPerfection } from './format';

describe('rankPerfection', () => {
	it('is 100% for rank 1', () => {
		expect(rankPerfection(1)).toBe(100);
	});

	it('is 0% for the worst possible rank (4096)', () => {
		expect(rankPerfection(4096)).toBe(0);
	});

	it('matches the Azumarill Great League rank-2 case (~99.98%, not the stat-product-range 96%)', () => {
		expect(rankPerfection(2)).toBeCloseTo(99.97557998, 5);
	});

	it('is linear in rank position', () => {
		expect(rankPerfection(2048.5)).toBeCloseTo(50, 5);
	});
});
