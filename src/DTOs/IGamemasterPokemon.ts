import type { PokemonTypes } from './PokemonTypes';

export interface IGamemasterPokemon {
	dex: number;
	speciesId: string;
	speciesName: string;
	types: Array<PokemonTypes>;
	imageUrl: string;
	goImageUrl: string;
	shinyGoImageUrl: string;
	baseStats: {
		atk: number;
		def: number;
		hp: number;
	};
	fastMoves: Array<string>;
	chargedMoves: Array<string>;
	eliteMoves: Array<string>;
	legacyMoves: Array<string>;
	isShadow: boolean;
	isMega: boolean;
	family?: {
		id: string;
		parent?: string;
		evolutions?: Array<string>;
	};
	aliasId?: string;
	form: string;
	isLegendary: boolean;
	isMythical: boolean;
	isBeast: boolean;
}
