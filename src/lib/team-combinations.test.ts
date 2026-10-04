import { describe, expect, it } from 'vitest';

import { exceedsNormalLevel, speciesFamilyKey, type TeamSlotDescriptor } from './team-analysis';
import { buildCombinations, comboSlots, type TeamRulesData } from './team-combinations';

const stats = { atk: 150, def: 150, hp: 150 };
const species = (extra: object = {}) => ({ isMega: false, isSuperMega: false, baseStats: stats, ...extra });

const gamemaster: TeamRulesData['gamemaster'] = {
	azumarill: species(),
	medicham: species(),
	registeel: species(),
	bulbasaur: species(),
	bulbasaur_shadow: species({ isShadow: true, nonShadowSpecies: 'bulbasaur' }),
	venusaur: species(),
	venusaur_mega: species({ isMega: true, isSuperMega: true, baseSpecies: 'venusaur' }),
	blastoise: species(),
	blastoise_mega: species({ isMega: true, baseSpecies: 'blastoise' }),
	charizard: species(),
	charizard_mega_x: species({ isMega: true, baseSpecies: 'charizard' }),
	charizard_mega_y: species({ isMega: true, baseSpecies: 'charizard' }),
};
const rankList = Object.fromEntries(Object.keys(gamemaster).map((id) => [id, {}]));
const move = { abbreviation: '', type: 'normal', power: 0, energy: 0, energyGain: 0, cooldown: 500, turns: 1 };
const data: TeamRulesData = { gamemaster, rankList, builder: { moves: { A: move, B: move, C: move }, ivs: {} } };

const moveset = ['A', 'B', 'C'];
const slot = (speciesId: string, extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
	speciesId,
	moveset,
	...extra,
});
const familyOf = (id: string) => speciesFamilyKey(id, (x) => gamemaster[x]);
const idsOf = (team: Array<TeamSlotDescriptor>) => team.map((s) => s.speciesId).sort();

/** Every rule of a team, written out the plain way — an oracle for `buildCombinations`. */
const isLegal = (team: Array<TeamSlotDescriptor>) =>
	new Set(team.map((s) => familyOf(s.speciesId))).size === 3 &&
	team.filter((s) => gamemaster[s.speciesId].isMega).length <= 1 &&
	team.filter((s) => exceedsNormalLevel(s)).length <= 1;

const brute = (slots: Array<TeamSlotDescriptor>) => {
	const out: Array<Array<TeamSlotDescriptor>> = [];
	for (let a = 0; a < slots.length; a++)
		for (let b = a + 1; b < slots.length; b++)
			for (let c = b + 1; c < slots.length; c++)
				if (isLegal([slots[a], slots[b], slots[c]])) out.push([slots[a], slots[b], slots[c]]);
	return out;
};

describe('buildCombinations', () => {
	it('makes every trio of distinct Pokémon', () => {
		const slots = ['azumarill', 'medicham', 'registeel', 'venusaur'].map((id) => slot(id));
		expect(buildCombinations(slots, data)).toHaveLength(4);
	});

	it('never puts a Shadow and its normal form on one team', () => {
		const slots = [slot('bulbasaur'), slot('bulbasaur_shadow'), slot('azumarill'), slot('medicham')];
		const teams = buildCombinations(slots, data);
		expect(teams).toHaveLength(2);
		for (const team of teams) expect(team.filter((s) => s.speciesId.startsWith('bulbasaur'))).toHaveLength(1);
	});

	it('never puts a Mega with its base form, or two Megas of one species, on one team', () => {
		const withBase = buildCombinations(
			[slot('venusaur'), slot('venusaur_mega'), slot('azumarill'), slot('medicham')],
			data
		);
		expect(withBase).toHaveLength(2);
		for (const team of withBase) expect(team.filter((s) => s.speciesId.startsWith('venusaur'))).toHaveLength(1);

		const twoMegas = buildCombinations(
			[slot('charizard_mega_x'), slot('charizard_mega_y'), slot('azumarill'), slot('medicham')],
			data
		);
		expect(twoMegas).toHaveLength(2);
	});

	it('never puts two Megas of different species on one team', () => {
		const teams = buildCombinations(
			[slot('venusaur_mega'), slot('blastoise_mega'), slot('azumarill'), slot('medicham')],
			data
		);
		expect(teams.map(idsOf)).toEqual([
			['azumarill', 'medicham', 'venusaur_mega'],
			['azumarill', 'blastoise_mega', 'medicham'],
		]);
	});

	it('never puts two Super Max Megas on one team, since both are Megas', () => {
		const teams = buildCombinations(
			[
				slot('venusaur_mega', { level: 52, superMega: true }),
				slot('charizard_mega_x', { level: 52, superMega: true }),
				slot('azumarill'),
			],
			data
		);
		expect(teams).toEqual([]);
	});

	it('never puts two Best Buddies above level 50 on one team', () => {
		const buddy = (id: string) => slot(id, { level: 51, buddy: true });
		expect(buildCombinations([buddy('azumarill'), buddy('medicham'), slot('registeel')], data)).toEqual([]);
		// a ribbon the level does not need is no second Best Buddy
		const quiet = slot('medicham', { level: 50, buddy: true });
		expect(buildCombinations([buddy('azumarill'), quiet, slot('registeel')], data)).toHaveLength(1);
	});

	it('leaves out builds the league cannot rate: unranked species and unknown moves', () => {
		const slots = [
			slot('azumarill'),
			slot('medicham'),
			slot('registeel', { moveset: ['A', 'B', 'NOPE'] }),
			slot('not_in_the_game'),
		];
		expect(buildCombinations(slots, data)).toEqual([]);
		expect(
			buildCombinations([...slots.slice(0, 2), slot('registeel', { moveset: ['A', 'none', 'none'] })], data)
		).toHaveLength(1);
		const unranked = { ...data, rankList: { azumarill: {}, medicham: {} } };
		expect(buildCombinations([slot('azumarill'), slot('medicham'), slot('registeel')], unranked)).toEqual([]);
	});

	it('returns nothing for fewer than three Pokémon', () => {
		expect(buildCombinations([], data)).toEqual([]);
		expect(buildCombinations([slot('azumarill'), slot('medicham')], data)).toEqual([]);
	});
});

describe('comboSlots with the stand-ins', () => {
	it('gives a plain Pokémon only itself', () => {
		expect(comboSlots({ speciesId: 'azumarill', moveset, level: 40 })).toEqual([slot('azumarill', { level: 40 })]);
	});

	it('gives a Best Buddy itself first, then its stand-ins', () => {
		const slots = comboSlots({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 51, buddy: true });
		expect(slots).toEqual([
			{ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 51, buddy: true },
			{ speciesId: 'azumarill', moveset, ivs: [0, 15, 15], level: 50, formerBuddy: true },
		]);
	});

	it('gives a Best Buddy Super Max Mega at level 53 itself and three stand-ins', () => {
		expect(comboSlots({ speciesId: 'venusaur_mega', moveset, level: 53, buddy: true, superMega: true })).toHaveLength(
			4
		);
	});

	it('lets a Best Buddy and a Super Max Mega share a team through their stand-ins', () => {
		// the buddy as it is, with the Super Max Mega taken down a level… and the other way round
		const slots = [
			...comboSlots({ speciesId: 'venusaur_mega', moveset, level: 53, buddy: true, superMega: true }),
			...comboSlots({ speciesId: 'azumarill', moveset }),
			...comboSlots({ speciesId: 'medicham', moveset, level: 51, buddy: true }),
		];
		const teams = buildCombinations(slots, data);
		// Venusaur Mega at 53 (B+S) and at 51 (B only) both need the ribbon, so neither fits with Medicham at 51
		expect(teams).toHaveLength(6);
		expect(teams.every(isLegal)).toBe(true);
		// every team has the three families, once
		for (const team of teams) expect(idsOf(team)).toEqual(['azumarill', 'medicham', 'venusaur_mega']);
		// the team of both statuses at once does not exist
		expect(
			teams.some((t) => t.some((s) => s.level === 53) && t.some((s) => s.level === 51 && s.speciesId === 'medicham'))
		).toBe(false);
		// but each of them is the buddy in some team
		expect(teams.some((t) => t.some((s) => s.speciesId === 'medicham' && s.level === 51))).toBe(true);
		expect(teams.some((t) => t.some((s) => s.speciesId === 'venusaur_mega' && s.level === 53))).toBe(true);
	});

	it('does not lose a Super Max Mega that is saved together with a Best Buddy of another family', () => {
		const slots = [
			...comboSlots({ speciesId: 'venusaur_mega', moveset, level: 52, superMega: true }),
			...comboSlots({ speciesId: 'azumarill', moveset, level: 51, buddy: true }),
			...comboSlots({ speciesId: 'registeel', moveset }),
		];
		// 2 variants of Venusaur Mega (52, 50) x 2 of Azumarill (51, 50) x Registeel, all legal: only one has an exceeding level
		expect(buildCombinations(slots, data)).toHaveLength(4);
	});
});

describe('a complex collection', () => {
	const collection = [
		{ speciesId: 'azumarill', moveset, level: 51, buddy: true as const },
		{ speciesId: 'azumarill', moveset, level: 40 },
		{ speciesId: 'medicham', moveset, level: 50.5, buddy: true as const },
		{ speciesId: 'registeel', moveset },
		{ speciesId: 'bulbasaur', moveset },
		{ speciesId: 'bulbasaur_shadow', moveset, level: 30 },
		{ speciesId: 'venusaur_mega', moveset, level: 53, buddy: true as const, superMega: true as const },
		{ speciesId: 'venusaur', moveset },
		{ speciesId: 'blastoise_mega', moveset },
		{ speciesId: 'charizard_mega_x', moveset },
		{ speciesId: 'charizard_mega_y', moveset },
		{ speciesId: 'charizard', moveset, level: 51 },
	];
	const slots = collection.flatMap(comboSlots);
	const teams = buildCombinations(slots, data);

	it('adds exactly the stand-ins the statuses call for', () => {
		// azumarill 51: 2 (itself + 1), azumarill 40: 1, medicham 50.5: 2, registeel: 1, bulbasaur: 1, shadow: 1,
		// venusaur mega 53: 4, venusaur: 1, blastoise mega: 1, charizard x: 1, y: 1, charizard 51: 2
		expect(slots).toHaveLength(2 + 1 + 2 + 1 + 1 + 1 + 4 + 1 + 1 + 1 + 1 + 2);
	});

	it('finds exactly the teams the rules allow', () => {
		expect(teams).toHaveLength(brute(slots).length);
		expect(teams.length).toBeGreaterThan(100);
	});

	it('only makes legal teams', () => {
		for (const team of teams) expect(isLegal(team), idsOf(team).join(' + ')).toBe(true);
	});

	it('has no team with two Megas, two Best Buddies, or one species twice', () => {
		for (const team of teams) {
			expect(team.filter((s) => gamemaster[s.speciesId].isMega).length).toBeLessThanOrEqual(1);
			expect(team.filter((s) => exceedsNormalLevel(s)).length).toBeLessThanOrEqual(1);
			expect(new Set(team.map((s) => familyOf(s.speciesId))).size).toBe(3);
		}
	});

	it('still has a team for each Mega, and for the Best Buddy without its ribbon', () => {
		const megaIds = ['venusaur_mega', 'blastoise_mega', 'charizard_mega_x', 'charizard_mega_y'];
		for (const id of megaIds)
			expect(
				teams.some((t) => t.some((s) => s.speciesId === id)),
				id
			).toBe(true);
		expect(teams.some((t) => t.some((s) => s.formerBuddy))).toBe(true);
		expect(teams.some((t) => t.some((s) => s.formerSuperMega))).toBe(true);
	});

	it('is the same whatever order the collection was saved in', () => {
		const reversed = buildCombinations([...slots].reverse(), data);
		expect(reversed).toHaveLength(teams.length);
	});
});
