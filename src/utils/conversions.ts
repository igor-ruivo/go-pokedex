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
import { IEntry, IPostEntry, IRaidEntry } from "../DTOs/INews";

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
        "annihilape"
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

export const mapRaidBosses: (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => Dictionary<IRaidBoss[]> = (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("blogList__posts")[0].children);

    console.log(entries);
    // first, trying to parse by name without forms.
    // if <=1 match, return immediatelly
    // otherwise, check types
    // if <= 1 return;
    // otherwise, check cps while > 1 count...
    // if still >1 , return first

    let tier = "0";

    const results: Dictionary<IRaidBoss[]> = {};

    for (let b of entries) {
        if (b.classList.contains("header-li")) {
            const innerTxt = (b as HTMLElement).innerText;
            if (innerTxt === "Mega") {
                tier = "mega";
            } else {
                tier = innerTxt.split(" ")[1];
            }
            results[tier] = [];
            continue;
        }

        const hasShiny = b.getElementsByClassName("shiny-icon").length > 0;

        const bossName = b.getElementsByClassName("boss-name")[0].innerHTML;
        let matches = Object.values(gamemasterPokemon).filter(p =>
            !p.aliasId &&
            !p.isShadow &&
            removeFormsFromPokemonName(p.speciesName) === removeFormsFromPokemonName(bossName)
        );

        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        // Multiple matches...

        const types = Array.from(b.getElementsByClassName("boss-type")).map(e => Array.from(e.children).map(c => (c as HTMLImageElement).title)).flat();
        
        matches = matches.filter(p => p.types.length === types.length && p.types.map(t => t.toString().toLocaleLowerCase()).every(u => types.map(v => v.toLocaleLowerCase()).includes(u)));
        
        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        const CP = (b.getElementsByClassName("boss-2")[0] as HTMLElement).innerText.trim().substring(3).split(" - ");
        const lowerCP = Number(CP[0]);
        const higherCP = Number(CP[1]);

        const WBCP = (b.getElementsByClassName("boss-3")[0] as HTMLElement).innerText.trim().substring(3).split(" - ");
        const lowerWBCP = Number(WBCP[0]);
        const higherWBCP = Number(WBCP[1]);

        matches = matches.filter(p => calculateCP(p.atk, 10, p.def, 10, p.hp, 10, levelToLevelIndex(20)) === lowerCP);
        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        matches = matches.filter(p => calculateCP(p.atk, 15, p.def, 15, p.hp, 15, levelToLevelIndex(20)) === higherCP);
        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        matches = matches.filter(p => calculateCP(p.atk, 10, p.def, 10, p.hp, 10, levelToLevelIndex(25)) === lowerWBCP);
        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        matches = matches.filter(p => calculateCP(p.atk, 15, p.def, 15, p.hp, 15, levelToLevelIndex(25)) === higherWBCP);
        if (matches.length === 0) {
            continue;
        }

        if (matches.length === 1) {
            results[tier].push({
                speciesId: matches[0].speciesId,
                shiny: hasShiny
            });
            continue;
        }

        console.error("Couldn't parse raid pokémon to model DTO: " + bossName);
    }

    return results;
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

const normalizeSpeciesNameForId = (speciesName: string) => speciesName.toLocaleLowerCase().replaceAll("-", "_").replaceAll(". ", "_").replaceAll("'", "").replaceAll("’", "").replaceAll(" ", "_").replaceAll(" (jr)", "_jr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ndfNormalized = (str: string) => str.toLocaleLowerCase().replaceAll("’", "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const mapSeason: (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => Dictionary<IRaidBoss[]> = (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementById("spawns")?.getElementsByClassName("alola__pokemonTabContent") ?? []).map(e => e as HTMLElement);
    const wildDomain = Object.values(gamemasterPokemon)
        .filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    const wildEncounters = fetchPokemonFromElements(entries, gamemasterPokemon, wildDomain);

    return data;
}

const fetchPokemonFromElements = (elements: HTMLElement[], gamemasterPokemon: Dictionary<IGamemasterPokemon>, domain: IGamemasterPokemon[]) => {
    const wildEncounters: IEntry[] = [];
    const textes = [];
    const stack = [...elements];
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node) {
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
    const pkmwithNoClothes = parsedPokemon.map(pp => {
        const idx = pp.indexOf(" wearing");
        if (idx !== -1) {
            return pp.substring(0, idx);
        }
        return pp;
    });
    
    for (let j = 0; j < pkmwithNoClothes.length; j++) {
        const isShiny =  pkmwithNoClothes[j].includes("*");
        let currP = pkmwithNoClothes[j].replace("*", "").trim();

        // First (90% hits): direct indexing
        // start by lowercasing and converting special characters
        const match = gamemasterPokemon[normalizeSpeciesNameForId(currP)];
        if (match) {
            wildEncounters.push({
                speciesId: match.speciesId,
                shiny: isShiny
            });
            continue;
        }

        const gamemasterKnownForms = new Set([
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
            "Primal",
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

        // from here, we have to deal with extreme cases: for example -> Red Flower Hat Galarian Tapu Lele Jumping Rope
        // or simpler ones: Galarian Muk

        // First, let's try to isolate the base pokémon name
        //this first commented approach wouldn't work for mew -> mewtwo
        //const isolatedPkmName = wildDomain.filter(domainP => currP.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(domainP.speciesName.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
        const isolatedPkmName = domain.filter(domainP => {
            // Normalize and lower case both strings for a case-insensitive, accent-insensitive comparison
            const normalizedCurrP = currP.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedDomainPSpeciesName = domainP.speciesName.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
            // Create a regex pattern that matches the species name as a whole word
            // \b at the start and end denotes word boundaries
            // The 'i' flag makes the search case-insensitive
            const pattern = new RegExp(`\\b${normalizedDomainPSpeciesName}\\b`, "i");
        
            // Check if the pattern matches within currP
            return pattern.test(normalizedCurrP);
        });


        if (isolatedPkmName.length === 0) {
            // Pokémon only has forms. Oricorio?

            //first, find the form
            //then remove it from the string
            // then try to match any of the remaining words with any speciesName
            // if we have multiple occasions, then try to find one with what we removed (form)

            const formCandidate = currP.split(" ").map(p => ndfNormalized(p)).filter(f => Array.from(gamemasterKnownForms).some(e => ndfNormalized(e) === f));
            if (formCandidate.length === 0) {
                console.error("(0) Couldn't map form for " + currP);
                continue;
            }

            if (formCandidate.length > 1) {
                console.error("Multiple forms for " + currP);
                continue;
            }

            const form = formCandidate[0]; //pom-pom

            const finalResults = domain.filter(wd => ndfNormalized(wd.speciesName).includes("(" + form + ")"));
            if (finalResults.length === 0) {
                console.error("Couldn't find Form in gamemaster.");
                continue;
            }

            if (finalResults.length === 1) {
                wildEncounters.push({
                    speciesId: finalResults[0].speciesId,
                    shiny: isShiny
                });
                continue;
            }

            //>1

            const pkmNameWithoutForm = ndfNormalized(currP).replaceAll(form, "");
            //Style Oricorio
            const ans = domain.filter(wff => pkmNameWithoutForm.split(" ").some(s => ndfNormalized(wff.speciesName).includes(s)) && ndfNormalized(wff.speciesName).includes(form));

            if (ans.length === 0) {
                console.error("No match found for " + currP);
                continue;
            }

            if (ans.length === 1) {
                wildEncounters.push({
                    speciesId: ans[0].speciesId,
                    shiny: isShiny
                });
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

        const availableForms = domain.filter(formC => formC.dex === dex);
        if (availableForms.length === 1) {
            wildEncounters.push({
                speciesId: availableForms[0].speciesId,
                shiny: isShiny
            });
            continue;
        }

        if (availableForms.length === 0) {
            console.error("Couldn't find form of " + currP);
            continue;
        }

        const mappedForm = availableForms.filter(af => Array.from(gamemasterKnownForms).some(e => ndfNormalized(af.speciesName).includes(ndfNormalized(e)) && ndfNormalized(currP).includes(ndfNormalized(e))))
        if (mappedForm.length === 0) {
            console.error("Couldn't map form for " + currP);
            continue;
        }

        if (mappedForm.length === 1) {
            wildEncounters.push({
                speciesId: mappedForm[0].speciesId,
                shiny: isShiny
            });
            continue;
        }

        console.error("Multiple forms for " + currP);
        continue;
    }

    console.log(wildEncounters)
    return wildEncounters;
}

export const mapPosts: (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => Dictionary<IRaidBoss[]> = (data: any, request: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("ContainerBlock"));

    const raidsEntries: Dictionary<IEntry[]> = {};

    if (entries.length === 0) {
        return {};
    }

    const date = (entries[0].children[1] as HTMLElement)?.innerText.trim();
    if (!date) {
        return {};
    }

    const wildDomain = Object.values(gamemasterPokemon)
        .filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    
    for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry.children[0];
        const kind = (title as HTMLElement)?.innerText.trim();
        const contentBodies = Array.from(entry.children) as HTMLElement[];
        switch(kind) {
            case "Wild encounters":
                const wildEncounters = fetchPokemonFromElements(contentBodies, gamemasterPokemon, wildDomain);
                break;
            case "Eggs":
                //console.log("Detected Eggs");
                break;
            case "Raids":
                //console.log("Detected Raids");
                break;
            default:
                break;
        }
    }

    return {};
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