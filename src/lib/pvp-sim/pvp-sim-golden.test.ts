import { describe, expect, it } from 'vitest';

import type { TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import golden from './__fixtures__/golden.json';
import { DamageMultiplier } from './damage';
import { type RankedEntry, type SpeciesInfo, TeamEvaluator, type TeamSlot } from './team-eval';

/**
 * Golden-master test for the PvPoke simulator port.
 *
 * `__fixtures__/golden.json` holds a small pool of Pokémon per league, a few teams, and the ratings
 * PvPoke's own unmodified JavaScript produced for them (see scripts/pvp-sim-parity/make-golden.cjs).
 * The port must reproduce every number. If this fails, the battle simulation, the decision AI, damage
 * or threat scoring changed:
 *   - unintentionally → fix the regression;
 *   - because PvPoke changed → port the change, re-run `pnpm run pvp-sim:parity`, then regenerate the
 *     fixture with `node scripts/pvp-sim-parity/make-golden.cjs` and commit it with the port change.
 */

interface ExpectedTeam {
	team: Array<TeamSlot>;
	expected: {
		threatScore: number;
		threats: Array<string>;
		matchups: Record<string, Array<number>>;
		members: Array<{ speciesId: string; level: number; cp: number; bulk: number; consistency: number }>;
	};
}

interface FixtureLeague {
	species: Array<SpeciesInfo>;
	ranking: Array<RankedEntry>;
	teams: Array<ExpectedTeam>;
}

const builder = {
	...golden.builder,
	simulator: { verified: true, changedSources: [], unknownMechanics: [] },
} as unknown as TeamBuilderData;

describe.each(Object.entries(golden.leagues) as Array<[TeamLeague, FixtureLeague]>)('%s league', (league, data) => {
	const evaluator = new TeamEvaluator({ league, builder, species: data.species, ranking: data.ranking });

	it('has fixture teams to check', () => {
		expect(data.teams.length).toBeGreaterThan(0);
	});

	data.teams.forEach(({ team, expected }) => {
		const name = team.map((t) => t.speciesId).join(' + ');

		describe(name, () => {
			it('rates every pool Pokémon against every teammate exactly like PvPoke', () => {
				const actual = Object.fromEntries(evaluator.matchups(team).map((row) => [row.speciesId, row.ratings]));
				// Compared as one object so a failure lists every matchup that moved, not just the first.
				expect(actual).toEqual(expected.matchups);
			});

			it('arrives at PvPoke’s threat score and threats', () => {
				const result = evaluator.evaluate(team);
				expect(result.threatScore).toBe(expected.threatScore);
				expect(result.threats.map((t) => t.speciesId)).toEqual(expected.threats);
			});

			it('builds the team members with the same stats and consistency', () => {
				const { members } = evaluator.evaluate(team);
				expect(
					members.map((m) => ({ speciesId: m.speciesId, level: m.level, cp: m.cp, consistency: m.consistency }))
				).toEqual(
					expected.members.map((m) => ({
						speciesId: m.speciesId,
						level: m.level,
						cp: m.cp,
						consistency: m.consistency,
					}))
				);
				members.forEach((m, i) => expect(m.bulk).toBeCloseTo(expected.members[i].bulk, 6));
			});
		});
	});
});

describe('fixture coverage', () => {
	const pool = new Set(Object.values(golden.leagues).flatMap((l) => l.ranking.map((r) => r.speciesId)));

	it('includes the form-changing Pokémon the AI has special cases for', () => {
		for (const id of ['aegislash_shield', 'morpeko_full_belly', 'mimikyu', 'cramorant'])
			expect(pool.has(id)).toBe(true);
	});

	it('includes Shadow Pokémon (attack/defense multipliers)', () => {
		expect([...pool].some((id) => id.endsWith('_shadow'))).toBe(true);
	});
});

describe('PvP damage constants', () => {
	// Sub-1e-8 differences can slip past a finite pool of matchups, so PvPoke's exact single-precision
	// values are pinned directly. (Upstream changes to DamageCalculator.js are caught separately by
	// dex-server's simulator-guard.)
	it('match PvPoke’s DamageMultiplier exactly', () => {
		expect(DamageMultiplier).toEqual({
			BONUS: 1.2999999523162841796875,
			STAB: 1.2000000476837158203125,
			SHADOW_ATK: 1.2,
			SHADOW_DEF: 0.83333331,
		});
	});
});
