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

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)('%s league swaps', (league, data) => {
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
			const swapped = team.map((slot, i) => (i === pick.slot ? { speciesId: pick.speciesId, moveset: movesetOf(pick.speciesId) } : slot));
			expect(pick.threatScore, `${pick.speciesId} in slot ${pick.slot}`).toBe(evaluator.evaluate(swapped).threatScore);
		}
	});
});
