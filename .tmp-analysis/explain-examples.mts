import { calculateCP, computeBestIVs, levelToLevelIndex } from '../src/utils/pokemon-helper';
import type { IGamemasterPokemon } from '../src/DTOs/IGamemasterPokemon';

const GAMEMASTER_URL =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const LEVEL_50_INDEX = levelToLevelIndex(50);
const CP_THRESHOLD_RATIO = 0.9;
const bucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const families: Array<[string, string]> = [
		['chansey', 'blissey'],
		['magmar', 'magmortar'],
		['grimer', 'muk'],
	];
	for (const [preId, evoId] of families) {
		for (const id of [preId, evoId]) {
			const p = gamemaster[id];
			const maxCP1500 = calculateCP(p.baseStats.atk, 15, p.baseStats.def, 15, p.baseStats.hp, 15, LEVEL_50_INDEX);
			const clears = maxCP1500 >= CP_THRESHOLD_RATIO * 1500;
			let bestStr = 'does not clear 90% of 1500 CP — skipped';
			if (clears) {
				const best = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 1500)).flat()[0];
				bestStr = `A${best.IVs.A}(b${bucket(best.IVs.A)}) D${best.IVs.D}(b${bucket(best.IVs.D)}) S${best.IVs.S}(b${bucket(best.IVs.S)})`;
			}
			console.log(`${id} (atk${p.baseStats.atk}/def${p.baseStats.def}/hp${p.baseStats.hp}): maxCP=${maxCP1500} (${(maxCP1500/1500*100).toFixed(0)}%) — ${bestStr}`);
		}
		console.log('');
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
