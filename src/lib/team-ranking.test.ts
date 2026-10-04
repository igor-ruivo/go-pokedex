import { describe, expect, it } from 'vitest';

import {
	byScoreOrder,
	byThreatOrder,
	pruneTop,
	type RankedTeamLine,
	selectCandidates,
	teamKey,
	withRankChanges,
} from './team-ranking';

const team = (
	ids: Array<string>,
	score = 50,
	threatScore = 500,
	extra: Partial<RankedTeamLine> = {}
): RankedTeamLine => ({
	members: ids.map((id) => ({ speciesId: id, moveset: ['A', 'B'] })),
	score,
	threatScore,
	...extra,
});
const first = (t: RankedTeamLine) => t.members[0].speciesId;

describe('selectCandidates', () => {
	const ranking = Array.from({ length: 10 }, (_, i) => ({
		speciesId: `mon${i + 1}`,
		moveset: ['A', 'B'],
		rank: i + 1,
	}));
	const rules = { moveExists: () => true, isSuperMega: (id: string) => id === 'mon9' || id === 'mon3' };

	it('takes the best-ranked species up to the sample, whatever order the ranking comes in', () => {
		expect(selectCandidates([...ranking].reverse(), 4, { ...rules, isSuperMega: () => false })).toEqual([
			'mon1',
			'mon2',
			'mon3',
			'mon4',
		]);
	});

	it('adds every Super Max Mega of the league however far down it is, and never twice', () => {
		const candidates = selectCandidates(ranking, 4, rules);
		expect(candidates).toEqual(['mon1', 'mon2', 'mon3', 'mon4', 'mon9']);
		expect(new Set(candidates).size).toBe(candidates.length);
	});

	it('never takes more than the sample plus the Super Max Megas', () => {
		expect(selectCandidates(ranking, 100, { ...rules, isSuperMega: () => false })).toHaveLength(10);
		expect(selectCandidates(ranking, 0, rules)).toEqual(['mon3', 'mon9']);
	});

	it('leaves out species with unknown moves, no moves, or a size variant', () => {
		const odd = [
			{ speciesId: 'good', moveset: ['A'], rank: 1 },
			{ speciesId: 'unknown_move', moveset: ['A', 'NOPE'], rank: 2 },
			{ speciesId: 'no_moves', moveset: [], rank: 3 },
			{ speciesId: 'mon_xs', moveset: ['A'], rank: 4 },
			{ speciesId: 'also_good', moveset: ['A'], rank: 5 },
		];
		expect(selectCandidates(odd, 10, { moveExists: (m) => m !== 'NOPE', isSuperMega: () => false })).toEqual([
			'good',
			'also_good',
		]);
	});
});

describe('teamKey', () => {
	it('is the same for the same three Pokémon with the same moves, in any order', () => {
		expect(teamKey(team(['a', 'b', 'c']))).toBe(teamKey(team(['c', 'a', 'b'])));
	});

	it('differs when a Pokémon or its moves differ', () => {
		expect(teamKey(team(['a', 'b', 'c']))).not.toBe(teamKey(team(['a', 'b', 'd'])));
		const other = team(['a', 'b', 'c']);
		other.members[0].moveset = ['A', 'Z'];
		expect(teamKey(other)).not.toBe(teamKey(team(['a', 'b', 'c'])));
	});
});

describe('orders', () => {
	it('puts the best Team Score first, the lower threat score breaking a tie', () => {
		const list = [team(['a'], 70, 400), team(['b'], 80, 500), team(['c'], 80, 450)];
		expect([...list].sort(byScoreOrder).map(first)).toEqual(['c', 'b', 'a']);
	});

	it('puts the lowest threat score first, the higher Team Score breaking a tie', () => {
		const list = [team(['a'], 70, 400), team(['b'], 80, 400), team(['c'], 60, 300)];
		expect([...list].sort(byThreatOrder).map(first)).toEqual(['c', 'b', 'a']);
	});

	it('keeps the best N of a list', () => {
		const list = [team(['a'], 10), team(['b'], 90), team(['c'], 50)];
		expect(pruneTop(list, byScoreOrder, 2).map(first)).toEqual(['b', 'c']);
	});
});

describe('withRankChanges', () => {
	const before = [team(['a', 'x', 'y']), team(['b', 'x', 'y']), team(['c', 'x', 'y'], 50, 500, { rankChange: 2 })];

	it('leaves the list alone with no previous ranking', () => {
		const list = [team(['a', 'x', 'y'])];
		expect(withRankChanges(list, undefined, false)).toBe(list);
	});

	it('carries the places gained or lost, and none for new teams', () => {
		const now = [team(['b', 'x', 'y']), team(['a', 'x', 'y']), team(['z', 'x', 'y']), team(['c', 'x', 'y'])];
		const changes = withRankChanges(now, before, false).map((t) => t.rankChange);
		// b went 2nd to 1st (+1), a 1st to 2nd (-1), z is new, c 3rd to 4th (-1)
		expect(changes).toEqual([1, -1, undefined, -1]);
	});

	it('gives no figure to a team that did not move', () => {
		expect(withRankChanges([team(['a', 'x', 'y'])], before, false)[0]).not.toHaveProperty('rankChange');
	});

	it('keeps the changes already published when run again on the same day', () => {
		const now = [team(['c', 'x', 'y']), team(['a', 'x', 'y'])];
		const result = withRankChanges(now, before, true);
		expect(result[0].rankChange).toBe(2);
		expect(result[1]).not.toHaveProperty('rankChange');
	});

	it('recognises a team whatever order its members were listed in', () => {
		const result = withRankChanges([team(['y', 'b', 'x']), team(['a', 'x', 'y'])], before, false);
		expect(result.map((t) => t.rankChange)).toEqual([1, -1]);
	});
});
