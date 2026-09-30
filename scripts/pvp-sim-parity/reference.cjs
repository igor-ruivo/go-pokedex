// Runs PvPoke's own (unmodified) Team Builder pipeline in Node and dumps the results.
// usage: node orig.js <league:1500|2500|10000> '<json team [{speciesId, moveset:[...]}]>' > out.json
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const PV = path.join(process.env.PVPOKE_DIR || path.join(__dirname, '..', '..', '..', 'pvpoke'), 'src');
const league = parseInt(process.argv[2], 10);
const arg3 = process.argv[3]; const team = JSON.parse(arg3.startsWith('@') ? fs.readFileSync(arg3.slice(1), 'utf8') : arg3);
const groupName = { 1500: 'great', 2500: 'ultra', 10000: 'master' }[league];

const gmData = JSON.parse(fs.readFileSync(`${PV}/data/gamemaster.json`, 'utf8'));
if (!gmData.cups || !gmData.cups.length) gmData.cups = [JSON.parse(fs.readFileSync(`${PV}/data/gamemaster/cups/all.json`, 'utf8'))];
if (!gmData.formats) gmData.formats = [];
// Feed PvPoke's code the same rank-1 IVs the port uses (its simulator is IV-agnostic; only its
// *default* IVs differ from ours). IV_FILE is dex-server's `ivs` table: species -> league -> [level, a, d, h].
if (process.env.IV_FILE) {
	const ivs = JSON.parse(fs.readFileSync(process.env.IV_FILE, 'utf8'));
	for (const p of gmData.pokemon) {
		const best = ivs[p.speciesId];
		if (!best) continue;
		p.defaultIVs = { ...p.defaultIVs, cp1500: best.great, cp2500: best.ultra };
		delete p.defaultIVs.cp1500l40;
		delete p.defaultIVs.cp2500l40;
	}
}
const chain = new Proxy(function () {}, { get: () => chain, apply: () => chain });
const $ = () => chain;
$.ajax = (o) => setTimeout(() => o.success(gmData), 0);
$.each = (arr, fn) => { for (let i = 0; i < arr.length; i++) fn(i, arr[i]); };

const sandbox = {
	console: { log() {}, error: console.error, warn() {} },
	$, jQuery: $,
	host: 'http://localhost/', webRoot: '/', siteVersion: '1',
	settings: { gamemaster: 'gamemaster', matrixDirection: 'row', colorblindMode: false },
	get: null,
	window: { localStorage: { getItem: () => null }, addEventListener() {} },
	document: {},
	setTimeout, clearTimeout, setInterval, clearInterval,
	Math, JSON, Date,
};
sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
const load = (f) => { const o = process.env.UPSTREAM_JS_DIR ? path.join(process.env.UPSTREAM_JS_DIR, path.basename(f)) : ''; vm.runInContext(fs.readFileSync(o && fs.existsSync(o) ? o : `${PV}/js/${f}`, 'utf8'), ctx, { filename: f }); };

for (const f of [
	'GameMaster.js', 'battle/DamageCalculator.js', 'battle/timeline/TimelineAction.js', 'battle/timeline/TimelineEvent.js',
	'training/DecisionOption.js', 'battle/actions/ActionLogic.js', 'pokemon/Pokemon.js', 'battle/Battle.js', 'battle/rankers/TeamRanker.js',
]) load(f);

vm.runInContext(`
function getDefaultMultiBattleSettings() {
	return { shields: 1, ivs: "original", bait: 1, levelCap: 50, startHp: 1, startEnergy: 0, startCooldown: 0, optimizeMoveTiming: true, startStatBuffs: [ 0, 0 ] };
}`, ctx);

vm.runInContext('GameMaster.getInstance()', ctx);
(async () => {
await new Promise((r) => setTimeout(r, 200));
const out = vm.runInContext(
	`(function(league, teamSpec, rankingData, metaGroup, poolIds){
	var gm = GameMaster.getInstance();
	gm.rankings["alloverall" + league] = rankingData;
	var battle = new Battle();
	battle.setCP(league);
	battle.setCup("all");
	var team = [];
	for (var i = 0; i < teamSpec.length; i++) {
		var p = new Pokemon(teamSpec[i].speciesId, i, battle);
		battle.setNewPokemon(p, 0);
		p.selectMove("fast", teamSpec[i].moveset[0]);
		p.selectMove("charged", teamSpec[i].moveset[1], 0);
		if (teamSpec[i].moveset[2] && teamSpec[i].moveset[2] != "none") p.selectMove("charged", teamSpec[i].moveset[2], 1);
		p.resetMoves();
		team.push(p);
	}
	var ranker = RankerMaster.getInstance();
	ranker.setShieldMode("average");
	ranker.applySettings(getDefaultMultiBattleSettings(), 0);
	ranker.applySettings(getDefaultMultiBattleSettings(), 1);
	ranker.setMetaGroup(metaGroup);
	ranker.setPrioritizeMeta(true);
	ranker.setRecommendMoveUsage(true);
	// Golden-fixture mode: rate against a fixed, small pool (PvPoke's own "custom threats" path).
	if (poolIds) {
		var targets = poolIds.map(function(id){
			var t = new Pokemon(id, 0, battle);
			t.initialize(battle.getCP());
			t.weightModifier = 1;
			t.selectRecommendedMoveset();
			return t;
		});
		ranker.setTargets(targets);
		ranker.setRecommendMoveUsage(false);
	}
	var data = ranker.rank(team, battle.getCP(), battle.getCup(), [], "team-counters");
	var counterRankings = data.rankings;
	var counterTeam = [];
	var avg = 0;
	var i = 0;
	while (counterTeam.length < 6 && i < counterRankings.length) {
		var r = counterRankings[i];
		if (r.speciesId.indexOf("_xs") > -1 || r.pokemon.hasTag("teambuilderexclude")) { i++; continue; }
		var pokemon = r.pokemon;
		var similar = counterTeam.some(function(counter){
			var s = counter.calculateSimilarity(pokemon, pokemon && pokemon.traits, false);
			return s == -1 || s >= 1000;
		});
		if (!similar) { counterTeam.push(pokemon); avg += r.rating; }
		i++;
	}
	var members = team.map(function(t){ t.fullReset(); return { speciesId: t.speciesId, level: t.level, cp: t.cp, atk: t.stats.atk, def: t.stats.def, hp: t.stats.hp, bulk: t.getEffectiveStat(1) * t.stats.hp, consistency: t.calculateConsistency() }; });
	return {
		threatScore: Math.round(avg / 6),
		counterTeam: counterTeam.map(function(c){ return c.speciesId; }),
		order: counterRankings.map(function(r){ return r.speciesId; }),
		rows: counterRankings.map(function(r){ return { id: r.speciesId, rating: r.rating, score: r.score, ratings: r.matchups.map(function(m){ return m.rating; }) }; }),
		members: members
	};
})`,
	ctx
)(
	league,
	team,
	JSON.parse(fs.readFileSync(`${PV}/data/rankings/all/overall/rankings-${league}.json`, 'utf8')),
	JSON.parse(fs.readFileSync(`${PV}/data/groups/${groupName}.json`, 'utf8')),
	process.env.POOL_FILE ? JSON.parse(fs.readFileSync(process.env.POOL_FILE, 'utf8')) : undefined
);

process.stdout.write(JSON.stringify(out));
})();
