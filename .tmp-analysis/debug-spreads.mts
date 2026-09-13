import { computeBestIVs } from '../src/utils/pokemon-helper';
import type { IGamemasterPokemon } from '../src/DTOs/IGamemasterPokemon';

const GAMEMASTER_URL =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	for (const id of ['venusaur', 'azumarill', 'medicham', 'skarmory', 'registeel']) {
		const p = gamemaster[id];
		if (!p) {
			console.log(id, 'not found');
			continue;
		}
		const top = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 1500))
			.flat()
			.slice(0, 8);
		console.log(`\n${id} (atk${p.baseStats.atk}/def${p.baseStats.def}/hp${p.baseStats.hp}) @ 1500:`);
		for (const e of top) {
			console.log(`  A${e.IVs.A} D${e.IVs.D} S${e.IVs.S}  L${e.L}  CP${e.CP}`);
		}
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
