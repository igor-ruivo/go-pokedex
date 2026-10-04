import { describe, expect, it } from 'vitest';

import type { TeamSlotDescriptor } from './team-analysis';
import type { TeamRulesData } from './team-combinations';
import { sanitizeTeam } from './team-sanitize';

const small = { atk: 50, def: 50, hp: 50 };
const huge = { atk: 300, def: 300, hp: 300 };
const species = (extra: object = {}) => ({ isMega: false, isSuperMega: false, baseStats: small, ...extra });

const gamemaster: TeamRulesData['gamemaster'] = {
	azumarill: species(),
	medicham: species(),
	registeel: species(),
	giant: species({ baseStats: huge }),
	charizard: species(),
	charizard_shadow: species({ isShadow: true, nonShadowSpecies: 'charizard' }),
	charizard_mega_x: species({ isMega: true, baseSpecies: 'charizard' }),
	venusaur_mega: species({ isMega: true, isSuperMega: true, baseSpecies: 'venusaur' }),
	blastoise_mega: species({ isMega: true, baseSpecies: 'blastoise' }),
};
const rankList = Object.fromEntries(Object.keys(gamemaster).map((id) => [id, {}]));
const move = { abbreviation: '', type: 'normal', power: 0, energy: 0, energyGain: 0, cooldown: 500, turns: 1 };
const data: TeamRulesData = { gamemaster, rankList, builder: { moves: { A: move, B: move, C: move }, ivs: {} } };
const GREAT = 1500;

const moveset = ['A', 'B', 'C'];
const slot = (speciesId: string, extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
	speciesId,
	moveset,
	...extra,
});
const clean = (slots: Array<TeamSlotDescriptor>) => sanitizeTeam(slots, data, GREAT);

describe('sanitizeTeam', () => {
	it('keeps a valid team as it is', () => {
		const team = [slot('azumarill'), slot('medicham', { ivs: [0, 15, 15], level: 40 }), slot('registeel')];
		expect(clean(team)).toEqual(team);
	});

	it('drops species the league does not rank, and moves that do not exist', () => {
		expect(clean([slot('not_ranked'), slot('azumarill'), slot('medicham', { moveset: ['A', 'B', 'NOPE'] })])).toEqual([
			slot('azumarill'),
		]);
		expect(clean([slot('azumarill', { moveset: ['A', 'none', 'none'] })])).toHaveLength(1);
	});

	it('keeps the first of a Pokémon fielded twice, whatever form the second is in', () => {
		expect(clean([slot('charizard'), slot('charizard_shadow'), slot('azumarill')]).map((s) => s.speciesId)).toEqual([
			'charizard',
			'azumarill',
		]);
		expect(clean([slot('charizard_shadow'), slot('charizard')]).map((s) => s.speciesId)).toEqual(['charizard_shadow']);
		expect(clean([slot('charizard'), slot('charizard_mega_x')]).map((s) => s.speciesId)).toEqual(['charizard']);
		expect(clean([slot('charizard_mega_x'), slot('charizard')]).map((s) => s.speciesId)).toEqual(['charizard_mega_x']);
	});

	it('keeps only one Mega, whatever the species', () => {
		expect(clean([slot('venusaur_mega'), slot('blastoise_mega'), slot('azumarill')]).map((s) => s.speciesId)).toEqual([
			'venusaur_mega',
			'azumarill',
		]);
		expect(
			clean([slot('azumarill'), slot('blastoise_mega'), slot('charizard_mega_x')]).map((s) => s.speciesId)
		).toEqual(['azumarill', 'blastoise_mega']);
	});

	it('keeps one Best Buddy: the next ones are plain Pokémon again, and lose a level above 50', () => {
		const result = clean([
			slot('azumarill', { level: 51, buddy: true }),
			slot('medicham', { level: 51, buddy: true }),
			slot('registeel', { level: 50.5 }),
		]);
		expect(result[0]).toEqual(slot('azumarill', { level: 51, buddy: true }));
		expect(result[1]).toEqual(slot('medicham'));
		expect(result[2]).toEqual(slot('registeel'));
	});

	it('gives the Super Max Mega status only to a species that can have it', () => {
		const result = clean([
			slot('azumarill', { superMega: true, level: 52 }),
			slot('venusaur_mega', { superMega: true }),
		]);
		expect(result[0]).toEqual(slot('azumarill'));
		expect(result[1]).toEqual(slot('venusaur_mega', { superMega: true }));
	});

	it('keeps a level only up to what the statuses allow', () => {
		const levelOf = (extra: Partial<TeamSlotDescriptor>, id = 'azumarill') => clean([slot(id, extra)])[0].level;
		expect(levelOf({ level: 50 })).toBe(50);
		// a level only a Best Buddy reaches makes it one (the first one), flagged or not
		expect(clean([slot('azumarill', { level: 50.5 })])[0]).toEqual(slot('azumarill', { level: 50.5, buddy: true }));
		expect(levelOf({ level: 51, buddy: true })).toBe(51);
		expect(levelOf({ level: 51.5, buddy: true })).toBeUndefined();
		expect(levelOf({ level: 52, superMega: true }, 'venusaur_mega')).toBe(52);
		// beyond a Super Max Mega's 52 only a Best Buddy reaches: it takes the ribbon
		expect(clean([slot('venusaur_mega', { level: 52.5, superMega: true })])[0]).toEqual(
			slot('venusaur_mega', { level: 52.5, superMega: true, buddy: true })
		);
		expect(levelOf({ level: 53, buddy: true, superMega: true }, 'venusaur_mega')).toBe(53);
		// 52 without the status of a Super Max Mega goes
		expect(levelOf({ level: 52 }, 'venusaur_mega')).toBeUndefined();
	});

	it('does not guess between the statuses for a level they could both explain', () => {
		// 50.5–52 on a Super Max Mega species with neither status written: the level goes, no status is switched on
		for (const level of [50.5, 51, 52]) {
			expect(clean([slot('venusaur_mega', { level })])[0], String(level)).toEqual(slot('venusaur_mega'));
		}
		// unless a status says which it is
		expect(clean([slot('venusaur_mega', { level: 51, superMega: true })])[0].level).toBe(51);
		expect(clean([slot('venusaur_mega', { level: 51, buddy: true })])[0]).toEqual(
			slot('venusaur_mega', { level: 51, buddy: true })
		);
		// a species that cannot be a Super Max Mega has only one way to reach 50.5: the Best Buddy
		expect(clean([slot('azumarill', { level: 50.5 })])[0]).toEqual(slot('azumarill', { level: 50.5, buddy: true }));
	});

	it('drops a level that would put the Pokémon over the CP cap with its IVs', () => {
		expect(clean([slot('giant', { ivs: [15, 15, 15], level: 40 })])[0].level).toBeUndefined();
		expect(clean([slot('azumarill', { ivs: [15, 15, 15], level: 40 })])[0].level).toBe(40);
		// the same level fits a bigger cap
		expect(sanitizeTeam([slot('giant', { ivs: [15, 15, 15], level: 40 })], data, 10000)[0].level).toBe(40);
	});

	it('keeps the IVs, moves and order of what it keeps', () => {
		const team = [slot('registeel', { ivs: [1, 2, 3] }), slot('azumarill'), slot('medicham')];
		expect(clean(team).map((s) => s.speciesId)).toEqual(['registeel', 'azumarill', 'medicham']);
		expect(clean(team)[0].ivs).toEqual([1, 2, 3]);
	});

	it('returns nothing for an empty link', () => {
		expect(clean([])).toEqual([]);
	});
});
