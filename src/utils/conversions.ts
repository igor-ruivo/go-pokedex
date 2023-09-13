import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { buildPokemonImageUrl } from "./Resources";

export const mapGamemasterPokemonData: (data: any) => IGamemasterPokemon[] = (data: any) => {

    const blacklistedSpecieIds = [
        "pikachu_5th_anniversary",
        "pikachu_flying",
        "pikachu_kariyushi",
        "pikachu_libre",
        "pikachu_pop_star",
        "pikachu_rock_star",
        "pikachu_shaymin"
    ];

    const overrideMappings = new Map<string, string>();
    overrideMappings.set("slowbro_mega", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/080_f2.png");
    overrideMappings.set("slowbro_galarian", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/080_f3.png");
    overrideMappings.set("mewtwo_armored", "https://i.imgur.com/Vwhh8KW.png");
    overrideMappings.set("castform_sunny", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10013.png");
    overrideMappings.set("castform_rainy", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10014.png");
    overrideMappings.set("castform_snowy", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10015.png");
    overrideMappings.set("rotom_frost", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/479_f4.png");
    overrideMappings.set("rotom_mow", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/479_f6.png");
    overrideMappings.set("rotom_wash", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/479_f3.png");
    overrideMappings.set("darmanitan_galarian_standard", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/555_f2.png");
    overrideMappings.set("darmanitan_standard", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/555.png");
    overrideMappings.set("genesect_burn", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/649.png");
    overrideMappings.set("genesect_chill", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/649.png");
    overrideMappings.set("genesect_douse", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/649.png");
    overrideMappings.set("genesect_shock", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/649.png");
    overrideMappings.set("zygarde_10", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/718_f2.png");
    overrideMappings.set("zygarde", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/718.png");
    overrideMappings.set("zygarde_complete", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/718_f3.png");
    overrideMappings.set("oricorio_pau", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/741_f3.png");
    overrideMappings.set("oricorio_pom_pom", "https://assets.pokemon.com/assets/cms2/img/pokedex/full/741_f2.png");

    return (Array.from(data) as any[])
        .filter(pokemon => pokemon.released && !blacklistedSpecieIds.includes(pokemon.speciesId))
        .map(pokemon => {
            const isShadow = pokemon.tags ? Array.from(pokemon.tags).includes("shadow") : false;

            let urlDex = "" + pokemon.dex;
            const zerosToAddToUrl = 3 - urlDex.length;

            if (zerosToAddToUrl > 0) {
                for (let i = 0; i < zerosToAddToUrl; i++) {
                    urlDex = "0" + urlDex;
                }
            }

            const repeatedDexs = (data as any[]).filter(p => p.released && !blacklistedSpecieIds.includes(p.speciesId) && p.dex === pokemon.dex && !(p.tags ? Array.from(p.tags).includes("shadow") : false));
            const currentIndex = repeatedDexs.findIndex(p => p.speciesId === pokemon.speciesId);
            const form = currentIndex === 0 ? undefined : "" + (currentIndex + 1);

            return {
                dex: pokemon.dex,
                speciesId: pokemon.speciesId,
                speciesName: pokemon.speciesName,
                imageUrl: overrideMappings.has(pokemon.speciesId) ? overrideMappings.get(pokemon.speciesId) as string : buildPokemonImageUrl(urlDex, form),
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