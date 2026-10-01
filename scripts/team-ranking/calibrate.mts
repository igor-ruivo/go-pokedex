// One-off helper: measures where bad, average and good teams fall on each part of the Team Score (and on the score
// itself), so the fixed floors and ceilings in `src/lib/team-analysis.ts` (SCORE_ANCHORS) can be chosen from data
// instead of guessed, and checked afterwards.
//
//   npx tsx scripts/team-ranking/calibrate.mts      reads a dex-server checkout (DEX_SERVER_DIR, default ../dex-server)
//
// Two populations per league, each rated exactly like the ranking job rates a trio (every trio of K candidates):
//   - "random": K species drawn at random from the whole ranking (what a team built without thought looks like);
//   - "meta":   the K best-ranked species (what the published top teams are drawn from).
// It prints the quantiles of each raw part. Nothing is written.
import fs from 'fs';
import path from 'path';

import type { IGamemasterPokemon } from '../../src/DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../src/DTOs/IRankedPokemon';
import type { TeamBuilderData, TeamLeague } from '../../src/DTOs/ITeamBuilder';
import { createSimContext } from '../../src/lib/pvp-sim/context';
import { type EvaluatorInit, TeamEvaluator } from '../../src/lib/pvp-sim/team-eval';
import { SCORE_ANCHORS, type ScoreParts, teamScore, threatPart } from '../../src/lib/team-analysis';
import { analyzeTeam } from '../../src/routes/teams/useTeamAnalysis';

const DEX = process.env.DEX_SERVER_DIR ?? path.join(import.meta.dirname, '..', '..', '..', 'dex-server');
const K = Number(process.env.K ?? 80);
// DUMP=<file> also writes every rated trio's raw numbers (threat score, defense, offense, average bulk, safety and
// consistency) so floors and ceilings can be tried out offline.
const DUMP = process.env.DUMP;
const dump: Record<string, Array<Array<number>>> = {};
const SEED = Number(process.env.SEED ?? 7);

const LEAGUES: Array<{ league: TeamLeague; file: string }> = [
	{ league: 'great', file: 'great-league-pvp.json' },
	{ league: 'ultra', file: 'ultra-league-pvp.json' },
	{ league: 'master', file: 'master-league-pvp.json' },
];

const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(DEX, 'data', file), 'utf8')) as T;
const gamemaster = read<Record<string, IGamemasterPokemon>>('game-master.json');
const builder = read<TeamBuilderData>('team-builder.json');

/** A small seeded generator, so a run can be repeated. */
const rng = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const METRICS = ['threat', 'defense', 'offense', 'bulk', 'safety', 'consistency', 'score'] as const;
type Metric = (typeof METRICS)[number];
const QUANTILES = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999];

const quantile = (sorted: Array<number>, q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

const run = ({ league, file }: (typeof LEAGUES)[number]) => {
	const rankList = read<Record<string, IRankedPokemon>>(file);
	const moveset = (id: string) => rankList[id].moveset.filter((m) => m !== 'none');
	const ranking = Object.values(rankList)
		.filter((r) => gamemaster[r.speciesId])
		.map((r) => ({
			speciesId: r.speciesId,
			moveset: moveset(r.speciesId),
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
	const ctx = createSimContext(league, builder, (id) => init.species.find((s) => s.speciesId === id));
	const data = { gamemaster, rankList };

	const usable = [...ranking]
		.sort((a, b) => a.rank - b.rank)
		.filter((r) => !r.speciesId.includes('_xs') && r.moveset.length > 0 && r.moveset.every((m) => builder.moves[m]));

	const populations: Record<string, Array<string>> = {
		meta: usable.slice(0, K).map((r) => r.speciesId),
		random: (() => {
			const next = rng(SEED);
			const pool = [...usable];
			const picked: Array<string> = [];
			while (picked.length < K && pool.length) picked.push(pool.splice(Math.floor(next() * pool.length), 1)[0].speciesId);
			return picked;
		})(),
	};

	for (const [name, candidates] of Object.entries(populations)) {
		const started = Date.now();
		const rated = evaluator.rankTeams(candidates);
		const columns: Record<Metric, Array<number>> = {
			threat: [],
			defense: [],
			offense: [],
			bulk: [],
			safety: [],
			consistency: [],
			score: [],
		};
		for (const { speciesIds, threatScore } of rated) {
			const analysis = analyzeTeam(
				league,
				ctx,
				data,
				speciesIds.map((id) => ({ speciesId: id, moveset: moveset(id) }))
			);
			if (!analysis) continue;
			const parts: ScoreParts = {
				threat: threatPart(threatScore),
				defense: analysis.defense.score,
				offense: analysis.offense.score,
				bulk: analysis.grades.bulk.part,
				safety: analysis.grades.safety.part,
				consistency: analysis.grades.consistency.part,
			};
			columns.threat.push(parts.threat ?? 0);
			columns.defense.push(parts.defense);
			columns.offense.push(parts.offense);
			columns.bulk.push(parts.bulk);
			columns.safety.push(parts.safety);
			columns.consistency.push(parts.consistency);
			columns.score.push(teamScore(parts) ?? 0);
			if (DUMP) {
				const { defense: d, offense: o } = SCORE_ANCHORS;
				(dump[`${league}/${name}`] ??= []).push([
					threatScore,
					d.floor + (parts.defense / 100) * (d.ceiling - d.floor),
					o.floor + (parts.offense / 100) * (o.ceiling - o.floor),
					analysis.totals.averageBulk,
					analysis.totals.averageSafety,
					analysis.totals.averageConsistency,
				]);
			}
		}
		console.log(`\n== ${league} / ${name}: ${columns.score.length} trios (${((Date.now() - started) / 1000).toFixed(0)}s)`);
		const rows = METRICS.map((metric) => {
			const sorted = [...columns[metric]].sort((a, b) => a - b);
			return { metric, min: Math.round(sorted[0]), ...Object.fromEntries(QUANTILES.map((q) => [`p${q * 100}`, Math.round(quantile(sorted, q))])), max: Math.round(sorted[sorted.length - 1]) };
		});
		console.table(rows);
	}
};

for (const l of LEAGUES) run(l);
if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(dump));
