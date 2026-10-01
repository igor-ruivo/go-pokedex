// Ranks every trio of a league's best Pokémon with go-pokedex's own team rating and writes the top of the list
// to `team-ranking.json`, which the daily workflow (.github/workflows/team-ranking.yml) publishes on the `data`
// branch and the Teams page's "Top teams" tab reads.
//
//   pnpm run team-ranking     reads the inputs from a dex-server checkout (DEX_SERVER_DIR, default ../dex-server)
//                             and writes ./team-ranking.json (OUT overrides; git-ignored)
//
// For each of Great / Ultra / Master League:
//   - candidates: the CANDIDATES best-ranked species (default 50), each with its ranking's recommended moveset
//     and the rank-1 IVs `team-builder.json` carries — the same inputs the builder rates a team with;
//   - every trio of them (a Shadow and its normal form never share a team) gets PvPoke's threat score from
//     `TeamEvaluator.rankTeams` (each candidate simulated once, every trio re-ranked from those columns), then the
//     Team Score the page shows: threat + typing + bulk + safety + consistency, in the lead / switch / closer
//     order the Battle plan would play it;
//   - a sample of the trios is re-rated with the ordinary `evaluate` and must agree exactly, so the shortcut
//     can't drift from the real rating unnoticed.
import fs from 'fs';
import path from 'path';

import type { IGamemasterPokemon } from '../../src/DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../src/DTOs/IRankedPokemon';
import type { TeamBuilderData, TeamLeague } from '../../src/DTOs/ITeamBuilder';
import { createSimContext } from '../../src/lib/pvp-sim/context';
import { type EvaluatorInit, TeamEvaluator } from '../../src/lib/pvp-sim/team-eval';
import { type ScoreParts, scoreTier, teamScore, threatPart } from '../../src/lib/team-analysis';
import { analyzeTeam } from '../../src/routes/teams/useTeamAnalysis';

const DEX = process.env.DEX_SERVER_DIR ?? path.join(import.meta.dirname, '..', '..', '..', 'dex-server');
const CANDIDATES = Number(process.env.CANDIDATES ?? 50);
const TOP = Number(process.env.TOP_TEAMS ?? 100);
const SAMPLE_CHECKS = 6;
const OUT = process.env.OUT ?? path.join(import.meta.dirname, '..', '..', 'team-ranking.json');
// The previous run's file (the workflow downloads it from the data branch first). Without it there is nothing to compare.
const PREVIOUS = process.env.PREVIOUS;

const LEAGUES: Array<{ league: TeamLeague; file: string }> = [
	{ league: 'great', file: 'great-league-pvp.json' },
	{ league: 'ultra', file: 'ultra-league-pvp.json' },
	{ league: 'master', file: 'master-league-pvp.json' },
];

const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(DEX, 'data', file), 'utf8')) as T;
const round1 = (n: number) => Math.round(n * 10) / 10;

const gamemaster = read<Record<string, IGamemasterPokemon>>('game-master.json');
const builder = read<TeamBuilderData>('team-builder.json');
// Same stance as the page itself: if PvPoke's simulator changed and the port hasn't been re-verified, publish nothing.
if (!builder.simulator.verified) {
	throw new Error(`PvPoke's simulator is unverified (${[...builder.simulator.changedSources, ...builder.simulator.unknownMechanics].join(', ')}) — not publishing a team ranking`);
}

interface PreviousRanking {
	generatedAt?: string;
	leagues?: Partial<Record<TeamLeague, { byScore?: Array<RankedTeam>; byThreat?: Array<RankedTeam> }>>;
}

const previous: PreviousRanking | undefined = (() => {
	if (!PREVIOUS || !fs.existsSync(PREVIOUS)) return undefined;
	try {
		return JSON.parse(fs.readFileSync(PREVIOUS, 'utf8')) as PreviousRanking;
	} catch {
		return undefined;
	}
})();
const today = new Date().toISOString().slice(0, 10);
/** A re-run on the same day keeps the changes already published, instead of comparing today with itself. */
const previousIsToday = previous?.generatedAt?.slice(0, 10) === today;

/** The same three Pokémon with the same moves are the same team, whatever order they were listed in. */
const teamKey = (team: { members: Array<{ speciesId: string; moveset: Array<string> }> }) =>
	team.members
		.map((m) => [m.speciesId, ...m.moveset].join('-'))
		.sort()
		.join('|');

/**
 * Places gained (positive) or lost (negative) since the previous ranking, for each team of one list. Teams that
 * weren't in the previous top list, and teams that didn't move, carry no figure.
 */
const withRankChanges = (list: Array<RankedTeam>, before: Array<RankedTeam> | undefined): Array<RankedTeam> => {
	if (!before) return list;
	const position = new Map(before.map((team, i) => [teamKey(team), { index: i, team }] as const));
	return list.map((team, i) => {
		const was = position.get(teamKey(team));
		if (!was) return team;
		const change = previousIsToday ? was.team.rankChange : was.index - i;
		return change ? { ...team, rankChange: change } : team;
	});
};

interface RankedTeam {
	/** In the order the Battle plan plays them: lead, switch, closer. */
	members: Array<{ speciesId: string; moveset: Array<string> }>;
	score: number;
	tier: string;
	threatScore: number;
	/** Places gained (+) or lost (−) in this list since the previous ranking; absent for new or unmoved teams. */
	rankChange?: number;
	parts: Record<keyof ScoreParts, number>;
}

const rankLeague = ({ league, file }: (typeof LEAGUES)[number]) => {
	const rankList = read<Record<string, IRankedPokemon>>(file);
	const moveset = (id: string) => rankList[id].moveset.filter((m) => m !== 'none');

	const ranking = Object.values(rankList)
		.filter((r) => gamemaster[r.speciesId])
		.map((r) => ({
			speciesId: r.speciesId,
			moveset: r.moveset.filter((m) => m !== 'none'),
			score: r.score,
			lead: r.lead,
			switch: r.switch,
			closer: r.closer,
			charger: r.charger,
			consistency: r.consistency,
			rank: r.rank,
		}));

	const init: EvaluatorInit = {
		league,
		builder,
		ranking,
		species: ranking.map(({ speciesId }) => {
			const p = gamemaster[speciesId];
			return {
				speciesId: p.speciesId,
				speciesName: p.speciesName,
				dex: p.dex,
				types: p.types.map(String),
				baseStats: p.baseStats,
				isShadow: p.isShadow,
			};
		}),
	};
	const evaluator = new TeamEvaluator(init);

	const candidates = [...ranking]
		.sort((a, b) => a.rank - b.rank)
		.filter((r) => !r.speciesId.includes('_xs') && r.moveset.length > 0 && r.moveset.every((m) => builder.moves[m]))
		.slice(0, CANDIDATES)
		.map((r) => r.speciesId);

	console.log(`${league}: ${candidates.length} candidates → rating every trio…`);
	const started = Date.now();
	const rated = evaluator.rankTeams(candidates);
	console.log(`${league}: ${rated.length} trios rated in ${((Date.now() - started) / 1000).toFixed(1)}s`);

	// A sample of the trios must come out the same through the ordinary rating.
	const step = Math.max(1, Math.floor(rated.length / SAMPLE_CHECKS));
	for (let i = 0; i < rated.length; i += step) {
		const { speciesIds, threatScore } = rated[i];
		const expected = evaluator.evaluate(speciesIds.map((id) => ({ speciesId: id, moveset: moveset(id) }))).threatScore;
		if (expected !== threatScore) {
			throw new Error(`${league}: ${speciesIds.join(' + ')} rates ${threatScore} here but ${expected} through evaluate()`);
		}
	}

	const ctx = createSimContext(league, builder, (id) => init.species.find((s) => s.speciesId === id));
	const data = { gamemaster, rankList };

	const teams: Array<RankedTeam> = [];
	for (const { speciesIds, threatScore } of rated) {
		const slots = speciesIds.map((id) => ({ speciesId: id, moveset: moveset(id) }));
		const analysis = analyzeTeam(league, ctx, data, slots);
		if (!analysis) continue;

		const parts: ScoreParts = {
			threat: threatPart(threatScore),
			defense: analysis.defense.score,
			offense: analysis.offense.score,
			bulk: analysis.grades.bulk.part,
			safety: analysis.grades.safety.part,
			consistency: analysis.grades.consistency.part,
		};
		const score = teamScore(parts);
		if (score === undefined) continue;

		const order = analysis.roles ? [analysis.roles.order.lead, analysis.roles.order.switch, analysis.roles.order.closer] : [0, 1, 2];
		teams.push({
			members: order.map((i) => slots[i]),
			score: round1(score),
			tier: scoreTier(score),
			threatScore,
			parts: {
				threat: round1(parts.threat ?? 0),
				defense: round1(parts.defense),
				offense: round1(parts.offense),
				bulk: round1(parts.bulk),
				safety: round1(parts.safety),
				consistency: round1(parts.consistency),
			},
		});
	}

	// Two rankings of the same trios: by the Team Score (the radar's weighted score — higher is better), and by
	// PvPoke's threat score alone (lower is better). The page lets you sort between them.
	const byScore = [...teams].sort((a, b) => b.score - a.score || a.threatScore - b.threatScore).slice(0, TOP);
	const byThreat = [...teams].sort((a, b) => a.threatScore - b.threatScore || b.score - a.score).slice(0, TOP);
	const before = previous?.leagues?.[league];
	return {
		totalTeams: teams.length,
		byScore: withRankChanges(byScore, before?.byScore),
		byThreat: withRankChanges(byThreat, before?.byThreat),
	};
};

const leagues = Object.fromEntries(LEAGUES.map((l) => [l.league, rankLeague(l)]));
fs.writeFileSync(
	OUT,
	JSON.stringify({ generatedAt: new Date().toISOString(), candidates: CANDIDATES, leagues })
);
console.log(`Wrote ${OUT}`);
