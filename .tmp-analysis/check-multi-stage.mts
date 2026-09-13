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
const key = (ivs: { A: number; D: number; S: number }) => `A${bucket(ivs.A)}D${bucket(ivs.D)}S${bucket(ivs.S)}`;

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter(
		(p) => !p.aliasId && !p.isMega && !p.isShadow && !p.isLegendary && !p.isMythical && !p.isBeast
	);
	const domainFilter = (r: IGamemasterPokemon) =>
		!r.aliasId && !r.isMega && !r.isShadow && !r.isLegendary && !r.isMythical && !r.isBeast;

	const bestCache = new Map<string, { A: number; D: number; S: number } | null>();
	const getBest = (r: IGamemasterPokemon, cap: number) => {
		const k = `${r.speciesId}|${cap}`;
		if (bestCache.has(k)) return bestCache.get(k)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) { bestCache.set(k, null); return null; }
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		bestCache.set(k, best.IVs);
		return best.IVs;
	};

	// For each species+cap: find ALL reachable stages that (a) clear 90% of cap
	// AND (b) are NOT blanket-protected. If more than one DISTINCT bucket
	// pattern shows up among them, this species needed >1 carve-out clause and
	// my earlier script under-counted it.
	let affectedCount = 0;
	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));
		for (const cap of CAPS) {
			const distinctUnprotectedPatterns = new Set<string>();
			const stagesInvolved: Array<string> = [];
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) break; // matches my original algorithm's early-stop
				distinctUnprotectedPatterns.add(key(best));
				stagesInvolved.push(`${r.speciesId}:${key(best)}`);
			}
			if (distinctUnprotectedPatterns.size > 1) {
				affectedCount++;
				console.log(`${p.speciesId} @ ${cap}: ${stagesInvolved.join(', ')}`);
			}
		}
	}
	console.log(`\nTotal (species, cap) pairs where >1 distinct unprotected pattern appears before any protected stage: ${affectedCount}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
