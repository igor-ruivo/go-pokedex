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
const isHundo = (ivs: { A: number; D: number; S: number }) => ivs.A === 15 && ivs.D === 15 && ivs.S === 15;

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter((p) => !p.aliasId && !p.isMega && !p.isShadow);

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
		type Row = { speciesId: string; dex: number; speciesName: string; via: string; best: { A: number; D: number; S: number }; special: boolean };
		const exceptions: Array<Row> = [];

		for (const p of candidates) {
			if (p.isLegendary || p.isMythical || p.isBeast) continue; // never a deletion target anyway
			const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow));
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (!matchesDefault(best)) {
					exceptions.push({ speciesId: p.speciesId, dex: p.dex, speciesName: p.speciesName, via: r.speciesId, best, special: r.isLegendary || r.isMythical || r.isBeast });
					break;
				}
			}
		}

		const hundoOnly = exceptions.filter((e) => isHundo(e.best));
		const realExceptions = exceptions.filter((e) => !isHundo(e.best));

		console.log(`\n=== ${cap} CP cap ===`);
		console.log(`  total exceptions (non-legendary/mythical/UB): ${exceptions.length}`);
		console.log(`  of which best combo IS a hundo (already protected by !4*): ${hundoOnly.length}`);
		console.log(`  REMAINING real exceptions needing a custom bucket clause: ${realExceptions.length}`);
		realExceptions.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
		console.log(`\n  -- remaining exceptions --`);
		for (const e of realExceptions) {
			console.log(`  #${e.dex}\t${e.speciesId}\t(${e.speciesName})  best: A${e.best.A} D${e.best.D} S${e.best.S}`);
		}
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
