// Regenerates the golden-master fixture the port's vitest suite is checked against:
//
//   node scripts/pvp-sim-parity/make-golden.cjs
//
// A small pool of Pokémon per league, a few teams (form-changers, shadows, self-buff / self-debuff move
// users…), and — the point — the ratings PvPoke's own, unmodified JavaScript produces for them, with the
// same rank-1 IVs. `src/lib/pvp-sim/pvp-sim-golden.test.ts` then requires the TypeScript port to
// reproduce every number, so any change to its battle logic (or an intentional one, made after diffing
// PvPoke) shows up as a failing test with the exact matchups that moved.
//
// Only regenerate when PvPoke's simulator has changed and the port has been updated to match; commit the
// new fixture together with that port change.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PVPOKE = process.env.PVPOKE_DIR || path.join(ROOT, '..', 'pvpoke');
const DEX = process.env.DEX_SERVER_DIR || path.join(ROOT, '..', 'dex-server');
const RAW = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/js';
const SOURCES = ['battle/Battle.js', 'battle/actions/ActionLogic.js', 'pokemon/Pokemon.js', 'battle/DamageCalculator.js', 'battle/rankers/TeamRanker.js', 'interface/TeamInterface.js'];
const CP = { great: 1500, ultra: 2500, master: 10000 };
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

(async () => {
	const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-sim-golden-'));
	const upstream = path.join(work, 'upstream');
	fs.mkdirSync(upstream);

	const hashes = {};
	for (const file of SOURCES) {
		const text = await (await fetch(`${RAW}/${file}`)).text();
		fs.writeFileSync(path.join(upstream, path.basename(file)), text);
		hashes[`js/${file}`] = crypto.createHash('sha256').update(text.replace(/\r/g, '')).digest('hex');
	}

	const inputFile = path.join(work, 'fixture-inputs.json');
	execFileSync(npx, ['tsx', path.join(__dirname, 'compare.mts'), 'fixture', inputFile], {
		cwd: DEX,
		shell: process.platform === 'win32',
		env: { ...process.env, PVPOKE_DIR: PVPOKE, DEX_SERVER_DIR: DEX },
	});
	const fixture = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

	const ivFile = path.join(work, 'ivs.json');
	fs.writeFileSync(ivFile, JSON.stringify(fixture.builder.ivs));

	for (const [league, data] of Object.entries(fixture.leagues)) {
		const poolFile = path.join(work, `${league}-pool.json`);
		fs.writeFileSync(poolFile, JSON.stringify(data.ranking.map((r) => r.speciesId)));

		data.teams = data.teams.map((team, i) => {
			const teamFile = path.join(work, `${league}-team${i}.json`);
			fs.writeFileSync(teamFile, JSON.stringify(team));
			const out = JSON.parse(
				execFileSync('node', [path.join(__dirname, 'reference.cjs'), String(CP[league]), `@${teamFile}`], {
					maxBuffer: 1e9,
					env: { ...process.env, PVPOKE_DIR: PVPOKE, UPSTREAM_JS_DIR: upstream, IV_FILE: ivFile, POOL_FILE: poolFile },
				})
			);
			return {
				team,
				expected: {
					threatScore: out.threatScore,
					threats: out.counterTeam,
					matchups: Object.fromEntries(out.rows.map((r) => [r.id, r.ratings])),
					members: out.members.map((m) => ({ speciesId: m.speciesId, level: m.level, cp: m.cp, bulk: m.bulk, consistency: m.consistency })),
				},
			};
		});
		console.log(`${league}: ${data.ranking.length} pool Pokémon, ${data.teams.length} teams`);
	}

	const target = path.join(ROOT, 'src', 'lib', 'pvp-sim', '__fixtures__', 'golden.json');
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(
		target,
		JSON.stringify({ generatedFrom: hashes, ...fixture })
	);
	fs.rmSync(work, { recursive: true, force: true });
	console.log(`Wrote ${path.relative(ROOT, target)} (${(fs.statSync(target).size / 1024).toFixed(0)} KB)`);
})();
