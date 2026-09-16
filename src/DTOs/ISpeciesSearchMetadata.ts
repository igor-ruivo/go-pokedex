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

/**
 * Everything dex-server precomputes about one species for the search-string
 * generators — served from its own `species-search-metadata.json`, keyed by
 * speciesId, kept separate from the core gamemaster dataset (see
 * `useSpeciesSearchMetadata`'s own doc comment for why).
 */
export interface ISpeciesSearchMetadata {
	/** The shortest `dex[&type[&!type]]` in-game-search identifier that pins
	 *  down this species' own form — see `formIdentifierFor`'s own doc
	 *  comment on what it replaces. */
	searchFormId: string;
	/** Whether a Shadow counterpart of this (non-Shadow) species exists in
	 *  the gamemaster — replaces `isNormalPokemonAndHasShadowVersion`'s own
	 *  gamemaster scan. */
	hasShadowCounterpart: boolean;
	bestIvSpreads: IBestIvSpreads;
	/** Only ever populated for a Shadow species. */
	bestIvSpreadsPurified?: IBestIvSpreads;
}
