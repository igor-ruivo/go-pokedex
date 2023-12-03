import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IMove } from "../DTOs/IMove";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import Dictionary from "./Dictionary";
import { buildPokemonImageUrl } from "./Configs";

const blacklistedSpecieIds = new Set<string>([
    "pikachu_5th_anniversary",
    "pikachu_flying",
    "pikachu_kariyushi",
    "pikachu_libre",
    "pikachu_pop_star",
    "pikachu_rock_star",
    "pikachu_shaymin"
]);

const type = navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i) ? "detail" : "full";

export const mapGamemasterPokemonData: (data: any) => IGamemasterPokemon[] = (data: any) => {
    const releasedOverride = new Set<string>([
        "cosmog",
        "cosmoem"
    ]);    

    const overrideMappings = new Map<string, string>();
    overrideMappings.set("slowbro_mega", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/080_f2.png`);
    overrideMappings.set("slowbro_galarian", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/080_f3.png`);
    overrideMappings.set("mewtwo_armored", "https://i.imgur.com/Vwhh8KW.png");
    overrideMappings.set("castform_sunny", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10013.png");
    overrideMappings.set("castform_rainy", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10014.png");
    overrideMappings.set("castform_snowy", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10015.png");
    overrideMappings.set("rotom_frost", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/479_f4.png`);
    overrideMappings.set("rotom_mow", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/479_f6.png`);
    overrideMappings.set("rotom_wash", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/479_f3.png`);
    overrideMappings.set("darmanitan_galarian_standard", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/555_f2.png`);
    overrideMappings.set("darmanitan_standard", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/555.png`);
    overrideMappings.set("genesect_burn", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/649.png`);
    overrideMappings.set("genesect_chill", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/649.png`);
    overrideMappings.set("genesect_douse", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/649.png`);
    overrideMappings.set("genesect_shock", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/649.png`);
    overrideMappings.set("zygarde_10", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/718_f2.png`);
    overrideMappings.set("zygarde", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/718.png`);
    overrideMappings.set("zygarde_complete", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/718_f3.png`);
    overrideMappings.set("oricorio_pau", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/741_f3.png`);
    overrideMappings.set("oricorio_pom_pom", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/741_f2.png`);
    overrideMappings.set("pumpkaboo_small", `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/710.png`);

    const baseDataFilter = (pokemon: any) => (pokemon.released || releasedOverride.has(pokemon.speciesId)) && !blacklistedSpecieIds.has(pokemon.speciesId);
    const isShadowConditionFilter = (pokemon: any) => pokemon.tags ? Array.from(pokemon.tags).includes("shadow") : false;

    return (Array.from(data) as any[])
        .filter(baseDataFilter)
        .map(pokemon => {
            const isShadow = isShadowConditionFilter(pokemon);

            let urlDex = "" + pokemon.dex;
            const zerosToAddToUrl = 3 - urlDex.length;

            if (zerosToAddToUrl > 0) {
                for (let i = 0; i < zerosToAddToUrl; i++) {
                    urlDex = "0" + urlDex;
                }
            }

            const idForIndexCalc = pokemon.speciesId.replace("_shadow", "");

            let form = "";
            const repeatedDexs = (data as any[]).filter(p => baseDataFilter(p) && p.dex === pokemon.dex && !isShadowConditionFilter(p) && !p.aliasId);
            const currentIndex = repeatedDexs.findIndex(p => p.speciesId === idForIndexCalc);
            if (currentIndex === -1) {
                console.log(`Couldn't find matching species id for ${pokemon.speciesId} (alias: ${pokemon.aliasId})`);
            }
            if (currentIndex > 0) {
                form = "" + (currentIndex + 1);
            }

            return {
                dex: pokemon.dex,
                speciesId: pokemon.speciesId,
                speciesName: sexConverter(pokemon.speciesName),
                speciesShortName: shortName(pokemon.speciesName),
                imageUrl: overrideMappings.has(pokemon.speciesId) ? overrideMappings.get(pokemon.speciesId) as string : buildPokemonImageUrl(urlDex, type, form),
                types: Array.from(pokemon.types).filter(t => t !== "none").map((t: any) => ((t.substring(0, 1).toLocaleUpperCase() + t.substring(1)) as PokemonTypes)),
                atk: pokemon.baseStats.atk,
                def: pokemon.baseStats.def,
                hp: pokemon.baseStats.hp,
                fastMoves: pokemon.fastMoves,
                chargedMoves: pokemon.chargedMoves,
                eliteMoves: pokemon.eliteMoves ?? [],
                legacyMoves: pokemon.legacyMoves ?? [],
                isShadow: isShadow,
                isShadowEligible: isShadow ? undefined : pokemon.tags ? Array.from(pokemon.tags).includes("shadoweligible") : false,
                isMega: pokemon.tags ? Array.from(pokemon.tags).includes("mega") : false,
                isUntradeable: pokemon.tags ? Array.from(pokemon.tags).includes("untradeable") : false,
                familyId: pokemon.family?.id,
                parent: pokemon.family?.parent,
                evolutions: pokemon.family ? pokemon.family.evolutions : [],
                aliasId: pokemon.aliasId
            }
        }
    );
}

export const mapRankedPokemon: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IRankedPokemon[] = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const observedPokemon = new Set<string>();

    return (Array.from(data) as any[])
        .filter(pokemon => !blacklistedSpecieIds.has(pokemon.speciesId))
        .filter(pokemon => {
            const p = gamemasterPokemon[pokemon.speciesId];
            const computedId = p.aliasId ?? p.speciesId;
            if (observedPokemon.has(computedId)) {
                console.log(`Detected alias: ${computedId}`);
                return false;
            } else {
                observedPokemon.add(computedId);
                return true;
            }
        })
        .map((pokemon, index) => {
            const p = gamemasterPokemon[pokemon.speciesId];
            const computedId = p.aliasId ?? p.speciesId;
            return {
                speciesId: computedId,
                rating: pokemon.rating,
                moveset: pokemon.moveset,
                lead: pokemon.scores[0],
                switch: pokemon.scores[2],
                charger: pokemon.scores[3],
                closer: pokemon.scores[1],
                consistency: pokemon.scores[5],
                attacker: pokemon.scores[4],
                score: pokemon.score,
                rank: index + 1
            }
        }
    );
}

export const mapMoves: (data: any) => IMove[] = (data: any) => {
    return (Array.from(data) as any[])
        .map(move => {
            return {
                moveId: move.moveId,
                name: move.name,
                type: move.type,
                power: move.power,
                energy: move.energy,
                energyGain: move.energyGain,
                cooldown: +move.cooldown / 1000
            }
        }
    );
}

export const ordinal = (number: number) => {
    if (!number) {
        return undefined;
    }

    const english_ordinal_rules = new Intl.PluralRules("en", {type: "ordinal"});
    const suffixes: Dictionary<string> = {
        one: "st",
        two: "nd",
        few: "rd",
        other: "th"
    };
    
    const category = english_ordinal_rules.select(number);
    const suffix = suffixes[category];
    return number + suffix;
}

const shortName = (name: string) => {
    return name
        .replace("(Alolan)", "(A)")
        .replace("(Galarian)", "(G)")
        .replace("(Mega)", "(M)")
        .replace("(Shadow)", "(S)")
        .replace("(Complete Forme)", "(CF)")
        .replace("(50% Forme)", "(50% F)")
        .replace("(10% Forme)", "(10% F)")
        .replace("(Hisuian)", "(H)")
        .replace("(Standard)", "(Std.)")
        .replace("(Incarnate)", "(Inc.)")
        .replace("(Average)", "(Avg.)")
        .replace("Male", "♂")
        .replace("Female", "♀");
}

const sexConverter = (name: string) => {
    return name
        .replace("Male", "♂")
        .replace("Female", "♀");
}