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
const matchesDefault = (ivs: { A: number; D: number; S: number }) => ivs.A <= 5 && ivs.D >= 11 && ivs.S >= 11;

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter((p) => !p.aliasId && !p.isMega && !p.isShadow);
	const excludedCategory = Object.values(gamemaster).filter(
		(p) => !p.aliasId && !p.isMega && !p.isShadow && (p.isLegendary || p.isMythical || p.isBeast)
	).length;
	console.log(`${excludedCategory} of ${candidates.length} candidates are legendary/mythical/UB (never deletion targets).`);

	const cache = new Map<string, { A: number; D: number; S: number } | null>();
	const getBest = (r: IGamemasterPokemon, cap: number) => {
		const key = `${r.speciesId}|${cap}`;
		if (cache.has(key)) return cache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) { cache.set(key, null); return null; }
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		cache.set(key, best.IVs);
		return best.IVs;
	};

	for (const cap of CAPS) {
		let total = 0, legendaryClass = 0, normalClass = 0;
		for (const p of candidates) {
			const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow));
			let isException = false;
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (!matchesDefault(best)) { isException = true; break; }
			}
			if (isException) {
				total++;
				if (p.isLegendary || p.isMythical || p.isBeast) legendaryClass++;
				else normalClass++;
			}
		}
		console.log(`${cap}: ${total} total exceptions -> ${legendaryClass} legendary/mythical/UB (excluded anyway), ${normalClass} normal (real candidates)`);
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
