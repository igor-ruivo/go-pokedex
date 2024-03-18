import { PokemonTypes } from "./PokemonTypes";

export interface IGamemasterPokemon {
    dex: number,
    speciesId: string,
    speciesName: string,
    types: PokemonTypes[],
    imageUrl: string,
    goImageUrl: string,
    shinyGoImageUrl: string,
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
    aliasId?: string,
    form: string
}