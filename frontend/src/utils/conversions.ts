import IPokemon from "../DTOs/IPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";

export const mapPokemonData: (data: any) => IPokemon = (data: any) => {
    return {
        number: data.id,
        name: data.name,
        imageUrl: data.sprites.other["official-artwork"].front_default,
        quizzUrl: data.sprites.versions["generation-i"]["red-blue"].back_gray,
        hp: data.stats[0].base_stat,
        attack: data.stats[1].base_stat,
        defense: data.stats[2].base_stat,
        specialAttack: data.stats[3].base_stat,
        specialDefense: data.stats[4].base_stat,
        speed: data.stats[5].base_stat,
        height: data.height,
        weight: data.weight,
        types: Array.from<any>(data.types).map(t => t.type.name as PokemonTypes),
        attacks: Array.from<any>(data.moves).map(m => m.move.name)
    };
}