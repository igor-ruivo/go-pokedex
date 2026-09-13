// v3: same 90%-of-cap prefilter and reachable-family traversal, but checks
// only the SINGLE best IV combination (rank #1) against the full original
// rule (Atk 0-5 AND Def 11-15 AND HP 11-15) instead of requiring all of the
// top 5 to match.
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

	const bestCache = new Map<string, { A: number; D: number; S: number } | null>();
	const getBest = (r: IGamemasterPokemon, cap: number): { A: number; D: number; S: number } | null => {
		const key = `${r.speciesId}|${cap}`;
		if (bestCache.has(key)) return bestCache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			bestCache.set(key, null);
			return null;
		}
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		const ivs = best ? best.IVs : null;
		bestCache.set(key, ivs);
		return ivs;
	};

	for (const cap of CAPS) {
		const exceptions: Array<{ speciesId: string; dex: number; speciesName: string; via: string; best: string }> = [];

		for (const p of candidates) {
			const reachable = Array.from(
				fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow)
			);
			let exceptionVia: string | null = null;
			let bestStr = '';
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (!matchesDefault(best)) {
					exceptionVia = r.speciesId;
					bestStr = `A${best.A} D${best.D} S${best.S}`;
					break;
				}
			}
			if (exceptionVia) {
				exceptions.push({ speciesId: p.speciesId, dex: p.dex, speciesName: p.speciesName, via: exceptionVia, best: bestStr });
			}
		}

		exceptions.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
		console.log(`\n=== ${cap} CP cap (best-combo-only, full rule): ${exceptions.length} exceptions out of ${candidates.length} ===`);
		for (const e of exceptions) {
			console.log(
				`  #${e.dex}\t${e.speciesId}\t(${e.speciesName})  best@${e.via}: ${e.best}${e.via !== e.speciesId ? `  [via reachable]` : ''}`
			);
		}
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
