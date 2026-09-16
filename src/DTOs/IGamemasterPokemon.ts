import type { PokemonTypes } from './PokemonTypes';

/** One raw (pre-purification) IV spread, as dex-server precomputes it. */
export interface IBadIvPattern {
	A: number;
	D: number;
	S: number;
}

/** Tied-for-rank-1 (best stat product) raw IV patterns, per league and per
 *  level ceiling — dex-server's replacement for what `findBadIvCarveOuts`/
 *  `findTradeableSpeciesData` used to brute-force per species. */
export interface IBestIvSpreads {
	great: { level50: Array<IBadIvPattern>; level51: Array<IBadIvPattern> };
	ultra: { level50: Array<IBadIvPattern>; level51: Array<IBadIvPattern> };
	master: { level50: Array<IBadIvPattern>; level51: Array<IBadIvPattern> };
}

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
	/** The shortest `dex[&type[&!type]]` in-game-search identifier that pins
	 *  down this species' own form — precomputed by dex-server, see
	 *  `formIdentifierFor`'s own doc comment for what it replaces. */
	searchFormId?: string;
	/** Whether a Shadow counterpart of this (non-Shadow) species exists in
	 *  the gamemaster — precomputed by dex-server, replaces
	 *  `isNormalPokemonAndHasShadowVersion`'s own gamemaster scan. */
	hasShadowCounterpart?: boolean;
	bestIvSpreads?: IBestIvSpreads;
	/** Only ever populated for a Shadow species. */
	bestIvSpreadsPurified?: IBestIvSpreads;
}
