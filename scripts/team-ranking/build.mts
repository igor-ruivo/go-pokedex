// Ranks every trio of a league's best Pokémon with go-pokedex's own team rating and writes the top of the list
// to `team-ranking.json`, which the daily workflow (.github/workflows/team-ranking.yml) publishes on the `data`
// branch and the Teams page's "Top teams" tab reads.
//
//   pnpm run team-ranking     reads the inputs from a dex-server checkout (DEX_SERVER_DIR, default ../dex-server)
//                             and writes ./team-ranking.json (OUT overrides; git-ignored)
//
// The run is skipped (exit 0, GITHUB_OUTPUT skipped=true, nothing written) when the inputs hash equals the one in the
// previous published file. On a rank run, the log explains which inputs changed (or whether FORCE=1 / no previous
// ranking caused it).
//
// For each of Great / Ultra / Master League:
//   - candidates: the CANDIDATES best-ranked species (default 200), each with its ranking's recommended moveset
//     and the rank-1 IVs `team-builder.json` carries — the same inputs the builder rates a team with;
//   - every trio of them (a Shadow and its normal form never share a team) gets PvPoke's threat score from
//     `TeamEvaluator.rankTeams` (each candidate simulated once, every trio re-ranked from those columns), then the
//     Team Score the page shows: threat + typing + bulk + safety + consistency, in the lead / switch / closer
//     order the Battle plan would play it;
//   - a sample of the trios is re-rated with the ordinary `evaluate` and must agree exactly, so the shortcut
//     can't drift from the real rating unnoticed.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import type { IGamemasterPokemon } from '../../src/DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../src/DTOs/IRankedPokemon';
import type { TeamBuilderData, TeamLeague } from '../../src/DTOs/ITeamBuilder';
import { createSimContext } from '../../src/lib/pvp-sim/context';
import { inPvpokeOrder } from '../../src/lib/pvp-sim/pool-order';
import { type EvaluatorInit, TeamEvaluator } from '../../src/lib/pvp-sim/team-eval';
import { type ScoreParts, scoreTier, teamScore, threatPart } from '../../src/lib/team-analysis';
import { analyzeTeam } from '../../src/routes/teams/useTeamAnalysis';

const DEX = process.env.DEX_SERVER_DIR ?? path.join(import.meta.dirname, '..', '..', '..', 'dex-server');
const CANDIDATES = Number(process.env.CANDIDATES ?? 200);
// How many teams each published list keeps (every trio is rated; only the best TOP of each list are written out).
// The page virtualizes the lists and filters them by the Pokémon typed in the search bar.
const TOP = Number(process.env.TOP_TEAMS ?? 1000);
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
	/** Fingerprint of everything the ranking was computed from (see `inputsFingerprint`). */
	inputsHash?: string;
	/** Per-input fingerprints, for explaining why a new ranking was or wasn't needed. */
	inputHashes?: Record<string, string>;
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

/**
 * A fingerprint of everything a ranking is computed from: the dex-server files the script reads (the game master,
 * `team-builder.json` — PvPoke's moves, meta and simulator fingerprint — and the three league rankings with their
 * scores), this script's settings, and every source file the script imports, directly or not (the simulator port,
 * the team scoring…). Line endings are ignored, so a Windows and a Linux checkout agree. Same fingerprint as the
 * published file → the ranking would come out identical, so the run is skipped.
 */
const inputsFingerprint = (): { hash: string; parts: Record<string, string> } => {
	const hash = crypto.createHash('sha256');
	const parts: Record<string, string> = {};
	const add = (label: string, content: string, fingerprintKey = label) => {
		const normalized = content.replace(/\r\n/g, '\n');
		parts[fingerprintKey] = crypto.createHash('sha256').update(normalized).digest('hex');
		hash.update(label + '\0').update(normalized).update('\0');
	};

	for (const file of ['game-master.json', 'team-builder.json', ...LEAGUES.map((l) => l.file)]) {
		add(`data/${file}`, fs.readFileSync(path.join(DEX, 'data', file), 'utf8'), `dex-server:data/${file}`);
	}
	const settings = JSON.stringify({ CANDIDATES, TOP, SAMPLE_CHECKS });
	parts.settings = crypto.createHash('sha256').update(settings).digest('hex');
	hash.update(settings);

	// Walk the script's relative imports to collect its source files.
	const root = path.join(import.meta.dirname, '..', '..');
	const seen = new Set<string>();
	const visit = (file: string) => {
		if (seen.has(file)) return;
		seen.add(file);
		const source = fs.readFileSync(file, 'utf8');
		for (const m of source.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]*)['"]/g)) {
			const target = path.resolve(path.dirname(file), m[1]);
			const found = [
				target,
				...['.ts', '.tsx', '.mts', '.json'].map((e) => target + e),
				...['index.ts', 'index.tsx'].map((i) => path.join(target, i)),
			].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
			if (found) visit(found);
		}
	};
	visit(import.meta.filename);
	for (const file of [...seen].sort()) {
		const relative = path.relative(root, file).replace(/\\/g, '/');
		add(relative, fs.readFileSync(file, 'utf8'), `source:${relative}`);
	}
	return { hash: hash.digest('hex'), parts };
};

const { hash: hashNow, parts: inputHashes } = inputsFingerprint();
const force = process.env.FORCE === '1';
const changedInputs = previous?.inputHashes
	? [...new Set([...Object.keys(previous.inputHashes), ...Object.keys(inputHashes)])]
			.sort()
			.filter((key) => previous.inputHashes?.[key] !== inputHashes[key])
	: [];
const hasInputHashes = !!previous?.inputHashes && Object.keys(previous.inputHashes).length > 0;
if (previous?.inputsHash === hashNow && !force && hasInputHashes) {
	console.log(`Inputs unchanged since the published ranking (${hashNow.slice(0, 12)}) — nothing to rank.`);
	if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'skipped=true\n');
	process.exit(0);
}
if (force) {
	console.log('Recomputing ranking because FORCE=1 was set.');
	if (previous?.inputsHash === hashNow) console.log('No ranking inputs changed.');
	else if (changedInputs.length > 0) console.log(`Changed inputs: ${changedInputs.join(', ')}`);
	else console.log('Input hashes changed, but the previous ranking has no per-input fingerprints for comparison.');
} else if (!previous?.inputsHash) {
	console.log('Recomputing ranking because no previous published ranking with an inputs hash is available.');
} else if (!hasInputHashes) {
	console.log(
		'Recomputing ranking once to add per-input fingerprints to the published result; the previous result only has an overall hash.'
	);
} else if (changedInputs.length > 0) {
	console.log(`Recomputing ranking because these input hashes changed: ${changedInputs.join(', ')}`);
} else {
	console.log('Recomputing ranking because the overall inputs hash changed; per-input fingerprints are unavailable.');
}

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

	const ranking = inPvpokeOrder(
		Object.values(rankList).filter((r) => gamemaster[r.speciesId]),
		gamemaster
	).map((r) => ({
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

	// Every trio is analysed, but only the best TOP of each list are kept (pruned as they pile up, so 1.3M teams
	// never sit in memory at once). The result is exactly the top of the full sort.
	const byScoreOrder = (a: RankedTeam, b: RankedTeam) => b.score - a.score || a.threatScore - b.threatScore;
	const byThreatOrder = (a: RankedTeam, b: RankedTeam) => a.threatScore - b.threatScore || b.score - a.score;
	let byScore: Array<RankedTeam> = [];
	let byThreat: Array<RankedTeam> = [];
	const prune = (list: Array<RankedTeam>, order: typeof byScoreOrder) => list.sort(order).slice(0, TOP);
	let totalTeams = 0;
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
		const team: RankedTeam = {
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
		};
		totalTeams++;
		byScore.push(team);
		byThreat.push(team);
		if (byScore.length >= TOP * 4) {
			byScore = prune(byScore, byScoreOrder);
			byThreat = prune(byThreat, byThreatOrder);
		}
	}

	// Two rankings of the same trios: by the Team Score (the radar's weighted score — higher is better), and by
	// PvPoke's threat score alone (lower is better). The page lets you sort between them.
	const before = previous?.leagues?.[league];
	return {
		totalTeams,
		byScore: withRankChanges(prune(byScore, byScoreOrder), before?.byScore),
		byThreat: withRankChanges(prune(byThreat, byThreatOrder), before?.byThreat),
	};
};

const leagues = Object.fromEntries(LEAGUES.map((l) => [l.league, rankLeague(l)]));
fs.writeFileSync(
	OUT,
	JSON.stringify({
		generatedAt: new Date().toISOString(),
		inputsHash: hashNow,
		inputHashes,
		candidates: CANDIDATES,
		leagues,
	})
);
console.log(`Wrote ${OUT}`);
