import { calculateCP, computeBestIVs, fetchReachablePokemonIncludingSelf, levelToLevelIndex } from '../src/utils/pokemon-helper';
import type { IGamemasterPokemon } from '../src/DTOs/IGamemasterPokemon';
const GAMEMASTER_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const LEVEL_50_INDEX = levelToLevelIndex(50);
const bucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	for (const id of ['lickitung', 'lickilicky']) {
		const p = gamemaster[id];
		const maxCP = calculateCP(p.baseStats.atk, 15, p.baseStats.def, 15, p.baseStats.hp, 15, LEVEL_50_INDEX);
		const best = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 1500)).flat()[0];
		console.log(`${id} (atk${p.baseStats.atk}/def${p.baseStats.def}/hp${p.baseStats.hp}): maxCP@15/15/15/L50=${maxCP} (${(maxCP/1500*100).toFixed(0)}% of 1500)`);
		console.log(`  best@1500: A${best.IVs.A}(bucket${bucket(best.IVs.A)}) D${best.IVs.D}(bucket${bucket(best.IVs.D)}) S${best.IVs.S}(bucket${bucket(best.IVs.S)})`);
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
