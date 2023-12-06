import { PokemonTypes } from "./PokemonTypes";

export interface IGamemasterPokemon {
    dex: number,
    speciesId: string,
    speciesName: string,
    speciesShortName: string,
    types: PokemonTypes[],
    imageUrl: string,
    atk: number,
    def: number,
    hp: number,
    fastMoves: string[],
    chargedMoves: string[],
    eliteMoves: string[],
    legacyMoves: string[],
    isShadow: boolean,
    isMega: boolean,
    familyId?: string,
    parent?: string,
    evolutions: string[],
    aliasId?: string
}