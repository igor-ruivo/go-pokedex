import { describe, expect, it } from 'vitest';

import type { TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import golden from './__fixtures__/golden.json';
import { type RankedEntry, type SpeciesInfo, TeamEvaluator } from './team-eval';

/**
 * `rankTeams` shortcuts `evaluate` (each candidate simulated once, every trio re-ranked from those columns), so
 * it must land on exactly the threat score `evaluate` computes for the same trio — which the golden-master test
 * pins against PvPoke's own numbers.
 */
interface FixtureLeague {
	species: Array<SpeciesInfo>;
	ranking: Array<RankedEntry>;
}

const builder = {
	...golden.builder,
	simulator: { verified: true, changedSources: [], unknownMechanics: [] },
} as unknown as TeamBuilderData;

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)('%s league', (league, data) => {
	const evaluator = new TeamEvaluator({ league, builder, species: data.species, ranking: data.ranking });
	const candidates = [...data.ranking]
		.sort((a, b) => a.rank - b.rank)
		.slice(0, 7)
		.map((r) => r.speciesId);

	it('gives every trio the threat score `evaluate` gives it', () => {
		const ranked = evaluator.rankTeams(candidates);
		expect(ranked.length).toBeGreaterThan(0);

		for (const { speciesIds, threatScore } of ranked) {
			const team = speciesIds.map((speciesId) => ({
				speciesId,
				moveset: data.ranking.find((r) => r.speciesId === speciesId)!.moveset.filter((m) => m !== 'none'),
			}));
			expect(threatScore, speciesIds.join(' + ')).toBe(evaluator.evaluate(team).threatScore);
		}
	});

	it('never fields one species twice', () => {
		for (const { speciesIds } of evaluator.rankTeams(candidates)) {
			const bases = speciesIds.map((id) => id.replace('_shadow', ''));
			expect(new Set(bases).size).toBe(3);
		}
	});
});

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)(
	'%s league swaps',
	(league, data) => {
		const evaluator = new TeamEvaluator({ league, builder, species: data.species, ranking: data.ranking });
		const movesetOf = (speciesId: string) =>
			data.ranking.find((r) => r.speciesId === speciesId)!.moveset.filter((m) => m !== 'none');
		const top = [...data.ranking]
			.sort((a, b) => a.rank - b.rank)
			.slice(0, 3)
			.map((r) => r.speciesId);
		const team = top.map((speciesId) => ({ speciesId, moveset: movesetOf(speciesId) }));

		it('gives every swap the threat score `evaluate` gives the swapped team', () => {
			const swaps = evaluator.swaps(team, { candidates: 6 });
			expect(swaps.length).toBeGreaterThan(0);

			for (const pick of swaps) {
				const swapped = team.map((slot, i) =>
					i === pick.slot ? { speciesId: pick.speciesId, moveset: movesetOf(pick.speciesId) } : slot
				);
				expect(pick.threatScore, `${pick.speciesId} in slot ${pick.slot}`).toBe(
					evaluator.evaluate(swapped).threatScore
				);
			}
		});
	}
);

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)(
	'%s league play order',
	(league, data) => {
		const evaluator = new TeamEvaluator({ league, builder, species: data.species, ranking: data.ranking });
		const movesetOf = (speciesId: string) =>
			data.ranking.find((r) => r.speciesId === speciesId)!.moveset.filter((m) => m !== 'none');
		const trio = [...data.ranking]
			.sort((a, b) => a.rank - b.rank)
			.slice(0, 6)
			.filter((_, i) => i % 2 === 0)
			.map((r) => r.speciesId);
		const slotsOf = (ids: ReadonlyArray<string>) =>
			ids.map((speciesId) => ({ speciesId, moveset: movesetOf(speciesId) }));
		const permutations = [
			[0, 1, 2],
			[0, 2, 1],
			[1, 0, 2],
			[1, 2, 0],
			[2, 0, 1],
			[2, 1, 0],
		];

		it('rates a team the same whatever order its slots are in', () => {
			const scores = permutations.map((p) => evaluator.evaluate(slotsOf(p.map((i) => trio[i]))).threatScore);
			expect(new Set(scores).size, `${trio.join(' + ')}: ${scores.join(', ')}`).toBe(1);
		});

		it('is exactly what PvPoke gives for the team entered in its play order', () => {
			const given = slotsOf(trio);
			const rated = evaluator.evaluate(given);
			const playOrder = evaluator
				.evaluate(given, { order: 'given' }) // order of the *result's* members is unchanged; the play order comes from the roles
				.members.map((m) => m.speciesId);
			expect(playOrder).toEqual(trio);

			const roles = (id: string) => data.ranking.find((r) => r.speciesId === id)!;
			const best = permutations
				.map((p) => p.map((i) => trio[i]))
				.map((ids) => ({ ids, total: roles(ids[0]).lead! + roles(ids[1]).switch + roles(ids[2]).closer! }))
				.sort((a, b) => b.total - a.total)[0].ids;
			expect(rated.threatScore).toBe(evaluator.evaluate(slotsOf(best), { order: 'given' }).threatScore);
		});

		it('returns the per-teammate figures in the order the caller gave', () => {
			const reversed = slotsOf([...trio].reverse());
			const result = evaluator.evaluate(reversed);
			const matchups = evaluator.matchups(reversed);
			const byId = new Map(matchups.map((row) => [row.speciesId, row.ratings]));
			result.threats.forEach((threat) => {
				expect(threat.ratings).toEqual(byId.get(threat.speciesId));
			});
			expect(result.members.map((m) => m.speciesId)).toEqual([...trio].reverse());
		});
	}
);

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)(
	'%s league completions',
	(league, data) => {
		const evaluator = new TeamEvaluator({ league, builder, species: data.species, ranking: data.ranking });
		const movesetOf = (speciesId: string) =>
			data.ranking.find((r) => r.speciesId === speciesId)!.moveset.filter((m) => m !== 'none');
		const top = [...data.ranking].sort((a, b) => a.rank - b.rank).map((r) => r.speciesId);

		it.each([1, 2])('rates every completion of a team of %i exactly as `evaluate` rates the finished team', (count) => {
			const fixed = top.slice(2, 2 + count).map((speciesId) => ({ speciesId, moveset: movesetOf(speciesId) }));
			const completions = evaluator.rankCompletions(fixed, { candidates: 8 });
			expect(completions.length).toBeGreaterThan(0);
			for (const { members, threatScore } of completions) {
				expect(members).toHaveLength(3);
				// the Pokémon already on the team are all still there, with their moves
				for (const slot of fixed) expect(members).toContainEqual(slot);
				expect(threatScore, members.map((m) => m.speciesId).join(' + ')).toBe(evaluator.evaluate(members).threatScore);
			}
		});

		it('never adds a species the team already has', () => {
			const fixed = [{ speciesId: top[0], moveset: movesetOf(top[0]) }];
			for (const { members } of evaluator.rankCompletions(fixed, { candidates: 8 })) {
				const bases = members.map((m) => m.speciesId.replace('_shadow', ''));
				expect(new Set(bases).size).toBe(3);
			}
		});
	}
);
