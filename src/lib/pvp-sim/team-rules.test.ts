import { describe, expect, it } from 'vitest';

import type { TeamBuilderData } from '../../DTOs/ITeamBuilder';
import { LEAGUE_CP } from '../league-caps';
import golden from './__fixtures__/golden.json';
import { type RankedEntry, type SpeciesInfo, TeamEvaluator } from './team-eval';

/**
 * The team rules the suggestions and the ranking keep: one Mega per team, and no Pokémon twice — a Shadow, its normal form
 * and every Mega of it are one. The golden fixture has no Megas, so a few of its species are given the flags here (the
 * flags only decide who may share a team; the battles stay the fixture's).
 */
const builder = {
	...golden.builder,
	simulator: { verified: true, changedSources: [], unknownMechanics: [] },
} as unknown as TeamBuilderData;

const league = 'great' as const;
const data = golden.leagues[league] as unknown as { species: Array<SpeciesInfo>; ranking: Array<RankedEntry> };
const ranked_ = [...data.ranking].sort((a, b) => a.rank - b.rank).map((r) => r.speciesId);
// species with no Shadow twin in the list, so that the flags below are the only relations in play
const ids = ranked_.filter((id) => !id.endsWith('_shadow') && !ranked_.includes(id + '_shadow'));

// ids[1] and ids[3] are two Megas of different species; ids[5] is a Mega of ids[4]; ids[7] and ids[8] are two Megas of ids[6].
const flags: Record<string, Partial<SpeciesInfo>> = {
	[ids[1]]: { isMega: true },
	[ids[3]]: { isMega: true },
	[ids[5]]: { isMega: true, baseSpecies: ids[4] },
	[ids[7]]: { isMega: true, baseSpecies: ids[6] },
	[ids[8]]: { isMega: true, baseSpecies: ids[6] },
};
const species = data.species.map((s) => ({ ...s, ...flags[s.speciesId] }));
const evaluatorFor = (list: Array<SpeciesInfo>) =>
	new TeamEvaluator({ league, cpCap: LEAGUE_CP[league], builder, species: list, ranking: data.ranking });
const evaluator = evaluatorFor(species);

const megas = new Set(Object.keys(flags));
const familyOf = (id: string) => (flags[id]?.baseSpecies ?? id).replace(/_shadow$/, '');
const movesetOf = (speciesId: string) =>
	data.ranking.find((r) => r.speciesId === speciesId)!.moveset.filter((m) => m !== 'none');
const slotOf = (speciesId: string) => ({ speciesId, moveset: movesetOf(speciesId) });

describe('rankTeams', () => {
	const candidates = ids.slice(0, 10);
	const ranked = evaluator.rankTeams(candidates);

	it('finds teams, and some with a Mega', () => {
		expect(ranked.length).toBeGreaterThan(0);
		expect(ranked.some((t) => t.speciesIds.some((id) => megas.has(id)))).toBe(true);
	});

	it('never ranks a team with two Megas', () => {
		for (const { speciesIds } of ranked) {
			expect(speciesIds.filter((id) => megas.has(id)).length, speciesIds.join(' + ')).toBeLessThanOrEqual(1);
		}
	});

	it('never ranks a Mega with its base form', () => {
		for (const { speciesIds } of ranked) {
			expect(new Set(speciesIds.map(familyOf)).size, speciesIds.join(' + ')).toBe(3);
		}
	});

	it('ranks exactly the trios the rules allow', () => {
		let allowed = 0;
		for (let a = 0; a < candidates.length; a++)
			for (let b = a + 1; b < candidates.length; b++)
				for (let c = b + 1; c < candidates.length; c++) {
					const trio = [candidates[a], candidates[b], candidates[c]];
					const oneMega = trio.filter((id) => megas.has(id)).length <= 1;
					if (oneMega && new Set(trio.map(familyOf)).size === 3) allowed++;
				}
		expect(ranked).toHaveLength(allowed);
	});

	it('ranks as many trios as the flag-free fixture has, minus those the Mega rules take away', () => {
		const withoutRules = evaluatorFor(data.species).rankTeams(candidates);
		expect(withoutRules.length).toBeGreaterThan(ranked.length);
	});
});

describe('rankCompletions', () => {
	it('never completes a team with a second Mega', () => {
		const fixed = [slotOf(ids[1])];
		const completions = evaluator.rankCompletions(fixed, { candidates: 12 });
		expect(completions.length).toBeGreaterThan(0);
		for (const { members } of completions) {
			expect(members.filter((m) => megas.has(m.speciesId)).length, members.map((m) => m.speciesId).join(' + ')).toBe(1);
		}
	});

	it('offers a Mega to a team that has none, but never two at once', () => {
		const completions = evaluator.rankCompletions([slotOf(ids[0])], { candidates: 12 });
		const withMega = completions.filter(({ members }) => members.some((m) => megas.has(m.speciesId)));
		expect(withMega.length).toBeGreaterThan(0);
		for (const { members } of completions) {
			expect(members.filter((m) => megas.has(m.speciesId)).length).toBeLessThanOrEqual(1);
		}
	});

	it('never completes a team with the base form of its Mega, or another Mega of it', () => {
		const withMega = evaluator.rankCompletions([slotOf(ids[5])], { candidates: 12 });
		for (const { members } of withMega) {
			expect(members.map((m) => m.speciesId)).not.toContain(ids[4]);
		}
		const withBase = evaluator.rankCompletions([slotOf(ids[4])], { candidates: 12 });
		for (const { members } of withBase) {
			expect(members.map((m) => m.speciesId)).not.toContain(ids[5]);
		}
		const withOneOfTwo = evaluator.rankCompletions([slotOf(ids[7])], { candidates: 12 });
		for (const { members } of withOneOfTwo) {
			expect(members.map((m) => m.speciesId)).not.toContain(ids[8]);
			expect(members.map((m) => m.speciesId)).not.toContain(ids[6]);
		}
	});

	it('still completes a two-Pokémon team that holds a Mega', () => {
		const completions = evaluator.rankCompletions([slotOf(ids[1]), slotOf(ids[0])], { candidates: 12 });
		expect(completions.length).toBeGreaterThan(0);
		for (const { members } of completions) expect(members.map((m) => m.speciesId)).toContain(ids[1]);
	});
});

describe('swaps and suggestions', () => {
	it('suggests a Mega for any slot of a team that has none', () => {
		const team = [ids[0], ids[2], ids[4]].map(slotOf);
		const picks = evaluator.swaps(team, { candidates: 12 });
		const megaSlots = new Set(picks.filter((p) => p.speciesId === ids[1]).map((p) => p.slot));
		expect(megaSlots).toEqual(new Set([0, 1, 2]));
	});

	it('suggests a Mega for the slot of the team’s own Mega only', () => {
		const team = [ids[1], ids[0], ids[2]].map(slotOf);
		const picks = evaluator.swaps(team, { candidates: 12 });
		const forThirdMega = picks.filter((p) => p.speciesId === ids[3]);
		expect(forThirdMega.length).toBeGreaterThan(0);
		for (const pick of forThirdMega) expect(pick.slot).toBe(0);
		// and any other Pokémon may take the Mega's slot or the others
		expect(new Set(picks.filter((p) => !megas.has(p.speciesId)).map((p) => p.slot)).size).toBeGreaterThan(1);
	});

	it('never leaves a team with two Megas after a suggested swap', () => {
		const team = [ids[1], ids[0], ids[2]].map(slotOf);
		for (const pick of evaluator.swaps(team, { candidates: 12 })) {
			const after = team.map((slot, i) => (i === pick.slot ? pick.speciesId : slot.speciesId));
			expect(after.filter((id) => megas.has(id)).length, after.join(' + ')).toBeLessThanOrEqual(1);
			expect(new Set(after.map(familyOf)).size, after.join(' + ')).toBe(3);
		}
	});

	it('never suggests the base form of a Mega the team keeps, nor a Mega of a teammate', () => {
		const team = [ids[0], ids[2], ids[4]].map(slotOf);
		const picks = evaluator.swaps(team, { candidates: 12 });
		expect(picks.some((p) => p.speciesId === ids[5])).toBe(false);
		const megaTeam = [ids[0], ids[2], ids[5]].map(slotOf);
		expect(evaluator.swaps(megaTeam, { candidates: 12 }).some((p) => p.speciesId === ids[4])).toBe(false);
	});

	it('suggest() keeps the same rules', () => {
		const team = [ids[1], ids[0], ids[2]].map(slotOf);
		for (const pick of evaluator.suggest(team, { candidates: 12, results: 20 })) {
			if (megas.has(pick.speciesId)) expect(pick.slot).toBe(0);
		}
	});
});

describe('the Shadow and normal forms', () => {
	const shadowed = data.species.find((s) => s.isShadow)!;
	const normal = shadowed.speciesId.replace(/_shadow$/, '');

	it('are one Pokémon for completions and swaps, with or without the relation recorded', () => {
		const withRelation = evaluatorFor(
			data.species.map((s) => (s.speciesId === shadowed.speciesId ? { ...s, nonShadowSpecies: normal } : s))
		);
		for (const e of [evaluator, withRelation]) {
			const rankedIds = new Set(data.ranking.map((r) => r.speciesId));
			if (!rankedIds.has(normal)) continue;
			for (const { members } of e.rankCompletions([slotOf(shadowed.speciesId)], { candidates: 40 })) {
				expect(members.map((m) => m.speciesId)).not.toContain(normal);
			}
		}
	});
});

describe('Super Max Megas', () => {
	const superId = ids[1];
	const superSpecies = species.map((s) => (s.speciesId === superId ? { ...s, isSuperMega: true } : s));
	const e = evaluatorFor(superSpecies);

	it('builds them at the best spread up to level 52, or the lower level the CP cap gives', () => {
		const build = e.superMegaBuild(superId);
		expect(build).toBeDefined();
		expect(build!.level).toBeLessThanOrEqual(52);
		expect(e.superMegaBuild(ids[0])).toBeUndefined();
	});

	it('adds every one as a candidate of the completions and swaps, however far down the ranking', () => {
		const team = [ids[0], ids[2]].map(slotOf);
		const completions = e.rankCompletions(team, { candidates: 3 });
		const supers = completions.flatMap((c) => c.members).filter((m) => m.speciesId === superId);
		expect(supers.length).toBeGreaterThan(0);
		for (const member of supers) {
			expect(member.superMega).toBe(true);
			expect(member.level).toBeDefined();
		}
		const swaps = e.swaps([ids[0], ids[2], ids[4]].map(slotOf), { candidates: 3 });
		expect(swaps.some((p) => p.speciesId === superId && p.superMega === true)).toBe(true);
	});

	it('ranks them in top teams with their build', () => {
		const ranked = e.rankTeams(ids.slice(0, 6));
		expect(ranked.some((t) => t.speciesIds.includes(superId))).toBe(true);
	});
});
