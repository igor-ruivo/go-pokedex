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
	extraChargedMoves: Array<string>;
	eliteMoves: Array<string>;
	legacyMoves: Array<string>;
	isShadow: boolean;
	isMega: boolean;
	isSuperMega: boolean;
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
	/** This species' own Shadow form's speciesId — present only on a
	 *  non-Shadow species that actually has one. Precomputed by dex-server
	 *  (`family-relations-calculator.ts`) — never derive this client-side via
	 *  string manipulation. */
	shadowSpecies?: string;
	/** The non-Shadow species this Shadow form purifies into — always
	 *  present on a Shadow species. */
	nonShadowSpecies?: string;
	/** Every Mega/Primal form of this species — present only on a base
	 *  (non-Mega) species that actually has one or more. */
	megaFormsIds?: Array<string>;
	/** The non-Mega species this Mega/Primal form evolves from — always
	 *  present on a Mega/Primal species. */
	baseSpecies?: string;
}
