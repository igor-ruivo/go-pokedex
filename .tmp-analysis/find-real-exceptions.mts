import {
	calculateCP,
	computeBestIVs,
	fetchReachablePokemonIncludingSelf,
	levelToLevelIndex,
} from '../src/utils/pokemon-helper';
import type { IGamemasterPokemon } from '../src/DTOs/IGamemasterPokemon';

const GAMEMASTER_URL =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const CAPS = [1500, 2500] as const;
const LEVEL_50_INDEX = levelToLevelIndex(50);
const CP_THRESHOLD_RATIO = 0.9;

const bucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));
const matchesDefault = (ivs: { A: number; D: number; S: number }) => {
	const a = bucket(ivs.A), d = bucket(ivs.D), s = bucket(ivs.S);
	return a <= 1 && d >= 3 && s >= 3;
};
const matchesMaster = (ivs: { A: number; D: number; S: number }) => {
	const a = bucket(ivs.A), d = bucket(ivs.D), s = bucket(ivs.S);
	return a >= 3 && d >= 3 && s >= 3;
};
const isProtectedByBlanket = (ivs: { A: number; D: number; S: number }) => matchesDefault(ivs) || matchesMaster(ivs);

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter(
		(p) => !p.aliasId && !p.isMega && !p.isShadow && !p.isLegendary && !p.isMythical && !p.isBeast
	);

	const bestCache = new Map<string, { A: number; D: number; S: number } | null>();
	const getBest = (r: IGamemasterPokemon, cap: number) => {
		const key = `${r.speciesId}|${cap}`;
		if (bestCache.has(key)) return bestCache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) { bestCache.set(key, null); return null; }
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		bestCache.set(key, best.IVs);
		return best.IVs;
	};

	// For each species: is it protected via ANY reachable stage's best pattern (at
	// either cap) already falling inside a blanket rule? If not, it truly needs
	// its own carve-out — using whichever reachable stage's pattern is the one
	// that should protect it (mirroring Tab 1: a pre-evolution's fate follows its
	// reachable evolutions, since IVs carry over unchanged).
	const needsCarveOut: Array<{
		speciesId: string; dex: number; speciesName: string; via: string; pattern1500: string | null; pattern2500: string | null;
	}> = [];

	let blanketProtectedCount = 0;

	for (const p of candidates) {
		const reachable = Array.from(
			fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow && !r.isLegendary && !r.isMythical && !r.isBeast)
		);

		let protectedByBlanket = false;
		let via = p.speciesId;
		let pattern1500: string | null = null;
		let pattern2500: string | null = null;

		for (const r of reachable) {
			const b1500 = getBest(r, 1500);
			const b2500 = getBest(r, 2500);
			const ok1500 = b1500 ? isProtectedByBlanket(b1500) : true; // never reaches cap -> irrelevant, treat as fine
			const ok2500 = b2500 ? isProtectedByBlanket(b2500) : true;
			if (ok1500 && ok2500) {
				protectedByBlanket = true;
				break;
			}
		}

		if (!protectedByBlanket) {
			// find one reachable stage to base the carve-out on: prefer one where at
			// least one cap actually binds (has a real best pattern)
			const withData = reachable.find((r) => getBest(r, 1500) || getBest(r, 2500)) ?? p;
			const b1500 = getBest(withData, 1500);
			const b2500 = getBest(withData, 2500);
			needsCarveOut.push({
				speciesId: p.speciesId,
				dex: p.dex,
				speciesName: p.speciesName,
				via: withData.speciesId,
				pattern1500: b1500 ? `A${b1500.A}D${b1500.D}S${b1500.S}` : null,
				pattern2500: b2500 ? `A${b2500.A}D${b2500.D}S${b2500.S}` : null,
			});
		} else {
			blanketProtectedCount++;
		}
	}

	console.log(`${candidates.length} candidates (non-alias/mega/shadow/legendary/mythical/UB)`);
	console.log(`${blanketProtectedCount} already protected by a blanket rule (Master or shared Great/Ultra default) via some reachable stage — no carve-out needed`);
	console.log(`${needsCarveOut.length} genuinely need their own dedicated carve-out`);

	needsCarveOut.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
	console.log(`\n-- species needing a dedicated carve-out --`);
	for (const e of needsCarveOut) {
		console.log(`  #${e.dex}\t${e.speciesId}\t(${e.speciesName})  via ${e.via}: 1500=${e.pattern1500 ?? 'n/a'}  2500=${e.pattern2500 ?? 'n/a'}`);
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
