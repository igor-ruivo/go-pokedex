import type { SlotIvs } from './team-analysis';

/** What the published Top teams list keeps of a team (see `scripts/team-ranking/build.mts`). */
export interface RankedTeamLine {
	members: Array<{ speciesId: string; moveset: Array<string>; ivs?: SlotIvs; level?: number; superMega?: true }>;
	score: number;
	threatScore: number;
	/** Places gained (+) or lost (−) in this list since the previous ranking; absent for new or unmoved teams. */
	rankChange?: number;
}

/** The same three Pokémon with the same moves are the same team, whatever order they were listed in. */
export const teamKey = (team: { members: Array<{ speciesId: string; moveset: Array<string> }> }): string =>
	team.members
		.map((m) => [m.speciesId, ...m.moveset].join('-'))
		.sort()
		.join('|');

/**
 * Places gained (positive) or lost (negative) since the previous ranking, for each team of one list. Teams that weren't in
 * the previous top list, and teams that didn't move, carry no figure. A re-run on the same day (`previousIsToday`) keeps the
 * changes already published, instead of comparing today with itself.
 */
export const withRankChanges = <T extends RankedTeamLine>(
	list: Array<T>,
	before: Array<RankedTeamLine> | undefined,
	previousIsToday: boolean
): Array<T> => {
	if (!before) return list;
	const position = new Map(before.map((team, i) => [teamKey(team), { index: i, team }] as const));
	return list.map((team, i) => {
		const was = position.get(teamKey(team));
		if (!was) return team;
		const change = previousIsToday ? was.team.rankChange : was.index - i;
		return change ? { ...team, rankChange: change } : team;
	});
};

/** Best Team Score first; a lower threat score breaks a tie. */
export const byScoreOrder = (a: RankedTeamLine, b: RankedTeamLine): number =>
	b.score - a.score || a.threatScore - b.threatScore;

/** Lowest threat score first (PvPoke's own measure: lower is better); a higher Team Score breaks a tie. */
export const byThreatOrder = (a: RankedTeamLine, b: RankedTeamLine): number =>
	a.threatScore - b.threatScore || b.score - a.score;

/** The best `top` of a list under `order`; the list itself is sorted in place, as the script prunes as teams pile up. */
export const pruneTop = <T extends RankedTeamLine>(
	list: Array<T>,
	order: (a: T, b: T) => number,
	top: number
): Array<T> => list.sort(order).slice(0, top);

/**
 * The species a league ranks teams from: the `sample` best-ranked usable ones (a species with moves the builder knows, no
 * `_xs` size variants), plus every Super Max Mega of the league however far down the ranking it is. Always the same sample
 * size for every league.
 */
export const selectCandidates = (
	ranking: ReadonlyArray<{ speciesId: string; moveset: ReadonlyArray<string>; rank: number }>,
	sample: number,
	rules: { moveExists: (moveId: string) => boolean; isSuperMega: (speciesId: string) => boolean }
): Array<string> => {
	const usable = [...ranking]
		.sort((a, b) => a.rank - b.rank)
		.filter((r) => !r.speciesId.includes('_xs') && r.moveset.length > 0 && r.moveset.every(rules.moveExists));
	return [...usable.slice(0, sample), ...usable.slice(sample).filter((r) => rules.isSuperMega(r.speciesId))].map(
		(r) => r.speciesId
	);
};
