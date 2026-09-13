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
	const domainFilter = (r: IGamemasterPokemon) =>
		!r.aliasId && !r.isMega && !r.isShadow && !r.isLegendary && !r.isMythical && !r.isBeast;

	// Check 1: does the candidate set contain ANY mega/legendary/mythical/UB/shadow entry?
	const tainted = candidates.filter((p) => p.isMega || p.isShadow || p.isLegendary || p.isMythical || p.isBeast);
	console.log(`Check 1 — candidates that are mega/shadow/legendary/mythical/UB: ${tainted.length} (should be 0)`);

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

	const carveOuts: Array<{ p: IGamemasterPokemon; via: IGamemasterPokemon; cap: number; pattern: { A: number; D: number; S: number } }> = [];
	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));
		for (const cap of CAPS) {
			const distinctPatterns = new Map<string, { via: IGamemasterPokemon; best: { A: number; D: number; S: number } }>();
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) continue;
				const k = `${bucket(best.A)}-${bucket(best.D)}-${bucket(best.S)}`;
				if (!distinctPatterns.has(k)) distinctPatterns.set(k, { via: r, best });
			}
			for (const { via, best } of distinctPatterns.values()) carveOuts.push({ p, via, cap, pattern: best });
		}
	}

	// Check 1b: does any carve-out's "via" (the reachable stage the pattern came from) land on a special-category mon?
	const viaTainted = carveOuts.filter((c) => c.via.isMega || c.via.isShadow || c.via.isLegendary || c.via.isMythical || c.via.isBeast);
	console.log(`Check 1b — carve-outs sourced from a mega/shadow/legendary/mythical/UB reachable stage: ${viaTainted.length} (should be 0)`);

	// Check 2: does any carve-out pattern equal exactly (bucket4, bucket4, bucket4) — the hundo, already covered by !4*?
	const hundoPatterns = carveOuts.filter(
		(c) => bucket(c.pattern.A) === 4 && bucket(c.pattern.D) === 4 && bucket(c.pattern.S) === 4
	);
	console.log(`Check 2 — carve-outs whose pattern is exactly bucket4/4/4 (redundant with !4*): ${hundoPatterns.length} (should be 0)`);
	for (const c of hundoPatterns) {
		console.log(`  ${c.p.speciesId} @ ${c.cap} via ${c.via.speciesId}: A${c.pattern.A} D${c.pattern.D} S${c.pattern.S}`);
	}

	// Also double check: can isProtectedByBlanket ever be false for a (4,4,4) pattern? (should be impossible, matchesMaster requires only >=3)
	console.log(`\nSanity: isProtectedByBlanket({A:15,D:15,S:15}) = ${isProtectedByBlanket({ A: 15, D: 15, S: 15 })} (must be true)`);
};
main().catch((e) => { console.error(e); process.exit(1); });
