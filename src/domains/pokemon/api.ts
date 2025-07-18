import type { Pokemon } from './types';

const DATA_URL =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';

// Define the raw data type from the JSON
interface RawPokemon {
	dex: number;
	speciesName: string;
	types: Array<string>;
	baseStats: {
		atk: number;
		def: number;
		hp: number;
	};
	imageUrl: string;
}

let cache: Array<Pokemon> | null = null;

export async function fetchAllPokemon(): Promise<Array<Pokemon>> {
	if (cache) return cache;
	const res: Response = await fetch(DATA_URL);
	const data: Array<RawPokemon> = (await res.json()) as Array<RawPokemon>;
	const pokedex = Object.values(data).map((p) => {
		const poke = p;
		return {
			id: poke.dex,
			name: poke.speciesName,
			types: poke.types,
			baseStats: {
				attack: poke.baseStats.atk,
				defense: poke.baseStats.def,
				stamina: poke.baseStats.hp,
			},
			image: poke.imageUrl,
		};
	}) as Array<Pokemon>;
	cache = pokedex;
	return pokedex;
}

export async function getRandomPokemon(): Promise<Pokemon> {
	const all = await fetchAllPokemon();
	return all[Math.floor(Math.random() * all.length)];
}
