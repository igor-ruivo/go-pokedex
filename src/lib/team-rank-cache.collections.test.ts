import { describe, expect, it } from 'vitest';

import type { TeamBuilderData } from '../DTOs/ITeamBuilder';
import { highestLevelWithinCap } from './pvp-sim/cp';
import type { SlotIvs } from './team-analysis';
import { buildCombinations, buildComboPool, type TeamRulesData } from './team-combinations';
import { rankingSignature } from './team-rank-cache';

/**
 * The signature a ranking is cached under, for whole collections of saved Pokémon: the same collection must always give
 * the exact same signature (so a ranking is found again), and a different one a different signature (so a ranking is
 * never shown for a collection it was not computed from).
 */
const stats = { atk: 200, def: 200, hp: 200 };
const species = (extra: object = {}) => ({
	dex: 1,
	types: ['water'],
	isMega: false,
	isSuperMega: false,
	isShadow: false,
	baseStats: stats,
	...extra,
});
const gamemaster = {
	azumarill: species(),
	medicham: species({ types: ['fighting'] }),
	registeel: species({ types: ['steel'] }),
	bulbasaur: species(),
	bulbasaur_shadow: species({ isShadow: true, nonShadowSpecies: 'bulbasaur' }),
	venusaur_mega: species({ isMega: true, isSuperMega: true, baseSpecies: 'venusaur' }),
};
const rankList = {
	azumarill: { rank: 3 },
	medicham: { rank: 1 },
	registeel: { rank: 2 },
	bulbasaur: { rank: 4 },
	bulbasaur_shadow: { rank: 5 },
	venusaur_mega: { rank: 6 },
};
const builder = {
	simulator: { verified: true, changedSources: [], unknownMechanics: [] },
	moves: { A: {}, B: {}, C: {} },
	ivs: Object.fromEntries(Object.keys(gamemaster).map((id) => [id, { great: [20, 1, 15, 14] }])),
	forms: {},
	excludedThreats: [],
	meta: { great: [] },
} as unknown as TeamBuilderData;
const rules = { gamemaster, rankList, builder } as unknown as TeamRulesData & {
	rankList: Record<string, { rank: number }>;
};

const moveset = ['A', 'B', 'C'];
type Saved = {
	speciesId: string;
	moveset: Array<string>;
	ivs?: SlotIvs;
	level?: number;
	buddy?: true;
	superMega?: true;
};
const mon = (speciesId: string, extra: Partial<Saved> = {}): Saved => ({ speciesId, moveset, ...extra });

const signatureOf = (collection: ReadonlyArray<Saved>, league = 'great') => {
	const combinations = buildCombinations(buildComboPool(collection, league, rules), rules);
	return rankingSignature({ league, combinations, rankList, gamemaster, builder });
};

const base = [mon('azumarill'), mon('medicham'), mon('registeel'), mon('bulbasaur')];

describe('the same collection gives the exact same signature', () => {
	it('every time', () => {
		expect(signatureOf(base)).toBe(signatureOf(base));
		expect(signatureOf(base)).toBe(signatureOf(structuredClone(base)));
	});

	it('whatever order the Pokémon were saved in', () => {
		expect(signatureOf([...base].reverse())).toBe(signatureOf(base));
		expect(signatureOf([base[2], base[0], base[3], base[1]])).toBe(signatureOf(base));
	});

	it('when a Pokémon is saved twice, or its replica restates a default: they are one Pokémon', () => {
		const capLevel = highestLevelWithinCap(stats, [1, 15, 14], 1500);
		expect(signatureOf([...base, mon('azumarill')])).toBe(signatureOf(base));
		expect(signatureOf([...base, mon('azumarill', { ivs: [1, 15, 14], level: capLevel })])).toBe(signatureOf(base));
	});

	it('when a Best Buddy ribbon changes nothing about a Pokémon', () => {
		const withRibbon = [mon('azumarill', { level: 40, buddy: true }), ...base.slice(1)];
		const without = [mon('azumarill', { level: 40 }), ...base.slice(1)];
		// the ribbon stays on the member (its mark shows), so the two are not the same combinations…
		expect(signatureOf(withRibbon)).not.toBe(signatureOf(without));
		// …but the same collection, with the same ribbon, is
		expect(signatureOf(withRibbon)).toBe(signatureOf([...withRibbon]));
	});
});

describe('different collections give different signatures', () => {
	it('with another Pokémon in it, or one fewer', () => {
		expect(signatureOf([...base, mon('venusaur_mega')])).not.toBe(signatureOf(base));
		expect(signatureOf(base.slice(0, 3))).not.toBe(signatureOf(base));
	});

	it('with the same species but other moves, IVs or level', () => {
		const original = signatureOf(base);
		expect(signatureOf([mon('azumarill', { moveset: ['A', 'B', 'none'] }), ...base.slice(1)])).not.toBe(original);
		expect(signatureOf([mon('azumarill', { ivs: [0, 15, 15] }), ...base.slice(1)])).not.toBe(original);
		expect(signatureOf([mon('azumarill', { level: 30 }), ...base.slice(1)])).not.toBe(original);
	});

	it('with another copy of a species that differs from the first', () => {
		const withCopy = [...base, mon('azumarill', { ivs: [0, 15, 15] })];
		expect(signatureOf(withCopy)).not.toBe(signatureOf(base));
	});

	it('with a Best Buddy or a Super Max Mega, which add their stand-ins and marks', () => {
		const plain = [mon('azumarill', { level: 51 }), ...base.slice(1)];
		const buddy = [mon('azumarill', { level: 51, buddy: true }), ...base.slice(1)];
		const sup = [...base, mon('venusaur_mega', { level: 52, superMega: true })];
		const plainSup = [...base, mon('venusaur_mega', { level: 52 })];
		expect(signatureOf(buddy)).not.toBe(signatureOf(plain));
		expect(signatureOf(sup)).not.toBe(signatureOf(base));
		expect(signatureOf(sup)).not.toBe(signatureOf(plainSup));
	});

	it('with a Shadow instead of the normal form', () => {
		const normal = [mon('bulbasaur'), ...base.slice(0, 3)];
		const shadow = [mon('bulbasaur_shadow'), ...base.slice(0, 3)];
		expect(signatureOf(shadow)).not.toBe(signatureOf(normal));
	});

	it('for the same collection in another league', () => {
		expect(signatureOf(base, 'ultra')).not.toBe(signatureOf(base, 'great'));
		expect(signatureOf(base, 'mega-1500')).not.toBe(signatureOf(base, 'great'));
	});

	it('for every collection of a spread of them: no two of these collide', () => {
		const pool = [
			mon('azumarill'),
			mon('medicham'),
			mon('registeel'),
			mon('bulbasaur'),
			mon('azumarill', { ivs: [0, 15, 15] }),
			mon('medicham', { level: 30 }),
			mon('venusaur_mega', { level: 52, superMega: true }),
			mon('registeel', { level: 51, buddy: true }),
		];
		const signatures = new Map<string, string>();
		// every subset of the pool that makes at least one team
		for (let mask = 1; mask < 1 << pool.length; mask++) {
			const collection = pool.filter((_, i) => mask & (1 << i));
			const combinations = buildCombinations(buildComboPool(collection, 'great', rules), rules);
			if (combinations.length === 0) continue;
			const key = JSON.stringify(combinations);
			const signature = signatureOf(collection);
			const seen = signatures.get(signature);
			// two collections may share a signature only when they make exactly the same teams
			if (seen !== undefined) expect(seen).toBe(key);
			signatures.set(signature, key);
		}
		expect(signatures.size).toBeGreaterThan(50);
	});
});
