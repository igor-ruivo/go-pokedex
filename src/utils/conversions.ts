import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import IPokemon from "../DTOs/IPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";

export const mapPokemonData: (data: any) => IPokemon = (data: any) => {
    return {
        number: data.id,
        name: data.name,
        imageUrl: data.sprites.other["official-artwork"].front_default,
        shinyUrl: data.sprites.other["official-artwork"].front_shiny,
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

export const mapGamemasterPokemonData: (data: any) => IGamemasterPokemon[] = (data: any) => {
    return (Array.from(data) as any[])
        .filter(pokemon => pokemon.released)
        .map(pokemon => {
            const isShadow = pokemon.tags ? Array.from(pokemon.tags).includes("shadow") : false;

            return {
                dex: pokemon.dex,
                speciesId: pokemon.speciesId,
                atk: pokemon.baseStats.atk,
                def: pokemon.baseStats.def,
                hp: pokemon.baseStats.hp,
                fastMoves: pokemon.fastMoves,
                chargedMoves: pokemon.chargedMoves,
                eliteMoves: pokemon.eliteMoves ?? [],
                isShadow: isShadow,
                isShadowEligible: isShadow ? undefined : pokemon.tags ? Array.from(pokemon.tags).includes("shadoweligible") : false,
                isMega: pokemon.tags ? Array.from(pokemon.tags).includes("mega") : false,
                familyId: pokemon.family?.id,
                parent: pokemon.family?.parent,
                evolutions: pokemon.family ? pokemon.family.evolutions : []
            }
        }
    );
}

export const mapRankedPokemon: (data: any) => IRankedPokemon[] = (data: any) => {
    return (Array.from(data) as any[])
        .map(pokemon => {
            return {
                speciesId: pokemon.speciesId,
                rating: pokemon.rating,
                moveset: pokemon.moveset,
                lead: pokemon.scores[0],
                switch: pokemon.scores[2],
                charger: pokemon.scores[3],
                closer: pokemon.scores[1],
                consistency: pokemon.scores[5],
                attacker: pokemon.scores[4],
                score: pokemon.score
            }
        }
    );
}