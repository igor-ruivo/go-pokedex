import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import Dictionary from "./Dictionary";
import { corsProxyUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl, rankChangesCacheTtlInMillis } from "./Configs";
import { readEntry, writeEntry } from "./resource-cache";
import { IGameMasterMove } from "../DTOs/IGameMasterMove";
import { ITranslatedGame, ITranslatedGruntPhrase, ITranslatedMove } from "../DTOs/ITranslatedGame";
import { IEntry, IPostEntry, IRocketGrunt } from "../DTOs/INews";

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

export const mapTranslatedMoves: (data: any) => ITranslatedGame = (data: any) => {
    const translatedMovesDictionary: Dictionary<ITranslatedMove> = {};
    const translatedPhrasesDictionary: Dictionary<ITranslatedGruntPhrase> = {};
    const term = "move_name_";
    const gruntTerm = 'combat_grunt_quote';

    const arr = Array.from(data.data);

    (arr as any[])
        .forEach((t: string, index: number) => {
            if (t.startsWith(term)) {
                const vid = t.substring(term.length);
                const moveName = arr[index + 1];
                translatedMovesDictionary[vid] = {
                    vId: vid,
                    name: moveName as string
                }
            }

            if (t.startsWith(gruntTerm)) {
                const key = t.substring(gruntTerm.length);
                const name = arr[index + 1];
                translatedPhrasesDictionary[key] = {
                    key: key,
                    phrase: name as string
                }
            }

            if (t === 'combat_giovanni_quote#1') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Giovanni'] = {
                    key: 'Giovanni',
                    phrase: name as string
                }
            }

            if (t === 'combat_cliff_quote#1') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Cliff'] = {
                    key: 'Cliff',
                    phrase: name as string
                }
            }

            if (t === 'combat_arlo_quote#1') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Arlo'] = {
                    key: 'Arlo',
                    phrase: name as string
                }
            }

            if (t === 'combat_sierra_quote#1') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Sierra'] = {
                    key: 'Sierra',
                    phrase: name as string
                }
            }

            if (t === 'combat_grunt_decoy_quote#1') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Decoy Female Grunt'] = {
                    key: 'Decoy Female Grunt',
                    phrase: name as string
                }
            }

            if (t === 'combat_grunt_quote#1__male_speaker') {
                const name = arr[index + 1];
                translatedPhrasesDictionary['Male Grunt'] = {
                    key: 'Male Grunt',
                    phrase: name as string
                }

                translatedPhrasesDictionary['Female Grunt'] = {
                    key: 'Female Grunt',
                    phrase: name as string
                }
            }
        });

    return {
        moves: translatedMovesDictionary,
        rocketPhrases: translatedPhrasesDictionary
    };
}

/*
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
*/

export const mapRaidBosses: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("list")[0].children);
    const shadowEntries = Array.from(htmlDoc.getElementsByClassName("list")[1].children);

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

        if (!Array.from(e.classList).includes("boss-item")) {
            continue;
        }

        const bossName = (e.getElementsByClassName("boss-name")[0] as HTMLElement).innerText.trim();
        const parsedPkm = fetchPokemonFromString([bossName], gamemasterPokemon, tier === "mega" ? megaDomain : bossName.toLocaleLowerCase().includes("shadow") ? shadowDomain : normalDomain);
        
        if (parsedPkm[0] && tier !== "5" && tier !== "mega") {
            pokemons.push({
                shiny: parsedPkm[0].shiny,
                speciesId: parsedPkm[0].speciesId,
                kind: tier
            });
        }
    }

    for (let i = 0; i < shadowEntries.length; i++) {
        const e = shadowEntries[i];
        if (Array.from(e.classList).includes("header-li")) {
            const newTier = (e as HTMLElement).innerText?.replaceAll('Shadow', '').replaceAll('shadow', '').trim();
            if (newTier.split(" ").length === 2) {
                tier = newTier.split(" ")[1].toLocaleLowerCase();
            }

            if (newTier.split(" ").length === 1) {
                tier = newTier.toLocaleLowerCase();
            }
            continue;
        }

        if (!Array.from(e.classList).includes("boss-item")) {
            continue;
        }

        const bossName = 'Shadow ' + (e.getElementsByClassName("boss-name")[0] as HTMLElement).innerText.trim();
        const parsedPkm = fetchPokemonFromString([bossName], gamemasterPokemon, shadowDomain);
        
        if (parsedPkm[0] && tier !== "5" && tier !== "mega") {
            pokemons.push({
                shiny: parsedPkm[0].shiny,
                speciesId: parsedPkm[0].speciesId,
                kind: tier,
                comment: 'shadow'
            });
        }
    }

    const results: IPostEntry = {
        date: (new Date()).valueOf(),
        //dateEnd: (new Date()).valueOf(),
        raids: pokemons,
        title: "Current Raid Bosses"
    };

    return results;
}

export const mapLeekNews: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');

    const title = htmlDoc.getElementsByClassName("page-title")[0]?.textContent?.replace(/\s/g, ' ').trim();

    const dateCont = (htmlDoc.getElementById("event-date-start")?.textContent?.trim() + " " + htmlDoc.getElementById("event-time-start")?.textContent?.trim()).replaceAll("  ", " ");
    const endCont = (htmlDoc.getElementById("event-date-end")?.textContent?.trim() + " " + htmlDoc.getElementById("event-time-end")?.textContent?.trim()).replaceAll("  ", " ");

    const date = fetchDateFromString(dateCont);
    const end = fetchDateFromString(endCont);

    if (!title) {
        console.error("Couldn't fetch title of leek news.");
        return {title: "", date: 0, dateEnd: 0};
    }

    if (!date || !end) {
        console.error("Couldn't fetch date of leek news:");
        console.error(dateCont);
        console.error(endCont);
        return {title: "", date: 0, dateEnd: 0};
    }

    let rawPkmName = '';
    let isSpotlight = false;

    if (title.includes("Spotlight")) {
        isSpotlight = true;
        rawPkmName = title.split("Spotlight")[0].trim();
    }

    const parts = title.split(" in ");
    if (parts.length < 2 && !isSpotlight) {
        console.error("Couldn't parse title of leek news.");
        console.error(title)
        return {title: "", date: 0, dateEnd: 0};
    }

    let raidType = '';

    if (!isSpotlight) {
        rawPkmName = parts[0];
        raidType = parts[1];
    }

    let domainToUse: IGamemasterPokemon[] = [];

    const isShadow = raidType.includes("Shadow") || rawPkmName.includes("Shadow");
    if (isShadow) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isMega && !p.aliasId);
    }

    const isMega = raidType.includes("Mega") || raidType.includes("Elite");
    if (isMega) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isShadow && !p.aliasId);
    }

    if (!isShadow && !isMega) {
        domainToUse = Object.values(gamemasterPokemon).filter(p => !p.isShadow && !p.isMega && !p.aliasId);
    }

    const finalEntries: IEntry[] = [];
    const multiplePkms = rawPkmName.replaceAll(', ', ',').replaceAll(' and ', ',').split(","); // TODO: more than 2 pokémons? are they comma separated? ex: xurkitree buzzhole and pheromosa
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
        raids: !isSpotlight ? finalEntries : [],
        title: title,
        imgUrl: isSpotlight ? `${process.env.PUBLIC_URL}/images/spotlight.png` : '',
        spotlightBonus: (htmlDoc.getElementsByClassName('event-description')[0] as HTMLElement)?.innerText.split('bonus is')[1]?.split('.')[0].trim(),
        spotlightPokemons: isSpotlight ? finalEntries : []
        //kind: raidType.split(" Raid")[0]
    };
}

export const mapLeekEggs: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("page-content")[0]?.children ?? []);

    const pokemons: IEntry[] = [];

    let km = "";
    let comment = "";

    const normalDomain = Object.values(gamemasterPokemon).filter(v => !v.aliasId && !v.isShadow && !v.isMega);

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.tagName === "H2") {
            const txt = (e as HTMLElement).innerText?.trim();
            km = txt.split(" ")[0];

            if (txt.includes("(")) {
                comment = txt.substring(txt.indexOf("("));
            } else {
                comment = "";
            }

            continue;
        }

        if (e.classList.contains("egg-list-flex")) {
            const pkmList = Array.from(e.children).map(c => (c.getElementsByClassName("hatch-pkmn")[0] as HTMLElement).innerText.trim());
            const parsedPkm = fetchPokemonFromString(pkmList, gamemasterPokemon, normalDomain).map(r => { return { ...r, kind: km, comment: comment }; });
            pokemons.push(...parsedPkm);
        }
    }

    const results: IPostEntry = {
        date: (new Date()).valueOf(),
        //dateEnd: (new Date()).valueOf(),
        eggs: pokemons,
        title: "Current Eggs"
    };

    return results;
}

export const mapLeekRockets: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => IRocketGrunt[] = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("rocket-profile"));

    const answer: IRocketGrunt[] = [];

    const shadowDomain = Object.values(gamemasterPokemon).filter(v => !v.aliasId && !v.isShadow && !v.isMega);

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];

        const trainerId = (e.getElementsByClassName("name")[0] as HTMLElement)?.innerText.trim() ?? "";
        const typeIdx = trainerId.indexOf("-type");
        const type = typeIdx !== -1 ? trainerId.substring(0, typeIdx).toLocaleLowerCase() : undefined;
        const phrase = (e.getElementsByClassName("quote-text")[0] as HTMLElement)?.innerText.trim() ?? "";

        const tier1 = Array.from(e.getElementsByClassName("lineup-info")[0].children[0].getElementsByClassName("shadow-pokemon")).map(p => (p as HTMLElement)?.getAttribute('data-pokemon')?.trim() ?? '');
        const tier2 = Array.from(e.getElementsByClassName("lineup-info")[0].children[1].getElementsByClassName("shadow-pokemon")).map(p => (p as HTMLElement)?.getAttribute('data-pokemon')?.trim() ?? '');
        const tier3 = Array.from(e.getElementsByClassName("lineup-info")[0].children[2].getElementsByClassName("shadow-pokemon")).map(p => (p as HTMLElement)?.getAttribute('data-pokemon')?.trim() ?? '');

        const tier1Pkms = fetchPokemonFromString(tier1, gamemasterPokemon, shadowDomain).map(e => e.speciesId);
        const tier2Pkms = fetchPokemonFromString(tier2, gamemasterPokemon, shadowDomain).map(e => e.speciesId);
        const tier3Pkms = fetchPokemonFromString(tier3, gamemasterPokemon, shadowDomain).map(e => e.speciesId);

        const catchableTiers = Array.from(e.getElementsByClassName("lineup-info")[0].children).map((c: Element, i: number) => c.classList.contains("encounter") ? i : undefined).filter(e => e !== undefined) as number[];

        answer.push({
            phrase: phrase.replace(/\s/g, ' ').trim(),
            type: type?.replace(/\s/g, ' ').trim(),
            trainerId: trainerId.replace(/\s/g, ' ').trim(),
            tier1: tier1Pkms,
            tier2: tier2Pkms,
            tier3: tier3Pkms,
            catchableTiers: catchableTiers
        });
    }

    return answer;
}

/*const binarySearchPokemonByName = (arr: IGamemasterPokemon[], value: string) => {
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
}*/

const normalizeSpeciesNameForId = (speciesName: string) => speciesName.replaceAll("-", "_").replaceAll(". ", "_").replaceAll("'", "").replaceAll("’", "").replaceAll(" ", "_").replaceAll(" (jr)", "_jr").replaceAll('♂', '_male').replaceAll('♀', '_female');
const ndfNormalized = (str: string) => str.toLocaleLowerCase().replaceAll("’", "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const mapSeason: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any, isPT?: boolean) => IPostEntry = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any, isPT = false) => {
    const url: string = request.responseURL;
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');

    if (!isPT) {
        const appearing = Array.from(htmlDoc.getElementById('different-pokemon-appearing')?.querySelectorAll('[role=list]') ?? []);
        const eggsElement = Array.from(htmlDoc.getElementById('eggs')?.querySelectorAll('[role=list]') ?? []);

        const cityEntries = Array.from(appearing[0].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const forestEntries = Array.from(appearing[1].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const mountainEntries = Array.from(appearing[2].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const beachEntries = Array.from(appearing[3].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const northEntries = Array.from(appearing[4].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const southEntries = Array.from(appearing[5].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const wildDomain = Object.values(gamemasterPokemon)
            .filter(p => !p.isShadow && !p.isMega && !p.aliasId);

        const twoKmEggs = Array.from(eggsElement[0].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const fiveKmEggs = Array.from(eggsElement[1].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const sevenKmEggs = Array.from(eggsElement[3].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const tenKmEggs = Array.from(eggsElement[5].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const fiveSyncKmEggs = Array.from(eggsElement[2].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const sevenRoutesKmEggs = Array.from(eggsElement[4].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);
        const tenSyncKmEggs = Array.from(eggsElement[6].querySelectorAll('[role=listitem]')).map(e => e as HTMLElement);

        const fiveComment = 'Adventure Sync Rewards';
        const sevenComment = 'Route Rewards';
        const tenComment = 'Adventure Sync Rewards';

        const convertKind = (kind: number) => {
            switch (kind) {
                case 0:
                    return "2";
                case 1:
                    return "5";
                case 2:
                    return "7";
                case 3:
                    return "10";
                case 4:
                    return "5";
                case 5:
                    return "7";
                case 6:
                    return "10";
                default:
                    throw new Error("Invalid egg idx");
            }
        }

        const getComment = (kind: number) => {
            switch (kind) {
                case 0:
                case 1:
                case 2:
                case 3:
                    return undefined;
                case 4:
                    return fiveComment;
                case 5:
                    return sevenComment;
                case 6:
                    return tenComment;
            }
        }

        const wildEncounters = [cityEntries, forestEntries, mountainEntries, beachEntries, northEntries, southEntries].map((e: HTMLElement[], i: number) => fetchPokemonFromElements(e, gamemasterPokemon, wildDomain).map(f => { return {...f, kind: String(i)} as IEntry})).flat();
        const researches = fetchPokemonFromElements(Array.from(htmlDoc.getElementById('encounter-pokemon')?.querySelectorAll('[role=listitem]') ?? []).map(e => e as HTMLElement), gamemasterPokemon, wildDomain);
        const eggs = [twoKmEggs, fiveKmEggs, sevenKmEggs, tenKmEggs, fiveSyncKmEggs, sevenRoutesKmEggs, tenSyncKmEggs].map((e: HTMLElement[], i: number) => fetchPokemonFromElements(e, gamemasterPokemon, wildDomain).map(f => { return {...f, kind: convertKind(i), comment: getComment(i)} as IEntry})).flat();

        return {
            date: new Date(2025, 5, 3, 10, 0).valueOf(),
            dateEnd: new Date(2025, 8, 2, 10, 0).valueOf(),
            wild: wildEncounters,
            eggs: eggs,
            isSeason: true,
            researches: researches,
            bonuses: htmlDoc.getElementById("seasonal-bonuses")?.innerText.trim(),
            imgUrl: "https://lh3.googleusercontent.com/bdW6I4EwnAj-smzAMgEZpZ4npVCgyXOIGKnWAuZrO-zBmOQgLY73wjYnR-tOtiV3izqbPgKS69ZdibrHPESWh4ZeTftQIy4Iw6s=e365-pa-nu-w3456",
            title: 'Welcome to Pokémon GO: Delightful Days',
            comment: url ? decodeURIComponent(url.split(corsProxyUrl)[1]).split('seasons/')[1] : ''
        };
    }

    return {
        date: new Date(2025, 5, 3, 10, 0).valueOf(),
        dateEnd: new Date(2025, 8, 2, 10, 0).valueOf(),
        wild: [],
        eggs: [],
        isSeason: true,
        researches: [],
        bonuses: htmlDoc.getElementById("seasonal-bonuses")?.innerText.trim(),
        imgUrl: "https://lh3.googleusercontent.com/bdW6I4EwnAj-smzAMgEZpZ4npVCgyXOIGKnWAuZrO-zBmOQgLY73wjYnR-tOtiV3izqbPgKS69ZdibrHPESWh4ZeTftQIy4Iw6s=e365-pa-nu-w3456",
        title: 'Damos as boas-vindas ao Pokémon GO: Dias Deslumbrantes',
        comment: url ? decodeURIComponent(url.split(corsProxyUrl)[1]).split('seasons/')[1] : ''
    }
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
        let currP = ndfNormalized(pkmwithNoClothes[j].replace("*", "").replace(" Forme", "").trim()).replaceAll("(normal)", "").replaceAll(' cloak', '').trim();

        if (currP.toLocaleLowerCase().includes(' candy') || currP.toLocaleLowerCase().includes('dynamax')) {
            continue;
        }

        const raidLIndex = currP.indexOf(" raids");
        if (raidLIndex !== -1) {
            raidLevel = currP.substring(0, raidLIndex).replaceAll("one-star", "1").replaceAll("three-star", "3").replaceAll("four-star", "4").replaceAll("five-star", "5").replaceAll("six-star", "6").replaceAll("shadow", "Shadow");
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
        currP = words.join(" ").trim().replaceAll('palkida', 'palkia'); //typo in leekduck

        // Edge case for Darmanitan -> it has a form (Standard) on the id but not on the name...
        if (currP === "darmanitan") {
            if (isShadow) { //darmanitan_standard_shadow // darmanitan_standard
                if (!seen.has("darmanitan_standard_shadow")) {
                    seen.add("darmanitan_standard_shadow");

                    wildEncounters.push({
                        speciesId: "darmanitan_standard_shadow",
                        shiny: isShiny,
                        kind: raidLevel
                    });
                }
                continue;
            }

            if (!seen.has("darmanitan_standard")) {
                seen.add("darmanitan_standard");

                wildEncounters.push({
                    speciesId: "darmanitan_standard",
                    shiny: isShiny,
                    kind: raidLevel
                });
            }
            continue;
        }

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

            const formCandidate = currP.replaceAll('(', '').replaceAll(')', '').split(" ").filter(f => Array.from(knownForms).some(e => ndfNormalized(e) === f));
            if (formCandidate.length === 0) {

                if (currP.includes('giratina') && !currP.includes('altered') && !currP.includes('origin')) {
                    if (!seen.has('giratina_altered')) {
                        seen.add('giratina_altered');
                        
                        wildEncounters.push({
                            speciesId: 'giratina_altered',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

                // edge case -> Zacian (Hero) is commonly referred to as zacian only.
                if (currP.includes('zacian') && !currP.includes('sword') && !currP.includes('crowned')) {
                    if (!seen.has('zacian_hero')) {
                        seen.add('zacian_hero');
                        
                        wildEncounters.push({
                            speciesId: 'zacian_hero',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

                // edge case -> Zamazenta (Hero) is commonly referred to as zamazenta only.
                if (currP.includes('zamazenta') && !currP.includes('shield') && !currP.includes('crowned')) {
                    if (!seen.has('zamazenta_hero')) {
                        seen.add('zamazenta_hero');
                        
                        wildEncounters.push({
                            speciesId: 'zamazenta_hero',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

                if (currP.includes('morpeko') && !currP.includes('hangry')) {
                    if (!seen.has('morpeko_full_belly')) {
                        seen.add('morpeko_full_belly');
                        
                        wildEncounters.push({
                            speciesId: 'morpeko_full_belly',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

                if (currP.includes('pumpkaboo')) {
                    if (!seen.has('pumpkaboo_average')) {
                        seen.add('pumpkaboo_average');
                        
                        wildEncounters.push({
                            speciesId: 'pumpkaboo_average',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

                if (currP.includes('gourgeist')) {
                    if (!seen.has('gourgeist_average')) {
                        seen.add('gourgeist_average');
                        
                        wildEncounters.push({
                            speciesId: 'gourgeist_average',
                            shiny: isShiny,
                            kind: raidLevel
                        });
                    }

                    continue;
                }

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
            if (isMega) {
                console.log("Domain didn't cover Megas while computing " + currP);
            } else {
                console.error("Couldn't find form of " + currP);
            }
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
    "Standard"
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
    // castform fallbacks...
    const whitelist = ["(sunny)", "(rainy)", "(snowy)", "sunny form", "rainy form", "snowy form"]
    const blackListedKeywords = ["some trainers", "the following", "appearing", "lucky, you m", " tms", "and more", "wild encounters", "sunny", "event-themed", "rainy", "snow", "partly cloudy", "cloudy", "windy", "fog", "will be available"];
    const parsedPokemon = textes.filter(t => t !== "All" && t.split(" ").length <= 10 && (whitelist.some(k => t.toLocaleLowerCase().includes(k)) || !blackListedKeywords.some(k => t.toLocaleLowerCase().includes(k))));
    return fetchPokemonFromString(parsedPokemon, gamemasterPokemon, domain);
}

const toMonthIndex = (month: string) => ["January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"].indexOf(month);

const fetchDateFromString = (date: string) => {
    const trimmedDate = date.trim().replaceAll("  ", " ").replaceAll(/\u00A0/g, " ").replaceAll("  ", " ").replaceAll("a.m.", "am").replaceAll("A.M.", "am").replaceAll("p.m.", "pm").replaceAll("P.M.", "pm");
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
    const dateObj = new Date(year, toMonthIndex(components[0]), Number(components[1]), Number(timeComponent[0]) + Number(components[3].toLocaleLowerCase() === "pm" && Number(timeComponent[0]) !== 12 ? 12 : 0), Number(timeComponent[1]));

    return dateObj.valueOf();
}

const innerParseNews = (subtitle: string, date: string, innerEntries: Element[], gamemasterPokemon: Dictionary<IGamemasterPokemon>, raidDomain: IGamemasterPokemon[], wildDomain: IGamemasterPokemon[], postTitle: string, img: string, endResults: IPostEntry[], hasToComputeInnerEntries: boolean, url?: string, isPT = false) => {
    let startDate = 0;
    let endDate = 0;

    if (date === 'June 23 at 10:00 a.m. to June 27, 2025, at 8:00 p.m. local time') { //tmp
        startDate = 1750669200000;
        endDate = 1751050800000;
    } else if (date === 'Saturday, July 5, and Sunday, July 6, 2025 from 2:00 p.m. to 5:00 p.m. local time.') {
        innerParseNews(subtitle + '(1)', 'Saturday, July 5, 2025, from 2:00 p.m. to 5:00 p.m. local time', innerEntries, gamemasterPokemon, raidDomain, wildDomain, postTitle + '(1)', img, endResults, hasToComputeInnerEntries, url, isPT);
        innerParseNews(subtitle + '(2)', 'Saturday, July 6, 2025, from 2:00 p.m. to 5:00 p.m. local time', innerEntries, gamemasterPokemon, raidDomain, wildDomain, postTitle + '(2)', img, endResults, hasToComputeInnerEntries, url, isPT);
        return endResults;
    } else {
        if (date.endsWith(".")) {
            date = date.substring(0, date.length - 1);
        }

        if (!date) {
            return endResults;
        }
        
        if (!isPT && date.includes(" from ")) {
            if (!date.includes(" to ") /*|| !date.includes(" at ")*/) {
                return endResults;
            }
            const split = date.split(" to ");
            split[0] = split[0].replace(" from ", " at ");
            const idx = split[0].indexOf(" at ") + 4;
            split[1] = split[0].substring(0, idx) + split[1];
            date = split.join(" to ");
        }

        const parsedDate = date.split(" to ");
        if (!isPT && (parsedDate.length !== 2 || parsedDate[0].split(" ").length > 10 || parsedDate[1].split(" ").length > 10)) {
            return endResults;
        }

        if (!parsedDate[0].includes(', at') && parsedDate[0].includes(' at')) {
            parsedDate[0] = parsedDate[0].replace(' at', ', at');
        }

        const fixDateString = (dateString: string) => dateString.replace(/(\b[A-Za-z]+), (\d{1,2})/, "$1 $2");

        try {
            if (!isPT) {
                startDate = fetchDateFromString(fixDateString(parsedDate[0]));
                endDate = fetchDateFromString(fixDateString(parsedDate[1]));
            }
        } catch {
            return endResults;
        }
    }
    
    const raids: IEntry[] = [];
    const wild: IEntry[] = [];
    const eggs: IEntry[] = [];
    const research: IEntry[] = [];
    const incenses: IEntry[] = [];
    let bonus = "";

    for (let i = 0; i < innerEntries.length; i++) {
        const entry = innerEntries[i];
        const title = !hasToComputeInnerEntries ? entry.children[0].getElementsByClassName('ContainerBlock__headline')[0] : entry.children[0];
        const kind = (title as HTMLElement)?.innerText?.trim();
        const contentBodies = Array.from(!hasToComputeInnerEntries ? entry.children[0].children : entry.children) as HTMLElement[];
        if (kind.includes('Bonuses') || kind.includes('Bônus')) {
            const contentWithNewlines = contentBodies[1].innerHTML.trim().replace(/<br\s*\/?>/gi, '\n').trim();
                
                const tempElement = document.createElement('div');
                tempElement.innerHTML = contentWithNewlines;
                
                const plainText = tempElement.textContent || tempElement.innerText;
                
                bonus += "\n\n" + removeLeadingAndTrailingAsterisks(plainText);
                continue;
        }
        switch(kind) {
            case "Wild encounters":
            case "Wild Encounters":
            case "Event-themed Pokémon":
                wild.push(...fetchPokemonFromElements(contentBodies, gamemasterPokemon, wildDomain));
                break;
            case "Eggs":
                eggs.push(...fetchPokemonFromElements(contentBodies, gamemasterPokemon, wildDomain));
                break;
            case "Event bonus":
            case "Event Bonus":
            case "Event bonuses":
            case "Event Bonuses":
            case "Bônus do evento":
            case "Bonuses":
                const contentWithNewlines = contentBodies[1].innerHTML.trim().replace(/<br\s*\/?>/gi, '\n').trim();
                
                const tempElement = document.createElement('div');
                tempElement.innerHTML = contentWithNewlines;
                
                const plainText = tempElement.textContent || tempElement.innerText;
                
                bonus += "\n\n" + removeLeadingAndTrailingAsterisks(plainText);
                break;
            case "Field Research Task Rewards":
            case "Field Research Task Encounters":
            case "Field Research task encounters":
            case "Field Research task rewards":
            case "Field Research":
            case "Timed Research":
                research.push(...fetchPokemonFromElements(contentBodies, gamemasterPokemon, wildDomain));
                break;
            //TODO Increased Incense encounters
            case "Raids":
            case "Shadow Raids":
            case "Shadow Raid debut":
                const result = fetchPokemonFromElements(contentBodies, gamemasterPokemon, raidDomain)
                //.filter(r => !r.kind?.includes("5") && !r.kind?.toLocaleLowerCase().includes("mega"));
                
                raids.push(...result);
                break;
            case "Incense Encounters":
            case "Increased Incense encounters":
                const incenseResult = fetchPokemonFromElements(contentBodies, gamemasterPokemon, raidDomain);
                incenses.push(...incenseResult);
                break;
            default:
                break;
        }
    }
            
    endResults.push({
        title: postTitle,
        subtitle: subtitle,
        date: startDate,
        dateEnd: endDate,
        researches: research,
        imgUrl: img,
        eggs: eggs,
        raids: raids,
        incenses: incenses,
        wild: wild,
        bonuses: bonus.trim(),
        rawUrl: url,
        comment: url ? decodeURIComponent(url.split(corsProxyUrl)[1]).split('post/')[1] : '',
        isRelevant: !!(!isPT && url && (postTitle || subtitle) && startDate && endDate && new Date(endDate) > new Date() && img && (research.length > 0 || eggs.length > 0 || raids.length > 0 || wild.length > 0 || bonus.trim()))
    });

    return endResults;
}

const removeLeadingAndTrailingAsterisks = (plainText: string) => {
    if (plainText.startsWith('*')) {
        plainText = plainText.substring(1);
    }

    if (plainText.endsWith('*')) {
        plainText = plainText.substring(0, plainText.length - 1);
    }

    return plainText;
}

export const mapPosts: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any) => IPostEntry[] = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any) => {
    const url: string = request.responseURL;

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("blogPost__post__blocks")[0]?.children ?? []/*.getElementsByClassName("ContainerBlock")*/);
    let hasToComputeInnerEntries = true;

    if (!htmlDoc.querySelector('.blogPost__post__blocks>.block.block--ContainerBlock>.ContainerBlock>.ContainerBlock__blocks>.block.block--ContainerBlock>.ContainerBlock>.ContainerBlock__headline')) {
        // This is not the enclosed format.
        hasToComputeInnerEntries = false;
    }
    
    const postTitle = (htmlDoc.getElementsByClassName("blogPost__title")[0] as HTMLElement)?.innerText;
    const img = (htmlDoc.getElementsByClassName("blogPost__post")[0]?.getElementsByClassName("image")[0]?.getElementsByTagName("img")[0] as HTMLImageElement)?.src;

    const wildDomain = Object.values(gamemasterPokemon)
    .filter(p => !p.isShadow && !p.isMega && !p.aliasId);

    const raidDomain = Object.values(gamemasterPokemon)
    .filter(p => !p.isShadow && !p.isMega && !p.aliasId);

    const endResults: IPostEntry[] = [];

    if (!hasToComputeInnerEntries) {
        if (entries.length === 0) {
            return [];
        }

        const subtitle = (entries[0].getElementsByClassName("ContainerBlock__headline")[0] as HTMLElement)?.innerText.trim();
        
        const date = (entries[0].getElementsByClassName("ContainerBlock__body")[0] as HTMLElement)?.innerText?.trim().split("\n")[0].trim();

        return innerParseNews(subtitle, date, entries, gamemasterPokemon, raidDomain, wildDomain, postTitle, img, endResults, hasToComputeInnerEntries, url);
    }

    for (let k = 0; k < entries.length; k++) {
        const containerBlock = entries[k].children[0];

        const innerEntries = containerBlock.getElementsByClassName("ContainerBlock");
        if (innerEntries.length === 0) {
            continue;
        }

        const subtitle = (containerBlock.getElementsByClassName("ContainerBlock__headline")[0] as HTMLElement)?.innerText.trim();

        const date = (containerBlock.children[1] as HTMLElement)?.innerText?.trim().split("\n")[0].trim();

        innerParseNews(subtitle, date, Array.from(innerEntries), gamemasterPokemon, raidDomain, wildDomain, postTitle, img, endResults, hasToComputeInnerEntries, url);
    }

    return endResults;
}

export const mapPostsPT: (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any) => IPostEntry[] = (data: any, gamemasterPokemon: Dictionary<IGamemasterPokemon>, request: any) => {
    const url = request.responseURL;
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(data, 'text/html');
    const entries = Array.from(htmlDoc.getElementsByClassName("blogPost__post__blocks")[0]?.children ?? []/*.getElementsByClassName("ContainerBlock")*/);
    let hasToComputeInnerEntries = true;

    if (!htmlDoc.querySelector('.blogPost__post__blocks>.block.block--ContainerBlock>.ContainerBlock>.ContainerBlock__blocks>.block.block--ContainerBlock>.ContainerBlock>.ContainerBlock__headline')) {
        // This is not the enclosed format.
        hasToComputeInnerEntries = false;
    }
    
    const postTitle = (htmlDoc.getElementsByClassName("blogPost__title")[0] as HTMLElement)?.innerText;
    const img = (htmlDoc.getElementsByClassName("blogPost__post")[0]?.getElementsByClassName("image")[0]?.getElementsByTagName("img")[0] as HTMLImageElement)?.src;

    const wildDomain = Object.values(gamemasterPokemon)
    .filter(p => !p.isShadow && !p.isMega && !p.aliasId);

    const raidDomain = Object.values(gamemasterPokemon)
    .filter(p => !p.isShadow && !p.isMega && !p.aliasId);

    const endResults: IPostEntry[] = [];

    if (!hasToComputeInnerEntries) {
        if (entries.length === 0) {
            return [];
        }

        const subtitle = (entries[0].getElementsByClassName("ContainerBlock__headline")[0] as HTMLElement)?.innerText.trim();
        
        const date = (entries[0].getElementsByClassName("ContainerBlock__body")[0] as HTMLElement)?.innerText?.trim().split("\n")[0].trim();

        return innerParseNews(subtitle, date, entries, gamemasterPokemon, raidDomain, wildDomain, postTitle, img, endResults, hasToComputeInnerEntries, url, true);
    }

    for (let k = 0; k < entries.length; k++) {
        const containerBlock = entries[k].children[0];

        const innerEntries = containerBlock.getElementsByClassName("ContainerBlock");
        if (innerEntries.length === 0) {
            continue;
        }

        const subtitle = (containerBlock.getElementsByClassName("ContainerBlock__headline")[0] as HTMLElement)?.innerText.trim();

        const date = (containerBlock.children[1] as HTMLElement)?.innerText?.trim().split("\n")[0].trim();

        innerParseNews(subtitle, date, Array.from(innerEntries), gamemasterPokemon, raidDomain, wildDomain, postTitle, img, endResults, hasToComputeInnerEntries, url, true);
    }

    return endResults;
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
        .filter(entry => !entry.data.templateId.startsWith('VN_BM_') && (entry.data?.moveSettings || entry.data.combatMove))
        .forEach(entry => {
            const isPvP = !!entry.data.combatMove;
            const dataPointer = entry.data.moveSettings || entry.data.combatMove;
            const helperConst = "_MOVE_";
            const helperIdx = entry.data.templateId.indexOf(helperConst);
            const moveIdPointer = entry.data.templateId.substring(helperIdx + helperConst.length);
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

    if (!movesDictionary['UPPER_HAND']) {
        movesDictionary['UPPER_HAND'] = {
            moveId: 'UPPER_HAND',
            vId: '-1',
            type: 'fighting',
            isFast: false,
            pvpPower: 70,
            pvePower: 50,
            pvpEnergyDelta: -40,
            pveEnergyDelta: -33,
            pvpDuration: 500,
            pveDuration: 2.0,
            pvpBuffs: {
                chance: 0.3,
                buffs: [{
                    buff: 'targetDefenseStatStageChange',
                    quantity: -1
                }],
            }
        }
    }

    if (!movesDictionary['CLANGING_SCALES']) {
        movesDictionary['CLANGING_SCALES'] = {
            moveId: 'CLANGING_SCALES',
            vId: '-1',
            type: 'dragon',
            isFast: false,
            pvpPower: 120,
            pvePower: 120,
            pvpEnergyDelta: -45,
            pveEnergyDelta: -100,
            pvpDuration: 500,
            pveDuration: 3.3,
            pvpBuffs: {
                chance: 1,
                buffs: [{
                    buff: 'attackerDefenseStatStageChange',
                    quantity: -1
                }],
            }
        }
    }
    
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