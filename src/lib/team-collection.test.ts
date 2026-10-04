import { describe, expect, it } from 'vitest';

import { type CanonicalData, isDuplicateBuild } from './canonical-slot';
import { highestLevelWithinCap } from './pvp-sim/cp';
import { slotIdentityKey, type SlotIvs, type TeamSlotDescriptor } from './team-analysis';
import { nicknamesByBuild } from './team-build';
import { buildCombinations, buildComboPool, comboSlots, type TeamRulesData } from './team-combinations';

/**
 * What the "best teams from my collection" ranker works with: duplicates of a species are fine as long as they differ,
 * never together on a team, and every team shows the nickname of the entry it was built from.
 */
const stats = { atk: 200, def: 200, hp: 200 };
const species = (extra: object = {}) => ({ isMega: false, isSuperMega: false, baseStats: stats, ...extra });
const gamemaster: TeamRulesData['gamemaster'] = {
	azumarill: species(),
	medicham: species(),
	registeel: species(),
	venusaur_mega: species({ isMega: true, isSuperMega: true, baseSpecies: 'venusaur' }),
};
const ranks = { azumarill: 3, medicham: 1, registeel: 2, venusaur_mega: 4 };
const rankList = Object.fromEntries(Object.entries(ranks).map(([id, rank]) => [id, { rank }]));
const bestIvs: Record<string, [number, number, number, number]> = {
	azumarill: [20, 1, 15, 14],
	medicham: [20, 5, 15, 15],
	registeel: [20, 0, 15, 15],
	venusaur_mega: [20, 15, 15, 15],
};
const builder = {
	moves: { A: {}, B: {}, C: {} },
	ivs: Object.fromEntries(Object.entries(bestIvs).map(([id, spread]) => [id, { great: spread }])),
} as unknown as TeamRulesData['builder'];
const data: TeamRulesData & CanonicalData & { rankList: Record<string, { rank: number }> } = {
	gamemaster,
	rankList,
	builder,
};

const moveset = ['A', 'B', 'C'];
const entry = (speciesId: string, extra: object = {}, id = `${speciesId}-${JSON.stringify(extra)}`) => ({
	id,
	speciesId,
	moveset,
	...extra,
});
const capLevel = highestLevelWithinCap(stats, [1, 15, 14], 1500);

describe('isDuplicateBuild — what makes a Pokémon a duplicate in the collection', () => {
	const saved = [entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, level: 40 }, 'a1')];
	const check = (slot: TeamSlotDescriptor, ownId?: string) => isDuplicateBuild(slot, saved, ownId, 'great', data);

	it('is an exact replica: species, moves, IVs and level', () => {
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 40 })).toBe(true);
	});

	it('is not a copy that differs in anything of those', () => {
		expect(check({ speciesId: 'azumarill', moveset, ivs: [1, 15, 15], level: 40 })).toBe(false);
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 41 })).toBe(false);
		expect(check({ speciesId: 'azumarill', moveset: ['A', 'B', 'none'], ivs: [0, 15, 15], level: 40 })).toBe(false);
		expect(check({ speciesId: 'medicham', moveset, ivs: [0, 15, 15], level: 40 })).toBe(false);
	});

	it('ignores the Best Buddy and Super Max Mega statuses: only the level they allow counts', () => {
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 40, buddy: true })).toBe(true);
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 40, superMega: true })).toBe(true);
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 51, buddy: true })).toBe(false);
	});

	it('does not count the entry being edited as a replica of itself', () => {
		expect(check({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 40 }, 'a1')).toBe(false);
	});

	it('counts picks that only restate a default as the default: best IVs and the cap’s own level', () => {
		const plain = [entry('azumarill', {}, 'p')];
		const restated: TeamSlotDescriptor = { speciesId: 'azumarill', moveset, ivs: [1, 15, 14], level: capLevel };
		expect(isDuplicateBuild(restated, plain, undefined, 'great', data)).toBe(true);
		expect(isDuplicateBuild({ ...restated, level: capLevel - 1 }, plain, undefined, 'great', data)).toBe(false);
	});

	it('counts a Best Buddy brought back to the defaults as the plain Pokémon', () => {
		const plain = [entry('azumarill', {}, 'p')];
		expect(
			isDuplicateBuild(
				{ speciesId: 'azumarill', moveset, level: capLevel, buddy: true },
				plain,
				undefined,
				'great',
				data
			)
		).toBe(true);
	});
});

describe('the pool and the teams of a collection with duplicate species', () => {
	const azuTank = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs });
	const azuGlass = entry('azumarill', { ivs: [10, 10, 10] as SlotIvs });
	const med = entry('medicham', {});
	const reg = entry('registeel', {});

	it('keeps two copies of a species that differ, and makes a team with each but never with both', () => {
		const pool = buildComboPool([azuTank, azuGlass, med, reg], 'great', data);
		expect(pool).toHaveLength(4);
		const teams = buildCombinations(pool, data);
		expect(teams).toHaveLength(2);
		for (const team of teams) expect(team.filter((s) => s.speciesId === 'azumarill')).toHaveLength(1);
		const azuIvs = teams.map((t) => t.find((s) => s.speciesId === 'azumarill')!.ivs);
		expect(azuIvs).toContainEqual([0, 15, 15]);
		expect(azuIvs).toContainEqual([10, 10, 10]);
	});

	it('counts identical copies once', () => {
		const pool = buildComboPool([azuTank, { ...azuTank, id: 'again' }, med, reg], 'great', data);
		expect(pool.filter((s) => s.speciesId === 'azumarill')).toHaveLength(1);
		expect(buildCombinations(pool, data)).toHaveLength(1);
	});

	it('counts copies that only restate a default as one', () => {
		const plain = entry('azumarill', {});
		const restated = entry('azumarill', { ivs: [1, 15, 14] as SlotIvs, level: capLevel });
		const pool = buildComboPool([plain, restated, med, reg], 'great', data);
		expect(pool.filter((s) => s.speciesId === 'azumarill')).toHaveLength(1);
	});

	it('orders the pool by the ranking of the species', () => {
		const pool = buildComboPool([azuTank, med, reg], 'great', data);
		expect(pool.map((s) => s.speciesId)).toEqual(['medicham', 'registeel', 'azumarill']);
	});

	it('makes a team for a copy and its stand-in, and for a Best Buddy copy and a plain copy of another build', () => {
		const buddy = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, level: 51, buddy: true });
		const buddy2 = entry('medicham', { level: 51, buddy: true });
		const pool = buildComboPool([buddy, buddy2, reg], 'great', data);
		// azumarill: 51 and its stand-in at 50; medicham the same; one team per pair of variants except both buddies
		expect(buildCombinations(pool, data)).toHaveLength(3);
	});

	it('keeps the stand-in when a copy identical to it was also saved by hand', () => {
		const buddy = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, level: 51, buddy: true });
		const byHand = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, level: 50 });
		const pool = buildComboPool([byHand, buddy], 'great', data).filter((s) => s.speciesId === 'azumarill');
		expect(pool).toHaveLength(2);
		const at50 = pool.find((s) => s.level === 50)!;
		expect(at50.formerBuddy).toBe(true);
	});
});

describe('teams honour the nickname of the entry they were built from', () => {
	const tank = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, nickname: 'Tank #1' });
	const glass = entry('azumarill', { ivs: [10, 10, 10] as SlotIvs, nickname: 'Glass #40' });
	const med = entry('medicham', {});
	const reg = entry('registeel', {});
	const saved = [tank, glass, med, reg];
	const names = nicknamesByBuild(saved, comboSlots);

	it('shows each copy of a species with its own nickname on every team it is in', () => {
		const teams = buildCombinations(buildComboPool(saved, 'great', data), data);
		const shown = teams.map((team) => {
			const azu = team.find((s) => s.speciesId === 'azumarill')!;
			return names[slotIdentityKey(azu)];
		});
		expect(shown.sort()).toEqual(['Glass #40', 'Tank #1']);
	});

	it('shows no nickname for a Pokémon that has none, so the card falls back to its name', () => {
		expect(names[slotIdentityKey({ speciesId: 'medicham', moveset })]).toBeUndefined();
	});

	it('gives the stand-ins of a nicknamed Best Buddy its nickname', () => {
		const buddy = entry('azumarill', { ivs: [0, 15, 15] as SlotIvs, level: 51, buddy: true, nickname: 'Buddy' });
		const byName = nicknamesByBuild([buddy], comboSlots);
		for (const variant of comboSlots(buddy)) expect(byName[slotIdentityKey(variant)]).toBe('Buddy');
	});

	it('keeps the nickname tied to the build, not the id: changing the IVs is another build', () => {
		const edited = { ...tank, ivs: [1, 15, 15] as SlotIvs };
		const byName = nicknamesByBuild([edited]);
		expect(byName[slotIdentityKey(tank)]).toBeUndefined();
		expect(byName[slotIdentityKey(edited)]).toBe('Tank #1');
	});
});
