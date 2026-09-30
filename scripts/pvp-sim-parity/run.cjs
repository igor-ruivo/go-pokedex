// Parity check: PvPoke's own, unmodified JavaScript vs go-pokedex's TypeScript port of its simulator,
// over a handful of teams (shadows, form-changers, all three leagues, a custom moveset).
//
//   node scripts/pvp-sim-parity/run.cjs
//
// Expects PvPoke and dex-server checked out next to this repo (or PVPOKE_DIR / DEX_SERVER_DIR set).
// PvPoke's simulator sources are downloaded fresh from GitHub first, so this checks the port against
// what PvPoke runs *today*, whatever the local checkout holds. Exits non-zero on any mismatch.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PVPOKE = process.env.PVPOKE_DIR || path.join(ROOT, '..', 'pvpoke');
const DEX = process.env.DEX_SERVER_DIR || path.join(ROOT, '..', 'dex-server');
const RAW = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/js';
const SOURCES = [
	'battle/Battle.js',
	'battle/actions/ActionLogic.js',
	'pokemon/Pokemon.js',
	'battle/DamageCalculator.js',
	'battle/rankers/TeamRanker.js',
];

const rankings = (cp) => require(path.join(PVPOKE, 'src', 'data', 'rankings', 'all', 'overall', `rankings-${cp}.json`));
const recommended = (cp, ids) =>
	ids.map((id) => {
		const r = rankings(cp).find((x) => x.speciesId === id);
		if (!r) throw new Error(`${id} isn't ranked in ${cp}`);
		return { speciesId: id, moveset: r.moveset.filter((m) => m !== 'none') };
	});
const top = (cp, from, count) => rankings(cp).slice(from, from + count).map((x) => x.speciesId);

const TEAMS = [
	[1500, recommended(1500, ['aegislash_shield', 'morpeko_full_belly', 'mimikyu'])],
	[1500, recommended(1500, ['cramorant', 'ninetales_shadow', 'talonflame_shadow'])],
	[2500, recommended(2500, top(2500, 0, 3))],
	[2500, recommended(2500, top(2500, 5, 3))],
	[10000, recommended(10000, top(10000, 0, 3))],
	[10000, recommended(10000, top(10000, 10, 3))],
	[1500, recommended(1500, top(1500, 20, 3))],
	[
		1500,
		[
			{ speciesId: 'azumarill', moveset: ['BUBBLE', 'HYDRO_PUMP', 'PLAY_ROUGH'] },
			{ speciesId: 'lickilicky', moveset: ['ROLLOUT', 'BODY_SLAM', 'SHADOW_BALL'] },
			{ speciesId: 'jellicent', moveset: ['HEX', 'SURF', 'ICE_BEAM'] },
		],
	],
];

(async () => {
	const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-sim-parity-'));
	const upstream = path.join(work, 'upstream');
	fs.mkdirSync(upstream);
	for (const file of SOURCES) {
		const res = await fetch(`${RAW}/${file}`);
		if (!res.ok) throw new Error(`Couldn't download ${file} (HTTP ${res.status})`);
		fs.writeFileSync(path.join(upstream, path.basename(file)), await res.text());
	}

	// Rank-1 IVs exactly as dex-server ships them, handed to PvPoke's own code too.
	const ivFile = path.join(work, 'ivs.json');
	execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', path.join(__dirname, 'compare.mts'), 'ivs', ivFile], {
		cwd: DEX,
		maxBuffer: 1e9,
		shell: process.platform === 'win32',
		env: { ...process.env, PVPOKE_DIR: PVPOKE, DEX_SERVER_DIR: DEX },
	});

	let failures = 0;
	TEAMS.forEach(([cp, team], i) => {
		const teamFile = path.join(work, `team${i}.json`);
		const refFile = path.join(work, `reference${i}.json`);
		fs.writeFileSync(teamFile, JSON.stringify(team));

		fs.writeFileSync(
			refFile,
			execFileSync('node', [path.join(__dirname, 'reference.cjs'), String(cp), `@${teamFile}`], {
				maxBuffer: 1e9,
				env: { ...process.env, PVPOKE_DIR: PVPOKE, UPSTREAM_JS_DIR: upstream, IV_FILE: ivFile },
			})
		);

		const out = execFileSync(
			process.platform === 'win32' ? 'npx.cmd' : 'npx',
			['tsx', path.join(__dirname, 'compare.mts'), String(cp), `@${teamFile}`, refFile],
			{ cwd: DEX, maxBuffer: 1e9, shell: process.platform === 'win32', env: { ...process.env, PVPOKE_DIR: PVPOKE, DEX_SERVER_DIR: DEX } }
		).toString();

		const scoreOk = /threatScore mine (\d+) orig \1\b/.test(out);
		const ratingsOk = /picked-threat ratings identical/.test(out) && !/MISMATCH/.test(out);
		const threatsOk = /threats mine (.*)/.exec(out)[1] === /threats orig (.*)/.exec(out)[1];
		const ok = scoreOk && ratingsOk && threatsOk;
		console.log(`${ok ? 'OK  ' : 'DIFF'} ${cp} ${team.map((t) => t.speciesId).join(' + ')}  ${/threatScore.*/.exec(out)[0]}`);
		if (!ok) {
			failures++;
			console.log(out);
		}
	});

	fs.rmSync(work, { recursive: true, force: true });
	console.log(failures === 0 ? '\nParity OK.' : `\n${failures} team(s) differ — the port no longer matches PvPoke.`);
	process.exit(failures === 0 ? 0 : 1);
})();
