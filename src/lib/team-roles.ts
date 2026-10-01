/*
 * Who leads, who takes the safe switch, who closes. Pure and dependency-free so the simulator worker can use it too
 * (the team's play order is also the order it is rated in — see `TeamEvaluator.evaluate`).
 */
const round1 = (n: number) => Math.round(n * 10) / 10;

export type TeamRole = 'lead' | 'switch' | 'closer';
export const TEAM_ROLES: ReadonlyArray<TeamRole> = ['lead', 'switch', 'closer'];

export interface RoleScores {
	lead: number;
	switch: number;
	closer: number;
}

export interface RoleAssignment {
	/** Member index per role. */
	order: Record<TeamRole, number>;
	/** Sum of the three role scores of the chosen assignment. */
	total: number;
	/** Points ahead of the next-best assignment (0 = a coin flip). */
	margin: number;
}

const PERMUTATIONS: ReadonlyArray<readonly [number, number, number]> = [
	[0, 1, 2],
	[0, 2, 1],
	[1, 0, 2],
	[1, 2, 0],
	[2, 0, 1],
	[2, 1, 0],
];

/**
 * The lineup that maximises PvPoke's role scores: who leads, who takes the
 * safe switch, who closes. All six assignments are tried, so a Pokémon that's
 * a good closer but is needed elsewhere is placed where the team gains most.
 * Only defined for a full team of three.
 */
export const assignRoles = (scores: ReadonlyArray<RoleScores | undefined>): RoleAssignment | undefined => {
	if (scores.length !== 3 || scores.some((s) => !s)) return undefined;
	const s = scores as ReadonlyArray<RoleScores>;

	const ranked = PERMUTATIONS.map(([lead, sw, closer]) => ({
		order: { lead, switch: sw, closer },
		total: s[lead].lead + s[sw].switch + s[closer].closer,
	})).sort((a, b) => b.total - a.total);

	return { ...ranked[0], margin: round1(ranked[0].total - ranked[1].total) };
};
