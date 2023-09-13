import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { buildPokemonImageUrl } from "./Resources";

export const mapGamemasterPokemonData: (data: any) => IGamemasterPokemon[] = (data: any) => {
    return (Array.from(data) as any[])
        .filter(pokemon => pokemon.released)
        .map(pokemon => {
            const isShadow = pokemon.tags ? Array.from(pokemon.tags).includes("shadow") : false;

            let urlDex = "" + pokemon.dex;
            const zerosToAddToUrl = 3 - urlDex.length;
            
            if (zerosToAddToUrl > 0) {
                for (let i = 0; i < zerosToAddToUrl; i++) {
                    urlDex = "0" + urlDex;
                }
            }
            //const form = (pokemon.speciesId as string)

            return {
                dex: pokemon.dex,
                speciesId: pokemon.speciesId,
                speciesName: pokemon.speciesName,
                imageUrl: buildPokemonImageUrl(urlDex),
                types: Array.from(pokemon.types).map(t => t as PokemonTypes),
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