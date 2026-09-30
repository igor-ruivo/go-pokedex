// Runs the TypeScript port over the same inputs as reference.cjs and diffs the results. Run it from a
// dex-server checkout (it provides tsx and the parser that builds the team-builder data):
//   npx tsx <this file> <cp> @team.json <reference-output.json>
import fs from 'fs';
import path from 'path';

const DEX = process.env.DEX_SERVER_DIR ?? path.join(import.meta.dirname, '..', '..', '..', 'dex-server');

import TeamBuilderParserImport from '../../../dex-server/src/parsers/teams/team-builder-parser';
import { PVPOKE_MOVES_URL, metaGroupUrl, trainingAnalysisUrl } from '../../../dex-server/src/parsers/teams/config';
import { POKEMON_CONFIG } from '../../../dex-server/src/parsers/pokemon/config/pokemon-config';
import { TeamEvaluator } from '../../src/lib/pvp-sim/team-eval';

// dex-server is CommonJS, so from this ES module its default export arrives wrapped one level deeper.
const TeamBuilderParser = ((TeamBuilderParserImport as unknown as { default?: unknown }).default ?? TeamBuilderParserImport) as typeof TeamBuilderParserImport;

console.warn = () => {}; // the simulator-guard warns because this offline fetcher can't serve the JS sources
const PVPOKE = process.env.PVPOKE_DIR ?? path.join(import.meta.dirname, '..', '..', '..', 'pvpoke');
const PV = path.join(PVPOKE, 'src', 'data');
// `ivs <out.json>` mode writes the rank-1 IVs dex-server would ship, so PvPoke's own code can be fed the same ones.
const ivMode = process.argv[2] === 'ivs';
// `fixture <out.json>` mode writes the inputs of the golden-master test (a small pool per league).
const fixtureMode = process.argv[2] === 'fixture';
const cp = parseInt(process.argv[2], 10);
const league = ({ 1500: 'great', 2500: 'ultra', 10000: 'master' } as const)[cp as 1500 | 2500 | 10000];
const arg3 = process.argv[3];
const team = ivMode || fixtureMode ? [] : JSON.parse(arg3.startsWith('@') ? fs.readFileSync(arg3.slice(1), 'utf8') : arg3);
const orig = ivMode || fixtureMode ? {} : JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const read = (f: string) => JSON.parse(fs.readFileSync(`${PV}/${f}`, 'utf8'));

const files: Record<string, unknown> = {
	[PVPOKE_MOVES_URL]: read('gamemaster/moves.json'),
	[POKEMON_CONFIG.SOURCE_URL]: read('gamemaster/pokemon.json'),
};
for (const l of ['great', 'ultra', 'master'] as const) {
	files[metaGroupUrl(l)] = read(`groups/${l}.json`);
	files[trainingAnalysisUrl(l)] = read(`training/analysis/all/${{ great: 1500, ultra: 2500, master: 10000 }[l]}.json`);
}
const fetcher = { fetchJson: async (u: string) => files[u], fetchText: async () => '', getSkippedFetches: () => [], announceExpectedFetches() {} };

const rankings: Record<string, Array<{ speciesId: string; moveset: Array<string>; score: number; scores: Array<number> }>> = {
	great: read('rankings/all/overall/rankings-1500.json'),
	ultra: read('rankings/all/overall/rankings-2500.json'),
	master: read('rankings/all/overall/rankings-10000.json'),
};

const rawPokemon = read('gamemaster/pokemon.json') as Array<{ speciesId: string; speciesName: string; dex: number; types: Array<string>; baseStats: { atk: number; def: number; hp: number }; tags?: Array<string> }>;

// ---- golden-master fixture inputs -----------------------------------------------------------------

/** Always-in-the-pool species: the form-changers and the moveset archetypes the AI has special cases for. */
const FIXTURE_SPECIALS = [
	'aegislash_shield',
	'morpeko_full_belly',
	'mimikyu',
	'cramorant',
	'medicham',
	'ninetales_shadow',
	'talonflame_shadow',
	'annihilape_shadow',
	'azumarill',
	'stunfisk_galarian',
	'jellicent',
	'lickilicky',
	'empoleon',
	'feraligatr',
	'forretress_shadow',
	'mantine',
	'jumpluff',
];
const FIXTURE_TOP = 30;

function writeFixtureInputs(
	builder: any,
	rankings: Record<string, Array<{ speciesId: string; moveset: Array<string>; score: number; scores: Array<number> }>>,
	raw: typeof rawPokemon,
	out: string
) {
	const byId = new Map(raw.map((p) => [p.speciesId, p]));
	const leagues: Record<string, unknown> = {};
	const usedMoves = new Set<string>();
	const usedSpecies = new Set<string>();

	for (const l of ['great', 'ultra', 'master'] as const) {
		const all = rankings[l];
		const pool = all.filter((r, i) => i < FIXTURE_TOP || FIXTURE_SPECIALS.includes(r.speciesId));
		const ranking = pool.map((r) => ({
			speciesId: r.speciesId,
			moveset: r.moveset.filter((mv) => mv !== 'none'),
			score: r.score,
			switch: r.scores[2],
			charger: r.scores[3],
			consistency: r.scores[5],
			rank: all.indexOf(r) + 1,
		}));
		const species = pool.map((r) => {
			const p = byId.get(r.speciesId)!;
			return { speciesId: p.speciesId, speciesName: p.speciesName, dex: p.dex, types: p.types, baseStats: p.baseStats, isShadow: !!p.tags?.includes('shadow') };
		});
		ranking.forEach((r) => {
			usedSpecies.add(r.speciesId);
			r.moveset.forEach((mv) => usedMoves.add(mv));
		});
		// Teams: the top three, a mid-table three, and the form-changers / shadows / buff-move users.
		const ids = ranking.map((r) => r.speciesId);
		const pick = (list: Array<string>) => list.filter((id) => ids.includes(id));
		const recommended = (id: string) => ranking.find((r) => r.speciesId === id)!.moveset;
		const teamsOf = [ids.slice(0, 3), [ids[5], ids[11], ids[17]], pick(['aegislash_shield', 'morpeko_full_belly', 'mimikyu']), pick(['cramorant', 'ninetales_shadow', 'medicham']), pick(['annihilape_shadow', 'azumarill', 'forretress_shadow'])].filter((t) => t.length === 3);
		leagues[l] = { species, ranking, teams: teamsOf.map((t) => t.map((id) => ({ speciesId: id, moveset: recommended(id) }))) };
	}

	// Every move any team member or pool Pokémon (or their form swaps) could use, plus the form data itself.
	const formSpecies = Object.values(builder.forms) as Array<{ speciesId: string; fastMoves: Array<string>; chargedMoves: Array<string> }>;
	formSpecies.forEach((f) => [...f.fastMoves, ...f.chargedMoves].forEach((mv) => usedMoves.add(mv)));
	['SPLASH', 'STRUGGLE', 'GULP_MISSILE_ARROKUDA', 'GULP_MISSILE_PIKACHU'].forEach((mv) => usedMoves.add(mv));
	for (const l of Object.values(leagues) as Array<{ species: Array<{ speciesId: string }> }>) l.species.forEach((s) => usedSpecies.add(s.speciesId));
	formSpecies.forEach((f) => usedSpecies.add(f.speciesId));

	const pick = <T,>(table: Record<string, T>, keys: Set<string>) => Object.fromEntries(Object.entries(table).filter(([k]) => keys.has(k)));
	fs.writeFileSync(
		out,
		JSON.stringify({
			builder: {
				moves: pick(builder.moves, usedMoves),
				ivs: pick(builder.ivs, usedSpecies),
				forms: builder.forms,
				excludedThreats: builder.excludedThreats,
				meta: builder.meta,
			},
			leagues,
		})
	);
}

(async () => {
	const gameMaster = JSON.parse(fs.readFileSync(path.join(DEX, 'data', 'game-master.json'), 'utf8'));
	const parser = new TeamBuilderParser(fetcher as never, gameMaster);
	const speciesSearchMetadata = JSON.parse(fs.readFileSync(path.join(DEX, 'data', 'species-search-metadata.json'), 'utf8'));
	const { builder } = await parser.parse({
		great: rankings.great.map((r) => r.speciesId),
		ultra: rankings.ultra.map((r) => r.speciesId),
		master: rankings.master.map((r) => r.speciesId),
	}, speciesSearchMetadata);

	if (ivMode) {
		fs.writeFileSync(process.argv[3], JSON.stringify(builder.ivs));
		return;
	}

	if (fixtureMode) {
		writeFixtureInputs(builder, rankings, rawPokemon, process.argv[3]);
		return;
	}

	const byId = new Map(rawPokemon.map((p) => [p.speciesId, p]));
	const ranking = rankings[league].map((r, i) => ({
		speciesId: r.speciesId,
		moveset: r.moveset.filter((m) => m !== 'none'),
		score: r.score,
		switch: r.scores[2],
		charger: r.scores[3],
		consistency: r.scores[5],
		rank: i + 1,
	}));
	const species = ranking
		.map((r) => byId.get(r.speciesId)!)
		.map((p) => ({ speciesId: p.speciesId, speciesName: p.speciesName, dex: p.dex, types: p.types, baseStats: p.baseStats, isShadow: !!p.tags?.includes('shadow') }));

	const t0 = Date.now();
	const evaluator = new TeamEvaluator({ league, builder: builder as never, species, ranking });
	const t1 = Date.now();
	const result = evaluator.evaluate(team);
	const t2 = Date.now();
	console.log(`init ${t1 - t0}ms, evaluate ${t2 - t1}ms, pool ${result.poolSize}`);

	const mineRows = new Map<string, { rating: number; ratings: Array<number> }>();
	// full rows aren't exposed; compare the picked threats + threat score
	for (const t of result.threats) mineRows.set(t.speciesId, { rating: t.rating, ratings: t.ratings });

	console.log('threatScore mine', result.threatScore, 'orig', orig.threatScore);
	console.log('threats mine', result.threats.map((t) => t.speciesId).join(','));
	console.log('threats orig', orig.counterTeam.join(','));
	let bad = 0;
	for (const t of result.threats) {
		const o = orig.rows.find((r: { id: string }) => r.id === t.speciesId);
		if (!o) continue;
		const same = JSON.stringify(o.ratings) === JSON.stringify(t.ratings);
		if (!same) {
			bad++;
			console.log('  MISMATCH', t.speciesId, 'mine', t.ratings, 'orig', o.ratings);
		}
	}
	console.log(bad === 0 ? 'picked-threat ratings identical' : `${bad} picked-threat rating mismatches`);
	console.log('members mine', result.members.map((m) => [m.speciesId, m.level, m.cp, Math.round(m.bulk), m.consistency].join('/')).join(' | '));
	console.log('members orig', orig.members.map((m: { speciesId: string; level: number; cp: number; bulk: number; consistency: number }) => [m.speciesId, m.level, m.cp, Math.round(m.bulk), m.consistency].join('/')).join(' | '));
})();
