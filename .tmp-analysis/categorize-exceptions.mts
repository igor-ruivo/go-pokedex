// Categorizes v3's exceptions: is each one a "barely clears the cap" case
// (low overall stats, needs all the CP it can get) or a "distribution
// imbalance" case (comfortably clears the cap but still doesn't want the
// low-Atk/high-Def/high-HP spread)?
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

	const cache = new Map<string, { maxCP: number; best: { A: number; D: number; S: number } } | null>();
	const getInfo = (r: IGamemasterPokemon, cap: number) => {
		const key = `${r.speciesId}|${cap}`;
		if (cache.has(key)) return cache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) {
			cache.set(key, null);
			return null;
		}
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		const result = { maxCP, best: best.IVs };
		cache.set(key, result);
		return result;
	};

	for (const cap of CAPS) {
		type Row = {
			speciesId: string;
			dex: number;
			speciesName: string;
			via: string;
			maxCP: number;
			ratio: number;
			best: string;
			atk: number;
			def: number;
			hp: number;
		};
		const exceptions: Array<Row> = [];

		for (const p of candidates) {
			const reachable = Array.from(
				fetchReachablePokemonIncludingSelf(p, gamemaster, (r) => !r.aliasId && !r.isMega && !r.isShadow)
			);
			for (const r of reachable) {
				const info = getInfo(r, cap);
				if (!info) continue;
				if (!matchesDefault(info.best)) {
					exceptions.push({
						speciesId: p.speciesId,
						dex: p.dex,
						speciesName: p.speciesName,
						via: r.speciesId,
						maxCP: info.maxCP,
						ratio: info.maxCP / cap,
						best: `A${info.best.A} D${info.best.D} S${info.best.S}`,
						atk: r.baseStats.atk,
						def: r.baseStats.def,
						hp: r.baseStats.hp,
					});
					break;
				}
			}
		}

		// Categorize by how close maxCP is to the cap: "barely clears" (<110% of cap)
		// vs "comfortably clears" (>=110%) — a proxy for "low overall stats forced a
		// higher-Atk compromise" vs "the cap genuinely doesn't bind / distribution issue".
		const barelyClears = exceptions.filter((e) => e.ratio < 1.1);
		const comfortablyClears = exceptions.filter((e) => e.ratio >= 1.1);

		console.log(`\n=== ${cap} CP cap: ${exceptions.length} total exceptions ===`);
		console.log(`  barely clears cap (maxCP < 110% of cap): ${barelyClears.length}`);
		console.log(`  comfortably clears cap (maxCP >= 110% of cap): ${comfortablyClears.length}`);

		console.log(`\n  -- sample: barely-clears-cap exceptions (low overall stats) --`);
		for (const e of barelyClears.slice(0, 15)) {
			console.log(
				`  #${e.dex} ${e.speciesId} (atk${e.atk}/def${e.def}/hp${e.hp}) maxCP=${e.maxCP} (${(e.ratio * 100).toFixed(0)}% of cap) best: ${e.best}`
			);
		}

		console.log(`\n  -- sample: comfortably-clears-cap exceptions (distribution issue) --`);
		for (const e of comfortablyClears.slice(0, 15)) {
			console.log(
				`  #${e.dex} ${e.speciesId} (atk${e.atk}/def${e.def}/hp${e.hp}) maxCP=${e.maxCP} (${(e.ratio * 100).toFixed(0)}% of cap) best: ${e.best}`
			);
		}
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
