import { describe, expect, it } from 'vitest';

import {
	decodeTeam,
	defenseProfile,
	encodeTeam,
	evaluationKey,
	exceedsNormalLevel,
	isBuddy,
	isSlotLevel,
	maxLevelOf,
	offenseProfile,
	respectsStatusLimits,
	slotIdentityKey,
	slotKey,
	speciesFamilyKey,
	standInsOf,
	type TeamSlotDescriptor,
	teamWarnings,
} from './team-analysis';

describe('levels', () => {
	it('adds one level for a Best Buddy and two for a Super Max Mega', () => {
		expect(maxLevelOf({})).toBe(50);
		expect(maxLevelOf({ buddy: true })).toBe(51);
		expect(maxLevelOf({ superMega: true })).toBe(52);
		expect(maxLevelOf({ buddy: true, superMega: true })).toBe(53);
	});

	it('exceeds the normal level only beyond what the Super Max Mega status alone reaches', () => {
		expect(exceedsNormalLevel({ level: 50 })).toBe(false);
		expect(exceedsNormalLevel({ level: 50.5 })).toBe(true);
		expect(exceedsNormalLevel({ level: 52, superMega: true })).toBe(false);
		expect(exceedsNormalLevel({ level: 52.5, superMega: true })).toBe(true);
		expect(exceedsNormalLevel({})).toBe(false);
	});

	it('calls a Pokémon a Best Buddy when flagged, or when its level can only be reached as one', () => {
		expect(isBuddy({ buddy: true })).toBe(true);
		expect(isBuddy({ level: 51 })).toBe(true);
		expect(isBuddy({ level: 51, superMega: true })).toBe(false);
		expect(isBuddy({ level: 53, superMega: true })).toBe(true);
		expect(isBuddy({ level: 50 })).toBe(false);
	});

	it('accepts levels from 1 to 53 in half steps', () => {
		for (const ok of [1, 20.5, 50, 51, 52.5, 53]) expect(isSlotLevel(ok), String(ok)).toBe(true);
		for (const bad of [0.5, 0, 53.5, 50.25, NaN, '50', undefined]) expect(isSlotLevel(bad), String(bad)).toBe(false);
	});
});

describe('standInsOf', () => {
	const base = { speciesId: 'melmetal', moveset: ['THUNDER_SHOCK', 'SUPER_POWER', 'ROCK_SLIDE'] };

	it('gives a Pokémon with no status, or no level, no stand-in', () => {
		expect(standInsOf({ ...base, level: 40 })).toEqual([]);
		expect(standInsOf({ ...base, buddy: true })).toEqual([]);
		expect(standInsOf({ ...base, superMega: true })).toEqual([]);
		expect(standInsOf(base)).toEqual([]);
	});

	it('gives a Best Buddy above level 50 one stand-in, a level lower and marked as a former buddy', () => {
		expect(standInsOf({ ...base, ivs: [0, 15, 14], level: 51, buddy: true })).toEqual([
			{ ...base, ivs: [0, 15, 14], level: 50, formerBuddy: true },
		]);
		expect(standInsOf({ ...base, level: 50.5, buddy: true })).toEqual([{ ...base, level: 49.5, formerBuddy: true }]);
		// a level only a Best Buddy reaches implies the ribbon, flagged or not
		expect(standInsOf({ ...base, level: 51 })).toEqual([{ ...base, level: 50, formerBuddy: true }]);
	});

	it('gives a Best Buddy that does not need the ribbon no stand-in', () => {
		expect(standInsOf({ ...base, level: 50, buddy: true })).toEqual([]);
		expect(standInsOf({ ...base, level: 30, buddy: true })).toEqual([]);
	});

	it('gives a Super Max Mega above level 50 one stand-in, two levels lower and marked as a former Super Max Mega', () => {
		expect(standInsOf({ ...base, level: 52, superMega: true })).toEqual([
			{ ...base, level: 50, formerSuperMega: true },
		]);
		expect(standInsOf({ ...base, level: 51, superMega: true })).toEqual([
			{ ...base, level: 49, formerSuperMega: true },
		]);
		expect(standInsOf({ ...base, level: 50.5, superMega: true })).toEqual([
			{ ...base, level: 48.5, formerSuperMega: true },
		]);
	});

	it('gives a Super Max Mega at level 50 or less no stand-in', () => {
		expect(standInsOf({ ...base, level: 50, superMega: true })).toEqual([]);
		expect(standInsOf({ ...base, level: 12.5, superMega: true })).toEqual([]);
		expect(standInsOf({ ...base, level: 1.5, superMega: true })).toEqual([]);
	});

	it('gives a Best Buddy Super Max Mega at level 53 three stand-ins', () => {
		const standIns = standInsOf({ ...base, ivs: [1, 2, 3], level: 53, buddy: true, superMega: true });
		expect(standIns).toHaveLength(3);
		expect(standIns).toContainEqual({ ...base, ivs: [1, 2, 3], level: 51, buddy: true, formerSuperMega: true });
		expect(standIns).toContainEqual({ ...base, ivs: [1, 2, 3], level: 52, superMega: true, formerBuddy: true });
		expect(standIns).toContainEqual({
			...base,
			ivs: [1, 2, 3],
			level: 50,
			formerBuddy: true,
			formerSuperMega: true,
		});
	});

	it('skips a stand-in that would be identical to the Pokémon itself', () => {
		// at 52 the ribbon adds nothing to a Super Max Mega: the "Super Max Mega only" stand-in would still be level 52
		const standIns = standInsOf({ ...base, level: 52, buddy: true, superMega: true });
		expect(standIns).toHaveLength(2);
		expect(standIns).toContainEqual({ ...base, level: 50, buddy: true, formerSuperMega: true });
		expect(standIns).toContainEqual({ ...base, level: 49, formerBuddy: true, formerSuperMega: true });
		// at 51 only "neither" is a different Pokémon
		expect(standInsOf({ ...base, level: 51, buddy: true, superMega: true })).toEqual([
			{ ...base, level: 48, formerBuddy: true, formerSuperMega: true },
		]);
	});

	it('keeps the moves and IVs, never changes its input, and never goes below level 1', () => {
		const slot: TeamSlotDescriptor = { ...base, ivs: [3, 3, 3], level: 53, buddy: true, superMega: true };
		const copy = structuredClone(slot);
		const standIns = standInsOf(slot);
		expect(slot).toEqual(copy);
		for (const standIn of standIns) {
			expect(standIn.moveset).toEqual(base.moveset);
			expect(standIn.ivs).toEqual([3, 3, 3]);
			expect(standIn.level).toBeGreaterThanOrEqual(1);
		}
	});

	it('does not make the stand-in marks part of the identity', () => {
		const slot: TeamSlotDescriptor = { ...base, level: 53, buddy: true, superMega: true };
		const standIn = standInsOf(slot).find((s) => s.formerBuddy && s.formerSuperMega)!;
		expect(slotIdentityKey(standIn)).toBe(slotIdentityKey({ ...base, level: 50 }));
		expect(slotIdentityKey(slot)).toBe(slotIdentityKey({ ...base, level: 53 }));
	});
});

describe('speciesFamilyKey', () => {
	const info: Record<string, { nonShadowSpecies?: string; baseSpecies?: string; isShadow?: boolean }> = {
		charizard: {},
		charizard_shadow: { nonShadowSpecies: 'charizard', isShadow: true },
		charizard_mega_x: { baseSpecies: 'charizard' },
		charizard_mega_y: { baseSpecies: 'charizard' },
		azumarill: {},
		trimmed_shadow: { isShadow: true },
	};
	const key = (id: string) => speciesFamilyKey(id, (x) => info[x]);

	it('counts a Shadow, its normal form and every Mega of it as one species', () => {
		const keys = ['charizard', 'charizard_shadow', 'charizard_mega_x', 'charizard_mega_y'].map(key);
		expect(new Set(keys)).toEqual(new Set(['charizard']));
	});

	it('keeps different species apart', () => {
		expect(key('azumarill')).not.toBe(key('charizard'));
	});

	it('treats a Shadow whose relation is not recorded as its id without the suffix', () => {
		expect(key('trimmed_shadow')).toBe('trimmed');
	});

	it('leaves an unknown species as itself', () => {
		expect(key('missingno')).toBe('missingno');
	});
});

describe('respectsStatusLimits', () => {
	const megas = new Set(['venusaur_mega', 'blastoise_mega', 'charizard_mega_x']);
	const isMega = (id: string) => megas.has(id);
	const slot = (speciesId: string, extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
		speciesId,
		moveset: ['A', 'B', 'C'],
		...extra,
	});

	it('allows a team with no Mega, or with exactly one', () => {
		expect(respectsStatusLimits([slot('azumarill'), slot('medicham'), slot('registeel')], isMega)).toBe(true);
		expect(respectsStatusLimits([slot('azumarill'), slot('venusaur_mega'), slot('registeel')], isMega)).toBe(true);
	});

	it('refuses two Megas, whatever their species, Super Max Mega or not', () => {
		expect(respectsStatusLimits([slot('venusaur_mega'), slot('blastoise_mega'), slot('registeel')], isMega)).toBe(
			false
		);
		expect(
			respectsStatusLimits(
				[slot('venusaur_mega', { superMega: true, level: 52 }), slot('charizard_mega_x'), slot('registeel')],
				isMega
			)
		).toBe(false);
	});

	it('refuses two Best Buddies, but not a Best Buddy whose level does not need the ribbon', () => {
		const buddy = (id: string) => slot(id, { level: 51, buddy: true });
		expect(respectsStatusLimits([buddy('azumarill'), buddy('medicham'), slot('registeel')], isMega)).toBe(false);
		expect(
			respectsStatusLimits(
				[buddy('azumarill'), slot('medicham', { level: 50, buddy: true }), slot('registeel')],
				isMega
			)
		).toBe(true);
	});
});

describe('duplicate-species warning', () => {
	const gm: Record<string, { nonShadowSpecies?: string; baseSpecies?: string }> = {
		charizard_shadow: { nonShadowSpecies: 'charizard' },
		charizard_mega_x: { baseSpecies: 'charizard' },
		charizard_mega_y: { baseSpecies: 'charizard' },
	};
	const duplicates = (speciesIds: Array<string>) => {
		const memberTypes = speciesIds.map(() => ['water']);
		return teamWarnings({
			speciesIds,
			familyOf: (id) => speciesFamilyKey(id, (x) => gm[x]),
			memberTypes,
			defense: defenseProfile(memberTypes),
			offense: offenseProfile(memberTypes),
			bulks: [],
			consistencies: [],
			roleScores: [],
			league: 'great',
		}).filter((w) => w.kind === 'duplicateSpecies');
	};

	it('flags a Shadow with its normal form, a Mega with its base form, and two Megas of one species', () => {
		expect(duplicates(['charizard', 'charizard_shadow', 'azumarill'])).toEqual([
			{ kind: 'duplicateSpecies', members: [0, 1] },
		]);
		expect(duplicates(['azumarill', 'charizard', 'charizard_mega_x'])).toEqual([
			{ kind: 'duplicateSpecies', members: [1, 2] },
		]);
		expect(duplicates(['charizard_mega_x', 'charizard_mega_y', 'azumarill'])).toEqual([
			{ kind: 'duplicateSpecies', members: [0, 1] },
		]);
	});

	it('does not flag different species', () => {
		expect(duplicates(['charizard', 'azumarill', 'medicham'])).toEqual([]);
	});
});

describe('team links and statuses', () => {
	const moves = ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'];

	it('round-trips a Best Buddy, a Super Max Mega and both, with IVs and level', () => {
		const team: Array<TeamSlotDescriptor> = [
			{ speciesId: 'azumarill', moveset: moves, ivs: [0, 15, 14], level: 51, buddy: true },
			{ speciesId: 'venusaur_mega', moveset: moves, level: 52, superMega: true },
			{ speciesId: 'melmetal', moveset: moves, level: 53, buddy: true, superMega: true },
		];
		expect(decodeTeam(encodeTeam(team))).toEqual(team);
	});

	it('keeps the statuses in the link but out of the identity', () => {
		const plain: TeamSlotDescriptor = { speciesId: 'melmetal', moveset: moves, level: 52 };
		const flagged: TeamSlotDescriptor = { ...plain, buddy: true, superMega: true };
		expect(slotKey(flagged)).toBe(`${slotKey(plain)}@B@S`);
		expect(slotIdentityKey(flagged)).toBe(slotIdentityKey(plain));
		expect(evaluationKey([flagged])).toBe(evaluationKey([plain]));
	});

	it('refuses levels outside 1–53 and in odd steps', () => {
		expect(decodeTeam('a-B-C-D@L54')[0]).not.toHaveProperty('level');
		expect(decodeTeam('a-B-C-D@L50.3')[0]).not.toHaveProperty('level');
		expect(decodeTeam('a-B-C-D@L53')[0]).toHaveProperty('level', 53);
	});
});
