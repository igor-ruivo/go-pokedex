// v2: same algorithm, but the "matches default" check only requires low
// Attack (<=5) — Def/HP are NOT required to independently clear 11, since
// they trade off against each other near the top of the ranking (see the
// venusaur/skarmory/registeel spot-check). Comparing counts against v1.
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

const matchesDefault = (ivs: { A: number; D: number; S: number }) => ivs.A <= 5;

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter((p) => !p.aliasId && !p.isMega && !p.isShadow);

	const top5Cache = new Map<string, Array<{ A: number; D: number; S: number }> | null>();
	const getTop5 = (r: IGamemasterPokemon, cap: number): Array<{ A: number; D: number; S: number }> | null => {
		const key = `${r.speciesId}|${cap}`;
		if (top5Cache.has(key)) return top5Cache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			top5Cache.set(key, null);
			return null;
		}
		const top5 = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap))
			.flat()
			.slice(0, 5)
			.map((e) => e.IVs);
		top5Cache.set(key, top5);
		return top5;
	};

	for (const cap of CAPS) {
		const exceptions: Array<{ speciesId: string; dex: number; speciesName: string; via: string }> = [];

		for (const p of candidates) {
			const reachable = Array.from(
				fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow)
			);
			let exceptionVia: string | null = null;
			for (const r of reachable) {
				const top5 = getTop5(r, cap);
				if (!top5) continue;
				if (!top5.every(matchesDefault)) {
					exceptionVia = r.speciesId;
					break;
				}
			}
			if (exceptionVia) {
				exceptions.push({ speciesId: p.speciesId, dex: p.dex, speciesName: p.speciesName, via: exceptionVia });
			}
		}

		exceptions.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
		console.log(`\n=== ${cap} CP cap (attack-only check): ${exceptions.length} exceptions out of ${candidates.length} ===`);
		for (const e of exceptions) {
			console.log(
				`  #${e.dex}\t${e.speciesId}\t(${e.speciesName})${e.via !== e.speciesId ? `  [via reachable ${e.via}]` : ''}`
			);
		}
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
