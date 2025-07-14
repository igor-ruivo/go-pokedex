import Dictionary from "./Dictionary";
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