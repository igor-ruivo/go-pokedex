import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RankedTeam, TeamBuilderData } from '../DTOs/ITeamBuilder';
import type { TeamSlotDescriptor } from './team-analysis';
import {
	hashSignature,
	isRankedTeam,
	RANK_CACHE_VERSION,
	rankCacheKey,
	rankingSignature,
	readRankedCache,
	writeRankedCache,
} from './team-rank-cache';

/** A fake sessionStorage, with a switch to make it refuse writes like a full or blocked one. */
const fakeSession = () => {
	const store = new Map<string, string>();
	const session = {
		failWrites: false,
		failReads: false,
		getItem: (key: string) => {
			if (session.failReads) throw new Error('blocked');
			return store.get(key) ?? null;
		},
		setItem: (key: string, value: string) => {
			if (session.failWrites) throw new Error('quota');
			store.set(key, value);
		},
	};
	vi.stubGlobal('window', { sessionStorage: session });
	return { store, session };
};

const moveset = ['A', 'B', 'C'];
const team = (extra: Partial<RankedTeam> = {}): RankedTeam => ({
	members: [
		{ speciesId: 'azumarill', moveset },
		{ speciesId: 'medicham', moveset, ivs: [0, 15, 15], level: 51, buddy: true },
		{ speciesId: 'venusaur_mega', moveset, level: 53, buddy: true, superMega: true, formerSuperMega: true },
	],
	score: 82.4,
	tier: 'strong',
	threatScore: 512,
	...extra,
});

describe('rankCacheKey', () => {
	it('keeps one entry per league, under a versioned key', () => {
		expect(rankCacheKey('great')).toBe(`go-pokedex:collection-team-rank:v${RANK_CACHE_VERSION}:great`);
		expect(rankCacheKey('ultra')).not.toBe(rankCacheKey('great'));
		expect(rankCacheKey('mega-1500')).toBe(`go-pokedex:collection-team-rank:v${RANK_CACHE_VERSION}:mega-1500`);
	});

	it('is the format version that makes an old entry unreachable', () => {
		expect(rankCacheKey('great')).toContain(`:v${RANK_CACHE_VERSION}:`);
	});
});

describe('the ranking kept in the session', () => {
	beforeEach(() => void fakeSession());
	afterEach(() => vi.unstubAllGlobals());

	it('gives back what was written, with every member’s build and marks', () => {
		const teams = [team(), team({ score: 70, tier: 'solid', threatScore: 600 })];
		writeRankedCache('great', 'sig', teams);
		const read = readRankedCache('great', 'sig');
		expect(read).toEqual(teams);
		expect(read![0].members[1]).toMatchObject({ ivs: [0, 15, 15], level: 51, buddy: true });
		expect(read![0].members[2]).toMatchObject({ level: 53, buddy: true, superMega: true, formerSuperMega: true });
	});

	it('keeps the order of the teams', () => {
		const teams = [team({ score: 90 }), team({ score: 80 }), team({ score: 70 })];
		writeRankedCache('great', 'sig', teams);
		expect(readRankedCache('great', 'sig')!.map((t) => t.score)).toEqual([90, 80, 70]);
	});

	it('keeps each league apart', () => {
		writeRankedCache('great', 'sig-great', [team({ score: 11 })]);
		writeRankedCache('ultra', 'sig-ultra', [team({ score: 22 })]);
		writeRankedCache('mega-1500', 'sig-mega', [team({ score: 33 })]);
		expect(readRankedCache('great', 'sig-great')![0].score).toBe(11);
		expect(readRankedCache('ultra', 'sig-ultra')![0].score).toBe(22);
		expect(readRankedCache('mega-1500', 'sig-mega')![0].score).toBe(33);
		// a league does not read another’s entry, even with its signature
		expect(readRankedCache('great', 'sig-ultra')).toBeUndefined();
		expect(readRankedCache('master', 'sig-great')).toBeUndefined();
	});

	it('is a miss when the signature differs: the inputs changed', () => {
		writeRankedCache('great', 'old', [team()]);
		expect(readRankedCache('great', 'new')).toBeUndefined();
	});

	it('replaces what the league had', () => {
		writeRankedCache('great', 'one', [team({ score: 1 })]);
		writeRankedCache('great', 'two', [team({ score: 2 })]);
		expect(readRankedCache('great', 'one')).toBeUndefined();
		expect(readRankedCache('great', 'two')![0].score).toBe(2);
	});

	it('is a miss with nothing stored', () => {
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('can keep an empty ranking: a collection with no possible team is not recomputed either', () => {
		writeRankedCache('great', 'sig', []);
		expect(readRankedCache('great', 'sig')).toEqual([]);
	});

	it('is a miss for an entry that is not JSON, not an object, or has no teams', () => {
		const { store } = fakeSession();
		store.set(rankCacheKey('great'), '{not json');
		expect(readRankedCache('great', 'sig')).toBeUndefined();
		store.set(rankCacheKey('great'), '"text"');
		expect(readRankedCache('great', 'sig')).toBeUndefined();
		store.set(rankCacheKey('great'), 'null');
		expect(readRankedCache('great', 'sig')).toBeUndefined();
		store.set(rankCacheKey('great'), JSON.stringify({ signature: 'sig' }));
		expect(readRankedCache('great', 'sig')).toBeUndefined();
		store.set(rankCacheKey('great'), JSON.stringify({ signature: 'sig', teams: 'nope' }));
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('is a miss when any stored team is not a team: it never half-loads', () => {
		const { store } = fakeSession();
		store.set(rankCacheKey('great'), JSON.stringify({ signature: 'sig', teams: [team(), { score: 'high' }] }));
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('is a miss from an older format version, which is stored under another key', () => {
		const { store } = fakeSession();
		store.set(
			`go-pokedex:collection-team-rank:v${RANK_CACHE_VERSION - 1}:great`,
			JSON.stringify({ signature: 'sig', teams: [team()] })
		);
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('does not break when storage refuses reads or writes', () => {
		const { session } = fakeSession();
		session.failWrites = true;
		expect(() => writeRankedCache('great', 'sig', [team()])).not.toThrow();
		session.failWrites = false;
		writeRankedCache('great', 'sig', [team()]);
		session.failReads = true;
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('does not break when there is no sessionStorage at all', () => {
		vi.stubGlobal('window', {});
		expect(() => writeRankedCache('great', 'sig', [team()])).not.toThrow();
		expect(readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('stores under the league’s key, as JSON with the signature next to the teams', () => {
		const { store } = fakeSession();
		writeRankedCache('great', 'sig', [team()]);
		expect(JSON.parse(store.get(rankCacheKey('great'))!)).toEqual({ signature: 'sig', teams: [team()] });
		expect([...store.keys()]).toEqual([rankCacheKey('great')]);
	});
});

describe('isRankedTeam', () => {
	it('takes a well-formed team', () => {
		expect(isRankedTeam(team())).toBe(true);
		for (const tier of ['elite', 'strong', 'solid', 'shaky', 'risky'] as const) {
			expect(isRankedTeam(team({ tier }))).toBe(true);
		}
	});

	it('refuses anything else', () => {
		expect(isRankedTeam(null)).toBe(false);
		expect(isRankedTeam('team')).toBe(false);
		expect(isRankedTeam({ ...team(), tier: 'legendary' })).toBe(false);
		expect(isRankedTeam({ ...team(), score: '80' })).toBe(false);
		expect(isRankedTeam({ ...team(), threatScore: undefined })).toBe(false);
		expect(isRankedTeam({ ...team(), members: team().members.slice(0, 2) })).toBe(false);
		expect(isRankedTeam({ ...team(), members: [...team().members.slice(0, 2), { speciesId: 7, moveset }] })).toBe(
			false
		);
		expect(
			isRankedTeam({ ...team(), members: [...team().members.slice(0, 2), { speciesId: 'a', moveset: [1] }] })
		).toBe(false);
		expect(isRankedTeam({ ...team(), members: [...team().members.slice(0, 2), null] })).toBe(false);
	});
});

describe('hashSignature', () => {
	it('is stable and tells different strings apart', () => {
		expect(hashSignature('abc')).toBe(hashSignature('abc'));
		expect(hashSignature('abc')).not.toBe(hashSignature('abd'));
		expect(hashSignature('')).toBe(hashSignature(''));
	});

	it('includes the length, so strings of different lengths never collide', () => {
		expect(hashSignature('a')).not.toBe(hashSignature('aa'));
		expect(hashSignature('abc').startsWith('3-')).toBe(true);
	});
});

describe('rankingSignature — what a cached ranking depends on', () => {
	const slot = (speciesId: string, extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
		speciesId,
		moveset,
		...extra,
	});
	const builder = (overrides: object = {}) =>
		({
			simulator: { verified: true, changedSources: [], unknownMechanics: [] },
			moves: { A: { power: 5 } },
			ivs: { azumarill: { great: [40, 0, 15, 15] } },
			forms: {},
			excludedThreats: [],
			meta: { great: ['azumarill'], ultra: ['medicham'] },
			...overrides,
		}) as unknown as TeamBuilderData;
	const base = () => ({
		league: 'great',
		combinations: [[slot('azumarill'), slot('medicham'), slot('registeel')]],
		rankList: { azumarill: { rank: 1 }, medicham: { rank: 2 }, registeel: { rank: 3 } },
		gamemaster: {
			azumarill: { dex: 184, types: ['water', 'fairy'], baseStats: { atk: 112, def: 152, hp: 225 }, isShadow: false },
			medicham: {
				dex: 308,
				types: ['fighting', 'psychic'],
				baseStats: { atk: 121, def: 152, hp: 155 },
				isShadow: false,
			},
			registeel: { dex: 379, types: ['steel'], baseStats: { atk: 143, def: 285, hp: 190 }, isShadow: false },
		},
		builder: builder() as TeamBuilderData | undefined,
	});
	const sign = (changes: Partial<Parameters<typeof rankingSignature>[0]> = {}) =>
		rankingSignature({ ...base(), ...changes });

	it('is the same for the same inputs', () => {
		expect(sign()).toBe(sign());
	});

	it('does not change when only the order of the Charged Moves does (nor an empty slot)', () => {
		const withMoves = (m: Array<string>) =>
			sign({ combinations: [[slot('azumarill', { moveset: m }), slot('medicham'), slot('registeel')]] });
		expect(withMoves(['A', 'C', 'B'])).toBe(withMoves(['A', 'B', 'C']));
		expect(withMoves(['A', 'B', 'none'])).toBe(withMoves(['A', 'B']));
		// the Fast Move is not a Charged Move: swapping it with one is another build
		expect(withMoves(['B', 'A', 'C'])).not.toBe(withMoves(['A', 'B', 'C']));
	});

	it('changes with the league, even for the same Pokémon', () => {
		expect(sign({ league: 'ultra' })).not.toBe(sign());
	});

	it('changes when a combination changes: another Pokémon, other moves, IVs, level or a status', () => {
		const withSlot = (s: TeamSlotDescriptor) => sign({ combinations: [[s, slot('medicham'), slot('registeel')]] });
		const original = sign();
		expect(withSlot(slot('azumarill', { ivs: [1, 15, 15] }))).not.toBe(original);
		expect(withSlot(slot('azumarill', { level: 40 }))).not.toBe(original);
		expect(withSlot(slot('azumarill', { moveset: ['A', 'B', 'D'] }))).not.toBe(original);
		expect(withSlot(slot('azumarill', { level: 51, buddy: true }))).not.toBe(
			withSlot(slot('azumarill', { level: 51 }))
		);
		expect(withSlot(slot('azumarill', { level: 52, superMega: true }))).not.toBe(
			withSlot(slot('azumarill', { level: 52 }))
		);
		expect(withSlot(slot('azumarill', { level: 50, formerBuddy: true }))).not.toBe(
			withSlot(slot('azumarill', { level: 50 }))
		);
		expect(sign({ combinations: [] })).not.toBe(original);
	});

	it('changes when the league’s ranking changes', () => {
		expect(sign({ rankList: { azumarill: { rank: 2 }, medicham: { rank: 1 }, registeel: { rank: 3 } } })).not.toBe(
			sign()
		);
	});

	it('changes when a species’ base data changes', () => {
		const gm = base().gamemaster;
		expect(
			sign({ gamemaster: { ...gm, azumarill: { ...gm.azumarill, baseStats: { atk: 1, def: 1, hp: 1 } } } })
		).not.toBe(sign());
		expect(sign({ gamemaster: { ...gm, azumarill: { ...gm.azumarill, types: ['water'] } } })).not.toBe(sign());
	});

	it('changes when PvPoke’s data changes: simulator state, moves, best IVs, excluded threats, this league’s meta', () => {
		const original = sign();
		expect(
			sign({ builder: builder({ simulator: { verified: false, changedSources: ['x'], unknownMechanics: [] } }) })
		).not.toBe(original);
		expect(sign({ builder: builder({ moves: { A: { power: 6 } } }) })).not.toBe(original);
		expect(sign({ builder: builder({ ivs: { azumarill: { great: [40, 1, 15, 15] } } }) })).not.toBe(original);
		expect(sign({ builder: builder({ excludedThreats: ['x'] }) })).not.toBe(original);
		expect(sign({ builder: builder({ meta: { great: ['registeel'], ultra: ['medicham'] } }) })).not.toBe(original);
		expect(sign({ builder: undefined })).not.toBe(original);
	});

	it('does not change with another league’s meta', () => {
		expect(sign({ builder: builder({ meta: { great: ['azumarill'], ultra: ['something else'] } }) })).toBe(sign());
	});

	it('does not depend on the order the ranking was listed in', () => {
		const reversed = { registeel: { rank: 3 }, medicham: { rank: 2 }, azumarill: { rank: 1 } };
		expect(sign({ rankList: reversed })).toBe(sign());
	});

	it('is a fingerprint a ranking can be cached under: written and read back with it', () => {
		fakeSession();
		const signature = sign();
		writeRankedCache('great', signature, [team()]);
		expect(readRankedCache('great', signature)).toEqual([team()]);
		expect(readRankedCache('great', sign({ league: 'ultra' }))).toBeUndefined();
		vi.unstubAllGlobals();
	});
});
