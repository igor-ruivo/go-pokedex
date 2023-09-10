export interface IGamemasterPokemon {
    dex: number,
    speciesId: string,
    atk: number,
    def: number,
    hp: number,
    fastMoves: string[],
    chargedMoves: string[],
    eliteMoves: string[],
    isShadow: boolean,
    isShadowEligible?: boolean,
    isMega: boolean,
    familyId?: string,
    parent?: string,
    evolutions: string[]
}