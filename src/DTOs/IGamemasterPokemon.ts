import { PokemonTypes } from "./PokemonTypes";

export interface IGamemasterPokemon {
    dex: number,
    speciesId: string,
    speciesName: string,
    types: PokemonTypes[],
    imageUrl: string,
    atk: number,
    def: number,
    hp: number,
    fastMoves: string[],
    chargedMoves: string[],
    eliteMoves: string[],
    isShadow: boolean,
    isShadowEligible?: boolean,
    isMega: boolean,
    isUntradeable: boolean,
    familyId?: string,
    parent?: string,
    evolutions: string[]
}