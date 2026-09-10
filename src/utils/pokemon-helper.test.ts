import { describe, expect, it } from 'vitest';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import {
	calculateCP,
	calculateHP,
	computeBestIVs,
	computeMoveEffectiveness,
	Effectiveness,
	levelToLevelIndex,
	MAX_LEVEL,
	MAX_LEVEL_INDEX,
	needsXLCandy,
	pveDPS,
	shortName,
} from './pokemon-helper';

describe('levelToLevelIndex', () => {
	it('maps game levels to half-level CPM indices', () => {
		expect(levelToLevelIndex(1)).toBe(0);
		expect(levelToLevelIndex(40)).toBe(78);
		expect(levelToLevelIndex(50)).toBe(98);
	});

	it('exposes the evaluation ceiling as level 50', () => {
		expect(MAX_LEVEL).toBe(50);
		expect(MAX_LEVEL_INDEX).toBe(levelToLevelIndex(50));
	});
});

describe('computeMoveEffectiveness', () => {
	it('scores single-type matchups from the type chart', () => {
		expect(computeMoveEffectiveness('water', 'fire')).toBe(Effectiveness.Effective);
		expect(computeMoveEffectiveness('fighting', 'normal')).toBe(Effectiveness.Effective);
		expect(computeMoveEffectiveness('electric', 'ground')).toBe(Effectiveness.DoubleResistance);
		expect(computeMoveEffectiveness('normal', 'ghost')).toBe(Effectiveness.DoubleResistance);
		expect(computeMoveEffectiveness('fire', 'water')).toBe(Effectiveness.Resistance);
	});

	it('multiplies both types for a dual-type target', () => {
		// Fire is super effective on both Grass and Steel.
		expect(computeMoveEffectiveness('fire', 'grass', 'steel')).toBeCloseTo(
			Effectiveness.Effective * Effectiveness.Effective
		);
	});
});

describe('pveDPS', () => {
	it('returns the fast-move DPS when the fast move generates no energy', () => {
		expect(pveDPS(100, 10, 1, 50, 0, 2)).toBe(10);
	});

	it('blends fast and charged damage over the rotation', () => {
		// 5s to charge, charged cycle = (100 + 10*5) / (5 + 1) = 25 DPS, beats the 10 DPS fast move.
		expect(pveDPS(100, 10, 1, 50, 10, 1)).toBeCloseTo(25);
	});
});

describe('calculateCP / calculateHP', () => {
	it('never drops below the game floor of 10', () => {
		expect(calculateCP(1, 0, 1, 0, 1, 0, 0)).toBe(10);
		expect(calculateHP(1, 0, 0)).toBe(10);
	});

	it('increases with IVs and with level', () => {
		const lowIv = calculateCP(150, 0, 150, 0, 150, 0, 78);
		const highIv = calculateCP(150, 15, 150, 15, 150, 15, 78);
		expect(highIv).toBeGreaterThan(lowIv);

		const lowLevel = calculateCP(150, 15, 150, 15, 150, 15, 40);
		const highLevel = calculateCP(150, 15, 150, 15, 150, 15, 78);
		expect(highLevel).toBeGreaterThan(lowLevel);
	});
});

describe('computeBestIVs', () => {
	// Azumarill-ish base stats.
	const ATK = 112;
	const DEF = 152;
	const STA = 225;

	it('ranks every one of the 4096 IV combinations when there is no CP cap', () => {
		const ranks = computeBestIVs(ATK, DEF, STA, Number.MAX_VALUE);
		const total = Object.values(ranks).reduce((sum, entries) => sum + entries.length, 0);
		expect(total).toBe(16 * 16 * 16);
	});

	it('keeps every entry under the league CP cap', () => {
		const ranks = computeBestIVs(ATK, DEF, STA, 1500);
		const entries = Object.values(ranks).flat();
		expect(entries.length).toBeGreaterThan(0);
		for (const entry of entries) {
			expect(entry.CP).toBeLessThanOrEqual(1500);
			expect(entry.L).toBeGreaterThanOrEqual(1);
			expect(entry.L).toBeLessThanOrEqual(MAX_LEVEL);
			expect(entry.IVs.A).toBeGreaterThanOrEqual(0);
			expect(entry.IVs.A).toBeLessThanOrEqual(15);
		}
	});

	it('orders buckets by descending rank key', () => {
		const keys = Object.keys(computeBestIVs(ATK, DEF, STA, 1500)).map(Number);
		const sorted = [...keys].sort((a, b) => b - a);
		expect(keys).toEqual(sorted);
	});
});

describe('shortName', () => {
	it('passes plain names through', () => {
		expect(shortName('Pikachu')).toBe('Pikachu');
	});

	it('abbreviates Primal and strips ordinary form suffixes', () => {
		expect(shortName('Kyogre (Primal)')).toBe('P. Kyogre');
		expect(shortName('Deoxys (Attack)')).toBe('Deoxys');
	});
});

describe('needsXLCandy', () => {
	const mon = (atk: number, def: number, hp: number): IGamemasterPokemon => {
		const partial = { baseStats: { atk, def, hp } };
		return partial as unknown as IGamemasterPokemon;
	};

	it('is false when there is no CP threshold', () => {
		expect(needsXLCandy(mon(300, 300, 300), 0)).toBe(false);
	});

	it('is false for a high-CP species and true for a low-CP one', () => {
		expect(needsXLCandy(mon(300, 300, 300), 1500)).toBe(false);
		expect(needsXLCandy(mon(40, 40, 40), 1500)).toBe(true);
	});
});
