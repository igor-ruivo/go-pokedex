import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CollectionPokemon } from './pokemon-collection';

const KEY = 'go-pokedex:team-pokemon-collection';

/** A fresh copy of the module (its collection is module state) over a fake localStorage. */
const freshCollection = async (stored?: Array<Partial<CollectionPokemon>>) => {
	const storage = new Map<string, string>();
	if (stored) storage.set(KEY, JSON.stringify(stored));
	vi.stubGlobal('window', {
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => void storage.set(key, value),
		},
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	});
	vi.resetModules();
	const lib = await import('./pokemon-collection');
	const read = () => JSON.parse(storage.get(KEY) ?? '[]') as Array<CollectionPokemon>;
	return { ...lib, read };
};

const moveset = ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'];
const azumarill = { speciesId: 'azumarill', moveset };

describe('the Pokémon collection', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('saves a Pokémon with an id and a date, and persists it', async () => {
		const { saveCollectionPokemon, read } = await freshCollection();
		expect(saveCollectionPokemon('great', { ...azumarill, ivs: [0, 15, 15], level: 40 })).toBe(true);
		const [saved] = read();
		expect(saved).toMatchObject({ speciesId: 'azumarill', ivs: [0, 15, 15], level: 40, league: 'great' });
		expect(saved.id).toEqual(expect.any(String));
		expect(saved.addedAt).toBe(Date.parse('2026-10-04T12:00:00Z'));
	});

	describe('duplicates', () => {
		it('refuses an exact replica: same species, moves, IVs and level', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			const build = { ...azumarill, ivs: [0, 15, 15] as [number, number, number], level: 40 };
			expect(saveCollectionPokemon('great', build)).toBe(true);
			expect(saveCollectionPokemon('great', { ...build })).toBe(false);
			expect(read()).toHaveLength(1);
		});

		it('refuses a replica even with a nickname of its own', async () => {
			const { saveCollectionPokemon } = await freshCollection();
			expect(saveCollectionPokemon('great', { ...azumarill, nickname: 'One' })).toBe(true);
			expect(saveCollectionPokemon('great', { ...azumarill, nickname: 'Two' })).toBe(false);
		});

		it('does not count the Best Buddy and Super Max Mega statuses: they only matter through the level', async () => {
			const { saveCollectionPokemon } = await freshCollection();
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40 })).toBe(true);
			// the same build with a ribbon, or a Super Max Mega status, that changes no level is the same Pokémon
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40, buddy: true })).toBe(false);
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40, superMega: true })).toBe(false);
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40, buddy: true, superMega: true })).toBe(false);
		});

		it('allows the same Pokémon at a level only a status reaches: it is a different build', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			expect(saveCollectionPokemon('master', { ...azumarill, level: 50 })).toBe(true);
			expect(saveCollectionPokemon('master', { ...azumarill, level: 51, buddy: true })).toBe(true);
			expect(saveCollectionPokemon('master', { ...azumarill, level: 52, superMega: true })).toBe(true);
			expect(saveCollectionPokemon('master', { ...azumarill, level: 53, buddy: true, superMega: true })).toBe(true);
			expect(read()).toHaveLength(4);
		});

		it('allows a copy that differs in IVs, in level, in moves, or in species', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			expect(saveCollectionPokemon('great', { ...azumarill, ivs: [0, 15, 15], level: 40 })).toBe(true);
			expect(saveCollectionPokemon('great', { ...azumarill, ivs: [1, 15, 15], level: 40 })).toBe(true);
			expect(saveCollectionPokemon('great', { ...azumarill, ivs: [0, 15, 15], level: 41 })).toBe(true);
			expect(
				saveCollectionPokemon('great', {
					...azumarill,
					ivs: [0, 15, 15],
					level: 40,
					moveset: ['BUBBLE', 'ICE_BEAM', 'HYDRO_PUMP'],
				})
			).toBe(true);
			expect(saveCollectionPokemon('great', { speciesId: 'medicham', moveset, ivs: [0, 15, 15], level: 40 })).toBe(
				true
			);
			expect(read()).toHaveLength(5);
		});

		it('tells a copy with IVs from one without: the second follows the league’s best spread', async () => {
			const { saveCollectionPokemon } = await freshCollection();
			expect(saveCollectionPokemon('great', azumarill)).toBe(true);
			expect(saveCollectionPokemon('great', { ...azumarill, ivs: [0, 15, 15] })).toBe(true);
		});

		it('keeps each league’s collection apart', async () => {
			const { saveCollectionPokemon } = await freshCollection();
			expect(saveCollectionPokemon('great', azumarill)).toBe(true);
			expect(saveCollectionPokemon('ultra', azumarill)).toBe(true);
			expect(saveCollectionPokemon('great', azumarill)).toBe(false);
		});

		it('lets an entry be saved over itself, but not over another', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('great', { ...azumarill, level: 40 });
			saveCollectionPokemon('great', { ...azumarill, level: 41 });
			const [first, second] = read();
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40, nickname: 'Renamed' }, first.id)).toBe(true);
			expect(saveCollectionPokemon('great', { ...azumarill, level: 40 }, second.id)).toBe(false);
		});
	});

	describe('saving', () => {
		it('keeps the id, the date and the place of an entry it replaces', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('great', { ...azumarill, level: 40 });
			saveCollectionPokemon('great', { speciesId: 'medicham', moveset, level: 30 });
			const [first] = read();
			vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
			saveCollectionPokemon('great', { ...azumarill, level: 41, nickname: 'Edited' }, first.id);
			const after = read();
			expect(after[0]).toMatchObject({ id: first.id, level: 41, nickname: 'Edited', addedAt: first.addedAt });
			expect(after).toHaveLength(2);
			expect(after[1].speciesId).toBe('medicham');
		});

		it('trims a nickname to 32 characters and drops an empty one', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('great', { ...azumarill, level: 1, nickname: '  ' + 'x'.repeat(50) + '  ' });
			saveCollectionPokemon('great', { ...azumarill, level: 2, nickname: '   ' });
			const [long, empty] = read();
			expect(long.nickname).toBe('x'.repeat(32));
			expect(empty).not.toHaveProperty('nickname');
		});

		it('keeps the nickname with the build it was saved on: the same entry, the same IVs', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('great', { ...azumarill, ivs: [0, 15, 15], nickname: 'Azumarill #1' });
			expect(read()[0]).toMatchObject({ ivs: [0, 15, 15], nickname: 'Azumarill #1' });
		});

		it('stores the statuses as flags and leaves them out when off', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('master', { ...azumarill, level: 53, buddy: true, superMega: true });
			saveCollectionPokemon('master', { ...azumarill, level: 30 });
			const [both, plain] = read();
			expect(both).toMatchObject({ buddy: true, superMega: true });
			expect(plain).not.toHaveProperty('buddy');
			expect(plain).not.toHaveProperty('superMega');
		});

		it('does not keep a reference to the caller’s arrays', async () => {
			const { saveCollectionPokemon, read } = await freshCollection();
			const moves = [...moveset];
			saveCollectionPokemon('great', { speciesId: 'azumarill', moveset: moves });
			moves[0] = 'CHANGED';
			expect(read()[0].moveset).toEqual(moveset);
		});
	});

	describe('removing and loading', () => {
		it('removes one entry of one league', async () => {
			const { saveCollectionPokemon, removeCollectionPokemon, read } = await freshCollection();
			saveCollectionPokemon('great', azumarill);
			saveCollectionPokemon('ultra', azumarill);
			const [great] = read();
			removeCollectionPokemon('ultra', great.id);
			expect(read()).toHaveLength(2);
			removeCollectionPokemon('great', great.id);
			expect(read()).toHaveLength(1);
			expect(read()[0].league).toBe('ultra');
		});

		it('loads what was stored, with statuses and nicknames, and drops what is not a Pokémon', async () => {
			const stored = [
				{
					id: 'a',
					...azumarill,
					league: 'master',
					addedAt: 1,
					level: 53,
					buddy: true,
					superMega: true,
					nickname: 'Boss',
				},
				{ id: 'b', speciesId: 7, moveset, league: 'great', addedAt: 1 },
				{ id: 'c', ...azumarill, league: 5, addedAt: 1 },
				{ id: 'd', ...azumarill, league: 'great', addedAt: 1, level: 54 },
				{ id: 'e', ...azumarill, league: 'great', addedAt: 1, buddy: false },
			] as unknown as Array<Partial<CollectionPokemon>>;
			const { saveCollectionPokemon, read } = await freshCollection(stored);
			// loading happens on first use: a save brings the stored entries in
			saveCollectionPokemon('great', { speciesId: 'medicham', moveset });
			const entries = read();
			expect(entries.map((e) => e.id).slice(0, 1)).toEqual(['a']);
			expect(entries[0]).toMatchObject({ level: 53, buddy: true, superMega: true, nickname: 'Boss' });
			expect(entries).toHaveLength(2);
		});

		it('gives every entry its own id, even when stored ones clash', async () => {
			const stored = [
				{ id: 'same', ...azumarill, league: 'great', addedAt: 1, level: 10 },
				{ id: 'same', ...azumarill, league: 'great', addedAt: 1, level: 11 },
				{ ...azumarill, league: 'great', addedAt: 1, level: 12 },
			] as Array<Partial<CollectionPokemon>>;
			const { saveCollectionPokemon, read } = await freshCollection(stored);
			saveCollectionPokemon('great', { speciesId: 'medicham', moveset });
			const ids = read().map((e) => e.id);
			expect(new Set(ids).size).toBe(ids.length);
			expect(ids[0]).toBe('same');
		});
	});
});
