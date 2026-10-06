import { describe, expect, it } from 'vitest';

import {
	assignRoles,
	bulkPart,
	canonicalMoveset,
	decodeTeam,
	defenseProfile,
	encodeTeam,
	letterGrade,
	offenseProfile,
	SCORE_WEIGHTS,
	scoreTier,
	sharedTypes,
	slotIdentityKey,
	teamScore,
	threatPart,
} from './team-analysis';

describe('letterGrade', () => {
	it('follows PvPoke thresholds (90/80/70/60% of the goal)', () => {
		expect(letterGrade(90, 100)).toBe('A');
		expect(letterGrade(89.9, 100)).toBe('B');
		expect(letterGrade(70, 100)).toBe('C');
		expect(letterGrade(60, 100)).toBe('D');
		expect(letterGrade(59, 100)).toBe('F');
	});
});

describe('defenseProfile', () => {
	it('flags a weakness shared by two Pokémon that nobody resists as critical', () => {
		// Two Grass types and a Water type: Fire/Ice/Flying/Poison/Bug hit both Grass, only Grass resists Water.
		const profile = defenseProfile([['grass'], ['grass'], ['fighting']]);
		expect(profile.critical).toContain('fire');
		expect(profile.critical).not.toContain('water');
	});

	it('scores a well-rounded team above a stacked one', () => {
		const balanced = defenseProfile([
			['water', 'fairy'],
			['fighting', 'psychic'],
			['ground', 'steel'],
		]);
		const stacked = defenseProfile([['grass'], ['grass'], ['grass']]);
		expect(balanced.score).toBeGreaterThan(stacked.score);
	});
});

describe('offenseProfile', () => {
	it('finds types nothing hits for neutral damage', () => {
		// Fire and Grass moves only: nothing hits Dragon for neutral.
		expect(offenseProfile([['fire'], ['grass']]).blindSpots).toContain('dragon');
	});
});

describe('sharedTypes', () => {
	it('lists types held by more than one member, ignoring "none"', () => {
		expect(sharedTypes([['water', 'none'], ['water', 'fairy'], ['fairy']])).toEqual([
			{ type: 'water', members: [0, 1] },
			{ type: 'fairy', members: [1, 2] },
		]);
	});
});

describe('assignRoles', () => {
	it('places each Pokémon where the team gains the most, not where it is individually best', () => {
		const roles = assignRoles([
			{ lead: 90, switch: 60, closer: 92 },
			{ lead: 88, switch: 70, closer: 60 },
			{ lead: 50, switch: 95, closer: 90 },
		]);
		// 0 is best as closer (92), but 1 can't close, so 0 closes, 1 leads, 2 switches.
		expect(roles?.order).toEqual({ lead: 1, switch: 2, closer: 0 });
	});

	it('needs a full, fully-scored team', () => {
		expect(assignRoles([{ lead: 1, switch: 1, closer: 1 }])).toBeUndefined();
		expect(assignRoles([undefined, undefined, undefined])).toBeUndefined();
	});
});

describe('team score', () => {
	it('weights sum to one', () => {
		expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
	});

	it('waits for the simulated threat part', () => {
		expect(
			teamScore({ threat: undefined, defense: 80, offense: 80, bulk: 80, safety: 80, consistency: 80 })
		).toBeUndefined();
	});

	it('is the weighted mean of its parts', () => {
		expect(teamScore({ threat: 100, defense: 100, offense: 100, bulk: 100, safety: 100, consistency: 100 })).toBe(100);
		expect(teamScore({ threat: 0, defense: 0, offense: 0, bulk: 0, safety: 0, consistency: 0 })).toBe(0);
	});

	it('maps the threat score onto 0–100 between the anchors', () => {
		// anchored on what the best teams reach (560) and a hopeless team (800); beyond them it is clamped
		expect(threatPart(560)).toBe(100);
		expect(threatPart(450)).toBe(100);
		expect(threatPart(800)).toBe(0);
		expect(threatPart(1200)).toBe(0);
		expect(threatPart(680)).toBeCloseTo(50);
		expect(bulkPart('great', 16250)).toBeCloseTo(50);
		expect(bulkPart('great', 5000)).toBe(0);
	});

	it('bands the score into tiers', () => {
		expect(scoreTier(99)).toBe('elite');
		expect(scoreTier(90)).toBe('strong');
		expect(scoreTier(70)).toBe('solid');
		expect(scoreTier(50)).toBe('shaky');
		expect(scoreTier(10)).toBe('risky');
	});
});

describe('team links', () => {
	it('round-trips a team through its URL form', () => {
		const team = [
			{ speciesId: 'azumarill', moveset: ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'] },
			{ speciesId: 'ninetales_shadow', moveset: ['EMBER', 'WEATHER_BALL_FIRE'] },
		];
		expect(decodeTeam(encodeTeam(team))).toEqual(team);
	});

	it('ignores malformed entries and caps at three Pokémon', () => {
		expect(decodeTeam('a-B,broken,c-D-E,f-G-H,i-J-K,l-M-N')).toHaveLength(3);
		expect(decodeTeam(null)).toEqual([]);
	});
});

describe('canonicalMoveset / slotIdentityKey — the order of the Charged Moves is not part of who a Pokémon is', () => {
	it('keeps the Fast Move first and puts the Charged Moves in alphabetical order, without empty slots', () => {
		expect(canonicalMoveset(['COUNTER', 'POWER_UP_PUNCH', 'ICE_PUNCH'])).toEqual([
			'COUNTER',
			'ICE_PUNCH',
			'POWER_UP_PUNCH',
		]);
		expect(canonicalMoveset(['COUNTER', 'ICE_PUNCH', 'none'])).toEqual(['COUNTER', 'ICE_PUNCH']);
		expect(canonicalMoveset([])).toEqual([]);
	});

	it('is the same Pokémon with its Charged Moves arranged the other way, and another with another Fast Move', () => {
		const slot = (moveset: Array<string>) => ({ speciesId: 'medicham', moveset });
		expect(slotIdentityKey(slot(['COUNTER', 'POWER_UP_PUNCH', 'ICE_PUNCH']))).toBe(
			slotIdentityKey(slot(['COUNTER', 'ICE_PUNCH', 'POWER_UP_PUNCH']))
		);
		expect(slotIdentityKey(slot(['COUNTER', 'ICE_PUNCH']))).not.toBe(
			slotIdentityKey(slot(['PSYCHO_CUT', 'ICE_PUNCH']))
		);
	});

	it('leaves the key a link is made of in the order the player gave', () => {
		expect(encodeTeam([{ speciesId: 'medicham', moveset: ['COUNTER', 'POWER_UP_PUNCH', 'ICE_PUNCH'] }])).toBe(
			'medicham-COUNTER-POWER_UP_PUNCH-ICE_PUNCH'
		);
	});
});
