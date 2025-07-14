import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import Dictionary from "./Dictionary";
import { pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl, rankChangesCacheTtlInMillis } from "./Configs";
import { readEntry, writeEntry } from "./resource-cache";

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
}*/

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