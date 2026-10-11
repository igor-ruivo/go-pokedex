import { beforeEach, describe, expect, it } from 'vitest';

import type { RankedTeam, TeamBuilderData } from '../DTOs/ITeamBuilder';
import { __memoryEntriesForTests, idbSet } from '../utils/idb-store';
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

/** The raw entry the cache keeps for a league (in the in-memory stand-in for IndexedDB), if any. */
const storedEntry = (league: Parameters<typeof rankCacheKey>[0]) =>
	__memoryEntriesForTests().get(`cache:rank:${rankCacheKey(league)}`) as
		| { savedAt: number; value: unknown }
		| undefined;

/** Plants `value` where the cache keeps `league`'s ranking, as a hand-edited or corrupted entry would be. */
const plant = (league: Parameters<typeof rankCacheKey>[0], value: unknown, version = RANK_CACHE_VERSION) =>
	idbSet(`cache:rank:v${version}:${league}`, { savedAt: Date.now(), value });

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
		expect(rankCacheKey('great')).toBe(`v${RANK_CACHE_VERSION}:great`);
		expect(rankCacheKey('ultra')).not.toBe(rankCacheKey('great'));
		expect(rankCacheKey('mega-1500')).toBe(`v${RANK_CACHE_VERSION}:mega-1500`);
	});

	it('is the format version that makes an old entry unreachable', () => {
		expect(rankCacheKey('great')).toContain(`v${RANK_CACHE_VERSION}:`);
	});
});

describe('the ranking kept in IndexedDB', () => {
	beforeEach(() => {
		__memoryEntriesForTests().clear();
	});

	it('gives back what was written, with every member’s build and marks', async () => {
		const teams = [team(), team({ score: 70, tier: 'solid', threatScore: 600 })];
		await writeRankedCache('great', 'sig', teams);
		const read = await readRankedCache('great', 'sig');
		expect(read).toEqual(teams);
		expect(read![0].members[1]).toMatchObject({ ivs: [0, 15, 15], level: 51, buddy: true });
		expect(read![0].members[2]).toMatchObject({ level: 53, buddy: true, superMega: true, formerSuperMega: true });
	});

	it('keeps the order of the teams', async () => {
		const teams = [team({ score: 90 }), team({ score: 80 }), team({ score: 70 })];
		await writeRankedCache('great', 'sig', teams);
		expect((await readRankedCache('great', 'sig'))!.map((t) => t.score)).toEqual([90, 80, 70]);
	});

	it('keeps each league apart', async () => {
		await writeRankedCache('great', 'sig-great', [team({ score: 11 })]);
		await writeRankedCache('ultra', 'sig-ultra', [team({ score: 22 })]);
		await writeRankedCache('mega-1500', 'sig-mega', [team({ score: 33 })]);
		expect((await readRankedCache('great', 'sig-great'))![0].score).toBe(11);
		expect((await readRankedCache('ultra', 'sig-ultra'))![0].score).toBe(22);
		expect((await readRankedCache('mega-1500', 'sig-mega'))![0].score).toBe(33);
		// a league does not read another’s entry, even with its signature
		expect(await readRankedCache('great', 'sig-ultra')).toBeUndefined();
		expect(await readRankedCache('master', 'sig-great')).toBeUndefined();
	});

	it('is a miss when the signature differs: the inputs changed', async () => {
		await writeRankedCache('great', 'old', [team()]);
		expect(await readRankedCache('great', 'new')).toBeUndefined();
	});

	it('replaces what the league had', async () => {
		await writeRankedCache('great', 'one', [team({ score: 1 })]);
		await writeRankedCache('great', 'two', [team({ score: 2 })]);
		expect(await readRankedCache('great', 'one')).toBeUndefined();
		expect((await readRankedCache('great', 'two'))![0].score).toBe(2);
	});

	it('is a miss with nothing stored', async () => {
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('can keep an empty ranking: a collection with no possible team is not recomputed either', async () => {
		await writeRankedCache('great', 'sig', []);
		expect(await readRankedCache('great', 'sig')).toEqual([]);
	});

	it('is a miss for an entry that is not an object, or has no teams', async () => {
		await plant('great', '"text"');
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
		await plant('great', null);
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
		await plant('great', { signature: 'sig' });
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
		await plant('great', { signature: 'sig', teams: 'nope' });
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('is a miss when any stored team is not a team: it never half-loads', async () => {
		await plant('great', { signature: 'sig', teams: [team(), { score: 'high' }] });
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('is a miss from an older format version, which is stored under another key', async () => {
		await plant('great', { signature: 'sig', teams: [team()] }, RANK_CACHE_VERSION - 1);
		expect(await readRankedCache('great', 'sig')).toBeUndefined();
	});

	it('stores under the league’s key, with the signature next to the teams and the date it was saved', async () => {
		await writeRankedCache('great', 'sig', [team()]);
		expect(storedEntry('great')).toEqual({
			savedAt: expect.any(Number) as number,
			value: { signature: 'sig', teams: [team()] },
		});
	});

	it('keeps no more than one entry per league, whatever its size', async () => {
		const big = [team({ members: [{ speciesId: 'x'.repeat(2_000_000), moveset }] as never })];
		await writeRankedCache('great', 'big', big);
		await writeRankedCache('great', 'small', [team()]);
		expect([...__memoryEntriesForTests().keys()].filter((key) => key.startsWith('cache:rank:'))).toHaveLength(1);
		expect(await readRankedCache('great', 'big')).toBeUndefined();
		expect(await readRankedCache('great', 'small')).toEqual([team()]);
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

	it('is a fingerprint a ranking can be cached under: written and read back with it', async () => {
		__memoryEntriesForTests().clear();
		const signature = sign();
		await writeRankedCache('great', signature, [team()]);
		expect(await readRankedCache('great', signature)).toEqual([team()]);
		expect(await readRankedCache('great', sign({ league: 'ultra' }))).toBeUndefined();
	});
});
