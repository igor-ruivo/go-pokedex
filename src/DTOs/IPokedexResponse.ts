interface IPokemonEntry {
    name: string,
    url: string 
}

export default interface IPokedexResponse {
    results: IPokemonEntry[];
}