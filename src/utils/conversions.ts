import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import Dictionary from "./Dictionary";
import { buildPokemonImageUrl, goBaseUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl, rankChangesCacheTtlInMillis } from "./Configs";
import { readEntry, writeEntry } from "./resource-cache";
import { IGameMasterMove } from "../DTOs/IGameMasterMove";
import { ITranslatedMove } from "../DTOs/ITranslatedMove";
import { calculateCP, getForm, levelToLevelIndex } from "./pokemon-helper";
import { IRaidBoss } from "../DTOs/IRaidBoss";
import { PokemonForms } from "../DTOs/PokemonForms";
import { IEntry, IPostEntry } from "../DTOs/INews";

const blacklistedSpecieIds = new Set<string>([
    "pikachu_5th_anniversary",
    "pikachu_flying",
    "pikachu_kariyushi",
    "pikachu_libre",
    "pikachu_pop_star",
    "pikachu_rock_star",
    "pikachu_shaymin",
    "pikachu_horizons"
]);

const hiddenPowers = new Set<string>([
    "HIDDEN_POWER_BUG",
    "HIDDEN_POWER_DARK",
    "HIDDEN_POWER_DRAGON",
    "HIDDEN_POWER_ELECTRIC",
    "HIDDEN_POWER_FIGHTING",
    "HIDDEN_POWER_FIRE",
    "HIDDEN_POWER_FLYING",
    "HIDDEN_POWER_GHOST",
    "HIDDEN_POWER_GRASS",
    "HIDDEN_POWER_GROUND",
    "HIDDEN_POWER_ICE",
    "HIDDEN_POWER_POISON",
    "HIDDEN_POWER_PSYCHIC",
    "HIDDEN_POWER_ROCK",
    "HIDDEN_POWER_STEEL",
    "HIDDEN_POWER_WATER"
]);

const type = navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i) ? "full" : "full"; //TODO: data saver setting: "detail" : "full"

export const mapGamemasterPokemonData: (data: any) => Dictionary<IGamemasterPokemon> = (data: any) => {
    const releasedOverride = new Set<string>([
        "cosmog",
        "cosmoem",
        "rayquaza_mega",
        "typhlosion_hisuian",
        "ditto",
        "shedinja",
        "annihilape",
        "heracross_mega"
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

    const pokemonDictionary: Dictionary<IGamemasterPokemon> = {};

    const cleanHiddenPowers = (moves: string[]) => moves?.some((move: string) => hiddenPowers.has(move)) ? [...moves.filter((move: string) => !hiddenPowers.has(move)), "HIDDEN_POWER"] : moves;

    const buildPokemonGoImageUrl = (dex: string, form: string) => `${goBaseUrl}${dex}${form ? ".f" + form : ""}.icon.png`;
    const buildPokemonGoShinyImageUrl = (dex: string, form: string) => `${goBaseUrl}${dex}${form ? ".f" + form : ""}.s.icon.png`;

    const getGoForm = (pokemonName: string) => {
        if (pokemonName.includes("(Alolan)")) {
            return "ALOLA";
        }

        if (pokemonName.includes("(Mega X)")) {
            return "MEGA_X";
        }

        if (pokemonName.includes("(Mega Y)")) {
            return "MEGA_Y";
        }

        if (pokemonName.includes("(Armored)")) {
            return "A";
        }

        if (pokemonName.includes("(Paldean)")) {
            return "PALDEA";
        }

        if (pokemonName.includes("(Sunshine)")) {
            return "SUNNY";
        }

        if (pokemonName.includes("(10% Forme)")) {
            return "TEN_PERCENT";
        }

        if (pokemonName.includes("(50% Forme)")) {
            return "FIFTY_PERCENT";
        }

        if (pokemonName.includes("(Complete Forme)")) {
            return "COMPLETE";
        }

        if (pokemonName.includes("(Pa'u)")) {
            return "PAU";
        }

        if (pokemonName.includes("(Pom-Pom)")) {
            return "POMPOM";
        }

        if ((pokemonName.length - pokemonName.replaceAll("(", "").length === 1) && !pokemonName.includes("Shadow") && !pokemonName.includes("Jr")) {
            const form = pokemonName.substring(pokemonName.indexOf("(") + 1, pokemonName.indexOf(")"));
            return form.toLocaleUpperCase();
        }

        if (pokemonName.includes("(") && !pokemonName.includes("Shadow") && !pokemonName.includes("Jr")) {
            console.log("Missing form conversion for pokémon go asset " + pokemonName);
        }

        return "";
    };

    const goOverrideMappings = new Map<string, string>();
    goOverrideMappings.set("unown", buildPokemonGoImageUrl("201", "UNOWN_F"));
    goOverrideMappings.set("spinda", buildPokemonGoImageUrl("327", "00"));
    goOverrideMappings.set("kyogre_primal", buildPokemonGoImageUrl("382", "PRIMAL"));
    goOverrideMappings.set("groudon_primal", buildPokemonGoImageUrl("383", "PRIMAL"));
    goOverrideMappings.set("burmy_plant", buildPokemonGoImageUrl("412", "BURMY_PLANT"));
    goOverrideMappings.set("burmy_sandy", buildPokemonGoImageUrl("412", "BURMY_SANDY"));
    goOverrideMappings.set("burmy_trash", buildPokemonGoImageUrl("412", "BURMY_TRASH"));
    goOverrideMappings.set("wormadam_plant", buildPokemonGoImageUrl("413", "WORMADAM_PLANT"));
    goOverrideMappings.set("wormadam_sandy", buildPokemonGoImageUrl("413", "WORMADAM_SANDY"));
    goOverrideMappings.set("wormadam_trash", buildPokemonGoImageUrl("413", "WORMADAM_TRASH"));
    goOverrideMappings.set("shellos", buildPokemonGoImageUrl("422", "WEST_SEA"));
    goOverrideMappings.set("gastrodon", buildPokemonGoImageUrl("423", "WEST_SEA"));
    goOverrideMappings.set("basculin", buildPokemonGoImageUrl("550", "RED_STRIPED"));
    goOverrideMappings.set("darmanitan_galarian_standard", buildPokemonGoImageUrl("555", "GALARIAN_STANDARD"));
    goOverrideMappings.set("deerling", buildPokemonGoImageUrl("585", "SPRING"));
    goOverrideMappings.set("sawsbuck", buildPokemonGoImageUrl("586", "SPRING"));
    goOverrideMappings.set("kyurem", buildPokemonGoImageUrl("646", "NORMAL"));
    goOverrideMappings.set("genesect", buildPokemonGoImageUrl("649", "NORMAL"));
    goOverrideMappings.set("vivillon", buildPokemonGoImageUrl("666", "MEADOW"));
    goOverrideMappings.set("flabebe", buildPokemonGoImageUrl("669", "RED"));
    goOverrideMappings.set("floette", buildPokemonGoImageUrl("670", "RED"));
    goOverrideMappings.set("florges", buildPokemonGoImageUrl("671", "RED"));
    goOverrideMappings.set("furfrou", buildPokemonGoImageUrl("676", "NATURAL"));
    goOverrideMappings.set("meowstic", buildPokemonGoImageUrl("678", ""));

    const shinyGoOverrideMappings = new Map<string, string>();
    shinyGoOverrideMappings.set("unown", buildPokemonGoShinyImageUrl("201", "UNOWN_F"));
    shinyGoOverrideMappings.set("spinda", buildPokemonGoShinyImageUrl("327", "00"));
    shinyGoOverrideMappings.set("kyogre_primal", buildPokemonGoShinyImageUrl("382", "PRIMAL"));
    shinyGoOverrideMappings.set("groudon_primal", buildPokemonGoShinyImageUrl("383", "PRIMAL"));
    shinyGoOverrideMappings.set("burmy_plant", buildPokemonGoShinyImageUrl("412", "BURMY_PLANT"));
    shinyGoOverrideMappings.set("burmy_sandy", buildPokemonGoShinyImageUrl("412", "BURMY_SANDY"));
    shinyGoOverrideMappings.set("burmy_trash", buildPokemonGoShinyImageUrl("412", "BURMY_TRASH"));
    shinyGoOverrideMappings.set("wormadam_plant", buildPokemonGoShinyImageUrl("413", "WORMADAM_PLANT"));
    shinyGoOverrideMappings.set("wormadam_sandy", buildPokemonGoShinyImageUrl("413", "WORMADAM_SANDY"));
    shinyGoOverrideMappings.set("wormadam_trash", buildPokemonGoShinyImageUrl("413", "WORMADAM_TRASH"));
    shinyGoOverrideMappings.set("shellos", buildPokemonGoShinyImageUrl("422", "WEST_SEA"));
    shinyGoOverrideMappings.set("gastrodon", buildPokemonGoShinyImageUrl("423", "WEST_SEA"));
    shinyGoOverrideMappings.set("basculin", buildPokemonGoShinyImageUrl("550", "RED_STRIPED"));
    shinyGoOverrideMappings.set("darmanitan_galarian_standard", buildPokemonGoShinyImageUrl("555", "GALARIAN_STANDARD"));
    shinyGoOverrideMappings.set("deerling", buildPokemonGoShinyImageUrl("585", "SPRING"));
    shinyGoOverrideMappings.set("sawsbuck", buildPokemonGoShinyImageUrl("586", "SPRING"));
    shinyGoOverrideMappings.set("kyurem", buildPokemonGoShinyImageUrl("646", "NORMAL"));
    shinyGoOverrideMappings.set("genesect", buildPokemonGoShinyImageUrl("649", "NORMAL"));
    shinyGoOverrideMappings.set("vivillon", buildPokemonGoShinyImageUrl("666", "MEADOW"));
    shinyGoOverrideMappings.set("flabebe", buildPokemonGoShinyImageUrl("669", "RED"));
    shinyGoOverrideMappings.set("floette", buildPokemonGoShinyImageUrl("670", "RED"));
    shinyGoOverrideMappings.set("florges", buildPokemonGoShinyImageUrl("671", "RED"));
    shinyGoOverrideMappings.set("furfrou", buildPokemonGoShinyImageUrl("676", "NATURAL"));
    shinyGoOverrideMappings.set("meowstic", buildPokemonGoShinyImageUrl("678", ""));

    const computeGoShortUrl = (url: string) => url.split(goBaseUrl)[1];

    (Array.from(data) as any[])
        .filter(baseDataFilter)
        .forEach(pokemon => {
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

            pokemonDictionary[pokemon.speciesId] = {
                dex: pokemon.dex,
                speciesId: pokemon.speciesId,
                speciesName: sexConverter(pokemon.speciesName),
                imageUrl: overrideMappings.has(pokemon.speciesId) ? overrideMappings.get(pokemon.speciesId) as string : buildPokemonImageUrl(urlDex, type, form),
                goImageUrl: computeGoShortUrl(goOverrideMappings.has(pokemon.speciesId) ? goOverrideMappings.get(pokemon.speciesId) as string : buildPokemonGoImageUrl(pokemon.dex, getGoForm(pokemon.speciesName))),
                shinyGoImageUrl: computeGoShortUrl(shinyGoOverrideMappings.has(pokemon.speciesId) ? shinyGoOverrideMappings.get(pokemon.speciesId) as string : buildPokemonGoShinyImageUrl(pokemon.dex, getGoForm(pokemon.speciesName))),
                types: Array.from(pokemon.types).filter(t => t !== "none").map((t: any) => ((t.substring(0, 1).toLocaleUpperCase() + t.substring(1)) as PokemonTypes)),
                atk: pokemon.baseStats.atk,
                def: pokemon.baseStats.def,
                hp: pokemon.baseStats.hp,
                fastMoves: cleanHiddenPowers(pokemon.fastMoves),
                chargedMoves: cleanHiddenPowers(pokemon.chargedMoves),
                eliteMoves: (cleanHiddenPowers(pokemon.eliteMoves)) ?? [],
                legacyMoves: (cleanHiddenPowers(pokemon.legacyMoves)) ?? [],
                isShadow: isShadow,
                isMega: pokemon.tags ? Array.from(pokemon.tags).includes("mega") : false,
                familyId: pokemon.family?.id,
                parent: pokemon.family?.parent,
                evolutions: pokemon.family ? pokemon.family.evolutions : [],
                aliasId: pokemon.aliasId,
                form: getForm(pokemon.speciesName)
            }
        }
    );

    return pokemonDictionary;
}

export const mapTranslatedMoves: (data: any) => Dictionary<ITranslatedMove> = (data: any) => {
    const translatedMovesDictionary: Dictionary<ITranslatedMove> = {};
    const term = "move_name_";

    (Array.from(data.data) as any[])
        .forEach((t: string, index: number) => {
            if (!t.startsWith(term)) {
                return;
            }

            const vid = t.substring(term.length);
            const moveName = Array.from(data.data)[index + 1];
            translatedMovesDictionary[vid] = {
                vId: vid,
                name: moveName as string
            }
        });

    return translatedMovesDictionary;
}

const removeFormsFromPokemonName = (rawName: string) => {
    rawName = rawName.toLowerCase();

    // Define a function to escape regex special characters in form names
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Process "(shadow)" and "shadow" separately to handle them as special cases if needed
    rawName = rawName.replace(/\(shadow\)/g, "");
    rawName = rawName.replace(/\bshadow\b/g, "");

    // Iterate over each form and replace it using a regex that matches whole words or words in parentheses
    for (let form of Object.values(PokemonForms)) {
        const escapedForm = escapeRegExp(form.toLowerCase());
        const regex = new RegExp(`\\b${escapedForm}\\b|\\(${escapedForm}\\)`, "g");
        rawName = rawName.replace(regex, "");
    }

    // Remove remaining parentheses that might be left after replacements
    rawName = rawName.replace(/[()]/g, "");

    return rawName.trim();
}

export const mapRaidBosses: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("list")[0].children);

    const pokemons: IEntry[] = [];

    let tier = "";

    const shadowDomain = Object.values(gamemasterPokemon).filter(v => !v.aliasId && !v.isMega);
    const megaDomain = Object.values(gamemasterPokemon).filter(v => !v.aliasId && !v.isShadow);
    const normalDomain = Object.values(gamemasterPokemon).filter(v => !v.aliasId && !v.isShadow && !v.isMega);

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (Array.from(e.classList).includes("header-li")) {
            const newTier = (e as HTMLElement).innerText?.trim();
            if (newTier.split(" ").length === 2) {
                tier = newTier.split(" ")[1].toLocaleLowerCase();
            }

            if (newTier.split(" ").length === 1) {
                tier = newTier.toLocaleLowerCase();
            }
            continue;
        }

        const bossName = (e.getElementsByClassName("boss-name")[0] as HTMLElement).innerText.trim();
        const parsedPkm = fetchPokemonFromString([bossName], gamemasterPokemon, tier === "mega" ? megaDomain : bossName.toLocaleLowerCase().includes("shadow") ? shadowDomain : normalDomain);
        
        if (parsedPkm[0]) {
            pokemons.push({
                shiny: parsedPkm[0].shiny,
                speciesId: parsedPkm[0].speciesId,
                kind: tier
            });
        }
    }

    const results: IPostEntry = {
        date: (new Date()).valueOf(),
        //dateEnd: (new Date()).valueOf(),
        entries: pokemons,
    };

    return results;
}

export const mapLeekNews: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');

    const title = htmlDoc.getElementsByClassName("page-title")[0]?.textContent;
    const date = fetchDateFromString(htmlDoc.getElementById("event-date-start")?.textContent?.trim() + " " + htmlDoc.getElementById("event-time-start")?.textContent?.trim());
    const end = fetchDateFromString(htmlDoc.getElementById("event-date-end")?.textContent?.trim() + " " + htmlDoc.getElementById("event-time-end")?.textContent?.trim());

    if (!title) {
        console.error("Couldn't fetch title of leek news.");
        return {date: 0, dateEnd: 0, entries: []};
    }

    if (!date) {
        console.error("Couldn't fetch date of leek news.");
        return {date: 0, dateEnd: 0, entries: []};
    }

    const parts = title.split(" in ");
    if (parts.length !== 2) {
        console.error("Couldn't parse title of leek news.");
        return {date: 0, dateEnd: 0, entries: []};
    }

    const rawPkmName = parts[0];
    const raidType = parts[1];

    let domainToUse: IGamemasterPokemon[] = [];

    const isShadow = raidType.includes("Shadow");
    if (isShadow) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isMega && !p.aliasId);
    }

    const isMega = raidType.includes("Mega");
    if (isMega) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isShadow && !p.aliasId);
    }

    if (!isShadow && !isMega) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    }

    const finalEntries: IEntry[] = [];
    const multiplePkms = rawPkmName.split(" and "); // TODO: more than 2 pokémons? are they comma separated? ex: xurkitree buzzhole and pheromosa
    for (let i = 0; i < multiplePkms.length; i++) {
        const p = multiplePkms[i].trim();
        //const isShiny = Array.from(htmlDoc.getElementsByClassName("pkmn-list-img")).filter(e => e.parentElement?.getElementsByClassName("pkmn-name")[0]?.textContent === p.replaceAll("Mega", "").replaceAll("Shadow", "").trim()).map(i => i.children[0] as HTMLImageElement).some(i => i.src.endsWith("shiny.png"));
        //console.log(isShiny);
        const finalP = fetchPokemonFromString([p], gamemasterPokemon, domainToUse);
        if (finalP[0]?.speciesId) {
            finalEntries.push({
                speciesId: finalP[0].speciesId,
                kind: isMega ? "mega" : "5",//raidType.split(" Raid")[0].replaceAll("-star", ""),
                shiny: false //TODO
            });
        }
    }

    return {
        date: date,
        dateEnd: end,
        entries: finalEntries,
        //kind: raidType.split(" Raid")[0]
    };
}

const binarySearchPokemonByName = (arr: IGamemasterPokemon[], value: string) => {
    let start = 0, end = arr.length - 1;
   
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
   
        if (arr[mid].speciesName === value){
            return arr[mid];
        }
        
        if (arr[mid].speciesName < value) {
             start = mid + 1;
        }
        else {
             end = mid - 1;
        }
    }
   
    return null;
}

const normalizeSpeciesNameForId = (speciesName: string) => speciesName.replaceAll("-", "_").replaceAll(". ", "_").replaceAll("'", "").replaceAll("’", "").replaceAll(" ", "_").replaceAll(" (jr)", "_jr");
const ndfNormalized = (str: string) => str.toLocaleLowerCase().replaceAll("’", "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const mapSeason: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementById("spawns")?.getElementsByClassName("alola__pokemonTabContent") ?? []).map(e => e as HTMLElement);
    const wildDomain = Object.values(gamemasterPokemon)
        .filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    const wildEncounters = fetchPokemonFromElements(entries, gamemasterPokemon, wildDomain);

    return {
        date: new Date(2024, 2, 1, 10, 0).valueOf(),
        dateEnd: new Date(2024, 5, 1, 10, 0).valueOf(),
        entries: wildEncounters,
        eggs: []
    };
}

const fetchPokemonFromString = (parsedPokemon: string[], gamemasterPokemon: Dictionary<IGamemasterPokemon>, domain: IGamemasterPokemon[]) => {
    const wildEncounters: IEntry[] = [];
    const seen = new Set<string>();

    const pkmwithNoClothes = parsedPokemon.map(pp => {
        const idx = pp.indexOf(" wearing");
        if (idx !== -1) {
            return pp.substring(0, idx);
        }
        return pp;
    });
    
    let raidLevel = "";
    for (let j = 0; j < pkmwithNoClothes.length; j++) {
        const isShiny =  pkmwithNoClothes[j].includes("*");
        let isShadow = false;
        let isMega = false;
        let currP = ndfNormalized(pkmwithNoClothes[j].replace("*", "").replace(" Forme", "").trim()).trim();

        const raidLIndex = currP.indexOf(" raids");
        if (raidLIndex !== -1) {
            raidLevel = currP.substring(0, raidLIndex).replaceAll("one-star", "1").replaceAll("three-star", "3").replaceAll("five-star", "5").replaceAll("six-star", "6").replaceAll("shadow", "Shadow");
            //console.log(raidLevel);
            continue;
        }

        let words = currP.split(" ");

        if (words.includes("shadow")) {
            isShadow = true;
            words = words.filter(word => word !== "shadow"); // Remove "shadow" from the array
        }
        
        // Check if "mega" is a standalone word and remove it if present
        if (words.includes("mega")) {
            isMega = true;
            words = words.filter(word => word !== "mega"); // Remove "mega" from the array
        }
        
        // Join the array back into a string, preserving the original structure as much as possible
        currP = words.join(" ").trim();

        // First (90% hits): direct indexing
        // start by lowercasing and converting special characters
        const match = gamemasterPokemon[normalizeSpeciesNameForId(currP)];
        if (match && !isShadow && !isMega) {
            if (!seen.has(match.speciesId)) {
                seen.add(match.speciesId);

                wildEncounters.push({
                    speciesId: match.speciesId,
                    shiny: isShiny,
                    kind: raidLevel
                });
            }
            continue;
        }

        // from here, we have to deal with extreme cases: for example -> Red Flower Hat Galarian Tapu Lele Jumping Rope
        // or simpler ones: Galarian Muk

        // First, let's try to isolate the base pokémon name
        //this first commented approach wouldn't work for mew -> mewtwo
        //const isolatedPkmName = wildDomain.filter(domainP => currP.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(domainP.speciesName.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
        const isolatedPkmName = domain.filter(domainP => {
            // Normalize and lower case both strings for a case-insensitive, accent-insensitive comparison
            const normalizedDomainPSpeciesName = domainP.speciesName.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
            // Create a regex pattern that matches the species name as a whole word
            // \b at the start and end denotes word boundaries
            // The 'i' flag makes the search case-insensitive
            const pattern = new RegExp(`\\b${normalizedDomainPSpeciesName}\\b`, "i");
        
            // Check if the pattern matches within currP
            return pattern.test(currP);
        });

        if (isolatedPkmName.length === 0) {
            // Pokémon only has forms. Oricorio / giratina

            //first, find the form
            //then remove it from the string
            // then try to match any of the remaining words with any speciesName
            // if we have multiple occasions, then try to find one with what we removed (form)

            const formCandidate = currP.split(" ").filter(f => Array.from(knownForms).some(e => ndfNormalized(e) === f));
            if (formCandidate.length === 0) {
                console.error("(0) Couldn't map form for " + currP);
                continue;
            }

            if (formCandidate.length > 1) {
                console.error("Multiple forms for " + currP);
                continue;
            }

            const form = formCandidate[0]; //pom-pom

            const finalResults = domain.filter(wd => ndfNormalized(wd.speciesName).includes("(" + form + ")") && wd.isShadow === isShadow && wd.isMega === isMega);
            if (finalResults.length === 0) {
                console.error("Couldn't find Form in gamemaster.");
                continue;
            }

            if (finalResults.length === 1) {
                if (!seen.has(finalResults[0].speciesId)) {
                    seen.add(finalResults[0].speciesId);
                    
                    wildEncounters.push({
                        speciesId: finalResults[0].speciesId,
                        shiny: isShiny,
                        kind: raidLevel
                    });
                }

                continue;
            }

            //>1

            const pkmNameWithoutForm = currP.replaceAll(form, "").trim();
            //Style Oricorio
            const ans = domain.filter(wff => pkmNameWithoutForm.split(" ").some(s => ndfNormalized(wff.speciesName).includes(s)) && ndfNormalized(wff.speciesName).includes(form) && wff.isShadow === isShadow && wff.isMega === isMega);

            if (ans.length === 0) {
                console.error("No match found for " + currP);
                continue;
            }

            if (ans.length === 1) {
                if (!seen.has(ans[0].speciesId)) {
                    seen.add(ans[0].speciesId);
                    wildEncounters.push({
                        speciesId: ans[0].speciesId,
                        shiny: isShiny,
                        kind: raidLevel
                    });
                }
                continue;
            }

            console.error("Multiple matches for " + currP);
            continue;
        }
        
        if (isolatedPkmName.length > 1) {
            console.error("Couldn't isolate the base pokémon name of " + currP);
            continue;
        }

        const dex = isolatedPkmName[0].dex;
        // now try to find the form...
        // there can also be garbage in the currP, like "Red Flower Hat"

        const availableForms = (raidLevel.toLocaleLowerCase() !== "mega" || !isMega) ? !isShadow ? domain.filter(formC => formC.dex === dex && formC.isShadow === isShadow && formC.isMega === isMega) : Object.values(gamemasterPokemon).filter(l => !l.isMega && l.dex === dex && !l.aliasId && l.isShadow) : Object.values(gamemasterPokemon).filter(l => l.isMega && l.dex === dex && !l.aliasId && !l.isShadow);
        if (availableForms.length === 1) {
            if (!seen.has(availableForms[0].speciesId)) {
                seen.add(availableForms[0].speciesId);
                wildEncounters.push({
                    speciesId: availableForms[0].speciesId,
                    shiny: isShiny,
                    kind: raidLevel
                });
            }
            continue;
        }

        // ugly edge case for charizard mega x and y (and in the future for every pokémon with multiple megas)
        if (raidLevel === "Mega" || isMega) {
            if (dex === 6) {
                const words = currP.split(" ");
                if (words.includes("x")) {
                    if (!seen.has("charizard_mega_x")) {
                        seen.add("charizard_mega_x");
                        wildEncounters.push({
                            speciesId: "charizard_mega_x",
                            shiny: isShiny,
                            kind: raidLevel
                        });
                }
                continue;
                }
                if (words.includes("y")) {
                    if (!seen.has("charizard_mega_y")) {
                        seen.add("charizard_mega_y");
                        wildEncounters.push({
                            speciesId: "charizard_mega_y",
                            shiny: isShiny,
                            kind: raidLevel
                        });
                }
                continue;
                }
            }
        }

        if (availableForms.length === 0) {
            console.error("Couldn't find form of " + currP);
            continue;
        }

        const mappedForm = availableForms.filter(af => Array.from(knownForms).some(e => ndfNormalized(af.speciesName).includes(ndfNormalized(e)) && currP.includes(ndfNormalized(e))))
        if (mappedForm.length === 0) {
            if (isShadow) {
                const guess = Object.values(gamemasterPokemon).filter(g => !g.aliasId && g.isShadow && dex === g.dex && !Array.from(knownForms).some(f => ndfNormalized(g.speciesName).includes(ndfNormalized(f))));
                if (guess.length === 1) {
                    if (!seen.has(guess[0].speciesId)) {
                        seen.add(guess[0].speciesId);
                        wildEncounters.push({
                            speciesId: guess[0].speciesId,
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }
                    continue;
                }
            }
            console.error("Couldn't map form for " + currP);
            continue;
        }

        if (mappedForm.length === 1) {
            if (!seen.has(mappedForm[0].speciesId)) {
                seen.add(mappedForm[0].speciesId);
                wildEncounters.push({
                    speciesId: mappedForm[0].speciesId,
                    shiny: isShiny,
                    kind: raidLevel
                });
            }
            continue;
        }

        console.error("Multiple forms for " + currP);
        continue;
    }

    //console.log(wildEncounters)
    return wildEncounters;
}

const knownForms = new Set([
    //"Mega X",
    //"Mega Y",
    //"Mega",
    //"Shadow",
    "Mow",
    "Alolan",
    "Wash",
    "Plant",
    "Sandy",
    "Trash",
    "Frost",
    "Sky",
    "Hero",
    "Speed",
    "Land",
    //"Primal",
    "Attack",
    "Origin",
    "Aria",
    "Burn",
    "Unbound",
    "Pa'u",
    //"Pa’u",
    "Dusk",
    "Armored",
    "Paldean",
    "Rainy",
    "Snowy",
    "Sunny",
    "Defense",
    "Chill",
    "Douse",
    "Shock",
    "Baile",
    "Sensu",
    "Galarian",
    "Hisuian",
    "Ordinary",
    "Large",
    "Small",
    "Super",
    "Midday",
    "Overcast",
    "Sunshine",
    "Altered",
    "Therian",
    "Pom-Pom",
    "Average",
    "Midnight",
    "Incarnate",
    "Standard",
]);

const fetchPokemonFromElements = (elements: HTMLElement[], gamemasterPokemon: Dictionary<IGamemasterPokemon>, domain: IGamemasterPokemon[]) => {
    //const shinySeen = new Set<string>();
    const textes = [];
    const stack = [...elements];
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node || Array.from(node.classList ?? []).includes("ContainerBlock__headline")) {
            continue;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            const actualText = node.textContent?.trim();
            if (actualText) {
                textes.push(actualText);
            }
            continue;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                stack.push(node.childNodes[i] as HTMLElement);
            }
        }
    }
    const blackListedKeywords = ["some trainers", "the following", "appearing", "lucky, you m", "and more", "wild encounters", "sunny", "rainy", "snow", "partly cloudy", "cloudy", "windy", "fog"];
    const parsedPokemon = textes.filter(t => t.split(" ").length <= 10 && !blackListedKeywords.some(k => t.toLocaleLowerCase().includes(k)));

    return fetchPokemonFromString(parsedPokemon, gamemasterPokemon, domain);
}

const isValidDate = (d: Date) => {
    return d instanceof Date && !isNaN(d.getTime());
}

const toMonthIndex = (month: string) => ["January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"].indexOf(month);

const fetchDateFromString = (date: string) => {
    const trimmedDate = date.trim().replaceAll("  ", " ").replaceAll("a.m.", "am").replaceAll("A.M.", "am").replaceAll("p.m.", "pm").replaceAll("P.M.", "pm");
    let dWithoutWeekDay = trimmedDate.substring(trimmedDate.indexOf(", ") + 2);
    const hasYear = dWithoutWeekDay.split(", ")[1].trim().length === 4 && Number(dWithoutWeekDay.split(", ")[1].trim()) > 2020 && Number(dWithoutWeekDay.split(", ")[1].trim()) < 2050;
    let year = (new Date()).getFullYear();
    if (hasYear) {
        year = Number(dWithoutWeekDay.split(", ")[1]);
        dWithoutWeekDay = dWithoutWeekDay.split(", ").filter((e: string, i: number) => i !== 1).join(", ");
    }
    const localIdx = dWithoutWeekDay.toLocaleLowerCase().lastIndexOf("local");
    const finalDate = dWithoutWeekDay.substring(0, localIdx === -1 ? undefined : localIdx).trim().replace(", at", "");
    const components = finalDate.split(" ");
    const timeComponent = components[2].split(":");
    const dateObj = new Date(year, toMonthIndex(components[0]), Number(components[1]), Number(timeComponent[0] === "12" && components[3].toLocaleLowerCase() === "am" ? 0 : timeComponent[0]) + Number(components[3].toLocaleLowerCase() === "pm" ? 12 : 0), Number(timeComponent[1]));

    return dateObj.valueOf();
}

export const mapPosts: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => Dictionary<IPostEntry> = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const res: Dictionary<IPostEntry> = {};
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("ContainerBlock"));

    if (entries.length === 0) {
        return {};
    }

    let date = (entries[0].children[1] as HTMLElement)?.innerText?.trim();

    if (!date) {
        return {};
    }
    
    if (date.includes(" from ")) {
        if (!date.includes(" to ") || !date.includes(" at ")) {
            return {};
        }
        const split = date.split(" to ");
        split[0] = split[0].replace(" from ", " at ");
        const idx = split[0].indexOf(" at ") + 4;
        split[1] = split[0].substring(0, idx) + split[1];
        date = split.join(" to ");
    }

    const parsedDate = date.split(" to ");
    if (parsedDate.length !== 2 || parsedDate[0].split(" ").length > 10 || parsedDate[1].split(" ").length > 10) {
        return {};
    }

    const startDate = fetchDateFromString(parsedDate[0]);
    const endDate = fetchDateFromString(parsedDate[1]);

    const wildDomain = Object.values(gamemasterPokemon)
        .filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    
    const raidDomain = Object.values(gamemasterPokemon)
    .filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    
    for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry.children[0];
        const kind = (title as HTMLElement)?.innerText?.trim();
        const contentBodies = Array.from(entry.children) as HTMLElement[];
        switch(kind) {
            case "Wild encounters":
                const wildEncounters = fetchPokemonFromElements(contentBodies, gamemasterPokemon, wildDomain);
                res["wild"] = {
                    date: startDate,
                    dateEnd: endDate,
                    entries: wildEncounters
                };
                break;
            case "Eggs":
                break;
            case "Raids":
            case "Shadow Raids":
            case "Shadow Raid debut":
                const raids = fetchPokemonFromElements(contentBodies, gamemasterPokemon, raidDomain);
                res["raids"] = {
                    date: startDate,
                    dateEnd: endDate,
                    entries: raids
                };
                break;
            default:
                break;
        }
    }

    return res;
}

export const mapRankedPokemon: (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => Dictionary<IRankedPokemon> = (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const observedPokemon = new Set<string>();

    let rankId = "";
    switch (request.responseURL) {
        case pvpokeRankings1500Url:
            rankId = "great";
            break;
        case pvpokeRankings2500Url:
            rankId = "ultra";
            break;
        case pvpokeRankingsUrl:
            rankId = "master";
            break;
    }

    const rankedPokemonDictionary: Dictionary<IRankedPokemon> = {};

    (Array.from(data) as any[])
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
        .forEach((pokemon, index) => {
            const p = gamemasterPokemon[pokemon.speciesId];
            const computedId = p.aliasId ?? p.speciesId;
            const computedRank = index + 1;

            let parsedRankChange = 0;

            if (rankId) {
                const computedKey = `${computedId}${rankId}`;
                const computedRankChange = readEntry<number[]>(computedKey, (data: number[]) => {
                    if (data && data[1]) {
                        data[0] = data[1];
                        delete data[1];
                    }
                });

                if (computedRankChange) {
                    if (!computedRankChange[0]) {
                        computedRankChange[0] = computedRank;
                        writeEntry(computedKey, computedRankChange, rankChangesCacheTtlInMillis);
                    } else {
                        const latestValue = computedRankChange[1];
                        if (latestValue) {
                            if (latestValue !== computedRank) {
                                computedRankChange[0] = computedRankChange[1];
                                computedRankChange[1] = computedRank;
                                writeEntry(computedKey, computedRankChange, rankChangesCacheTtlInMillis);
                            }
                            parsedRankChange = computedRankChange[0] - computedRank;
                        } else {
                            if (computedRank !== computedRankChange[0]) {
                                computedRankChange[1] = computedRank;
                                parsedRankChange = computedRankChange[0] - computedRank;
                                writeEntry(computedKey, computedRankChange, rankChangesCacheTtlInMillis);
                            }
                        }
                    }
                } else {
                    writeEntry(computedKey, [computedRank], rankChangesCacheTtlInMillis);
                }
            }

            rankedPokemonDictionary[computedId] = {
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
                rank: computedRank,
                rankChange: parsedRankChange,
                matchups: Array.from(pokemon.matchups).map((m: any) => ({
                    speciesId: m.opponent,
                    rating: m.rating
                })),
                counters: Array.from(pokemon.counters).map((m: any) => ({
                    speciesId: m.opponent,
                    rating: m.rating
                }))
            }
        }
    );

    return rankedPokemonDictionary;
}

export const mapGameMaster: (data: any) => Dictionary<IGameMasterMove> = (data: any) => {
    type PvPMove = {
        moveId: string,
        vId: string,
        type: string,
        isFast: boolean,
        pvpPower: number,
        pvpEnergy: number,
        pvpCooldown: number,
        buffs: any
    };

    type PvEMove = {
        moveId: string,
        vId: string,
        type: string,
        isFast: boolean,
        pvePower: number,
        pveEnergy: number,
        pveCooldown: number
    };

    const pvpMoves: Dictionary<PvPMove> = {};
    const pveMoves: Dictionary<PvEMove> = {};

    const renamedMoveIds: Dictionary<string> = {
        "FUTURESIGHT": "FUTURE_SIGHT",
        "TECHNO_BLAST_WATER": "TECHNO_BLAST_DOUSE"
    };

    (Array.from(data) as any[])
        .filter(entry => entry.data?.moveSettings || entry.data.combatMove)
        .forEach(entry => {
            const isPvP = !!entry.data.combatMove;
            const dataPointer = entry.data.moveSettings || entry.data.combatMove;
            const moveIdPointer = dataPointer.movementId || dataPointer.uniqueId;
            const typePointer = dataPointer.pokemonType || dataPointer.type;

            const id = moveIdPointer.endsWith("_FAST") ? moveIdPointer.substring(0, moveIdPointer.lastIndexOf("_FAST")) : moveIdPointer
            const isFast = moveIdPointer.endsWith("_FAST");

            if (isPvP) {
                const term = "COMBAT_V";
                const vidSubstring = entry.templateId.substring(entry.templateId.indexOf(term) + term.length);
                pvpMoves[id] = {
                    moveId: id,
                    vId: vidSubstring.substring(0, vidSubstring.indexOf("_")),
                    type: typePointer.split("POKEMON_TYPE_")[1].toLocaleLowerCase(),
                    isFast: isFast,
                    pvpPower: dataPointer.power,
                    pvpEnergy: dataPointer.energyDelta,
                    pvpCooldown: isFast ? (+(dataPointer.durationTurns ?? 0) + 1) / 2 : 0,
                    buffs: dataPointer.buffs
                }
            } else {
                pveMoves[id] = {
                    moveId: id,
                    vId: entry.templateId.substring(1, entry.templateId.indexOf("_")),
                    type: typePointer.split("POKEMON_TYPE_")[1].toLocaleLowerCase(),
                    isFast: isFast,
                    pvePower: dataPointer.power,
                    pveEnergy: dataPointer.energyDelta,
                    pveCooldown: +dataPointer.durationMs / 1000,
                }
            }
        }
    );

    const movesDictionary: Dictionary<IGameMasterMove> = {}

    Object.values(pvpMoves)
        .forEach(move => {
            if (!move.moveId) {
                return;
            }

            if (!move.type) {
                console.error(`missing type for move ${move.moveId}`);
            }

            const pveCounterpart = pveMoves[move.moveId];

            const translatedId = renamedMoveIds[move.moveId] ?? move.moveId;

            movesDictionary[translatedId] = {
                moveId: translatedId,
                vId: move.vId,
                type: move.type,
                isFast: move.isFast,
                pvpPower: move.pvpPower ?? 0,
                pvePower: pveCounterpart?.pvePower ?? 0,
                pvpEnergyDelta: move.pvpEnergy ?? 0,
                pveEnergyDelta: pveCounterpart?.pveEnergy ?? 0,
                pvpDuration: move.pvpCooldown ?? 0,
                pveDuration: pveCounterpart?.pveCooldown ?? 0,
                pvpBuffs: move?.buffs ? {
                    chance: move.buffs.buffActivationChance as number,
                    buffs: Object.entries(move.buffs).filter(e => e[0] !== "buffActivationChance").map(e => ({
                        buff: e[0],
                        quantity: e[1] as number
                    })),
                } : undefined
            }
        });

    Object.values(pveMoves)
    .forEach(move => {
        if (!move.moveId) {
            return;
        }

        if (!move.type) {
            console.error(`missing type for move ${move.moveId}`);
        }

        const pvpCounterpart = pvpMoves[move.moveId];

        const translatedId = renamedMoveIds[move.moveId] ?? move.moveId;

        movesDictionary[translatedId] = {
            moveId: translatedId,
            vId: move.vId,
            type: move.type,
            isFast: move.isFast,
            pvpPower: pvpCounterpart?.pvpPower ?? 0,
            pvePower: move.pvePower ?? 0,
            pvpEnergyDelta: pvpCounterpart?.pvpEnergy ?? 0,
            pveEnergyDelta: move.pveEnergy ?? 0,
            pvpDuration: pvpCounterpart?.pvpCooldown ?? 0,
            pveDuration: move.pveCooldown ?? 0,
            pvpBuffs: pvpCounterpart?.buffs ? {
                chance: pvpCounterpart.buffs.buffActivationChance as number,
                buffs: Object.entries(pvpCounterpart.buffs).filter(e => e[0] !== "buffActivationChance").map(e => ({
                    buff: e[0],
                    quantity: e[1] as number
                })),
            } : undefined
        }
    });
    
    return movesDictionary;
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

const sexConverter = (name: string) => {
    return name
        .replace("Male", "♂")
        .replace("Female", "♀");
}