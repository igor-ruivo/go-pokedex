import { IGameMasterMove } from "../DTOs/IGameMasterMove";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { ITranslatedMove } from "../DTOs/ITranslatedMove";
import { PokemonForms } from "../DTOs/PokemonForms";
import { DPSEntry } from "../contexts/raid-ranker-context";
import Dictionary from "./Dictionary";

/**
 * Computes the effective damage of a move, assuming the target pokemon has 200 defense with 15 defense IV.
 * @param baseAtk - The attacker pokémon's base attack.
 * @param moveDamage - The raw move damage.
 * @param stab - A boolean field indicating whether the move has STAB bonus for the pokémon or not.
 * @param effectiveness - The effectiveness scalar used. Depends on the target.
 * @returns 
 */

export enum Effectiveness {
    DoubleResistance = 0.390625,
    Resistance = 0.625,
    Normal = 1,
    Effective = 1.6,
    DoubleEffective = 2.56
}

const isNormalPokemonAndHasShadowVersion = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    if (pokemon.isShadow) {
        return false;
    }
    
    return Object.values(gamemasterPokemon)
        .some(p => p.speciesId !== pokemon.speciesId && !p.aliasId && p.dex === pokemon.dex && p.isShadow && p.types.length === pokemon.types.length && p.types.every(t => pokemon.types.includes(t)));
}

const normalizedMoveName = (moveName: string) => moveName
    .split("_")
    .map(p => p.substring(0, 1).toLocaleUpperCase() + p.substring(1).toLocaleLowerCase())
    .join(" ");

export const translateMoveFromMoveId = (moveId: string, moves: Dictionary<IGameMasterMove>, gameTranslation: Dictionary<ITranslatedMove>) => {
    const typedMove = moves[moveId];
    if (!typedMove) {
        console.error("Couldn't find PokemonCounters " + moveId);
        return moveId ?? "";
    }
    const vid = typedMove.vId;
    return gameTranslation[vid]?.name ?? normalizedMoveName(typedMove.moveId);
}

export const shortName = (name: string) => {
    return name
        .replace("(Alolan)", "(A)")
        .replace("(Galarian)", "(G)")
        .replace("(Paldean)", "(P)")
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

export const getForm = (name: string) => {
    name = name.replaceAll("(Shadow)", "");
    name = name.replaceAll("Shadow", "");
    
    if (name.length - 1 > name.replaceAll("(", "").length) {
        console.error(`Multiple forms for ${name} detected.`);
    }

    const firstParenthesisIdx = name.indexOf("(");
    if (firstParenthesisIdx === -1) {
        return "";
    }

    const form = name.substring(firstParenthesisIdx + 1, name.indexOf(")"));
    if (form) {
        console.log(form);
    }
    return form;
} 

const accumulatedStardustCosts = [0, 200, 400, 600, 800, 1200, 1600, 2000, 2400, 3000, 3600, 4200, 4800, 5600, 6400, 7200, 8000, 9000, 10000, 11000, 12000, 13300, 14600, 15900, 17200, 18800, 20400, 22000, 23600, 25500, 27400, 29300, 31200, 33400, 35600, 37800, 40000, 42500, 45000, 47500, 50000, 53000, 56000, 59000, 62000, 65500, 69000, 72500, 76000, 80000, 84000, 88000, 92000, 96500, 101000, 105500, 110000, 115000, 120000, 125000, 130000, 136000, 142000, 146000, 154000, 161000, 168000, 175000, 182000, 190000, 198000, 206000, 214000, 223000, 232000, 241000, 250000, 260000, 270000, 280000, 290000, 301000, 312000, 323000, 334000, 346000, 358000, 370000, 382000, 395000, 408000, 421000, 434000, 448000, 462000, 476000, 490000, 505000, 520000, 520000, 520000];
const accumulatedCandyCosts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 60, 69, 72, 75, 78, 81, 84, 87, 90, 94, 98, 102, 106, 110, 114, 118, 122, 126, 130, 136, 142, 148, 154, 162, 170, 178, 186, 196, 206, 216, 226, 238, 250, 262, 274, 289, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304];
const shadowAccumulatedCandyCosts = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76, 79, 82, 85, 88, 91, 94, 97, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 198, 206, 214, 222, 232, 242, 252, 262, 274, 286, 298, 310, 325, 340, 355, 370, 388, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406];
const accumulatedXLCandyCosts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 40, 52, 64, 76, 88, 103, 118, 133, 148, 165, 182, 199, 216, 236, 256, 276, 296, 296, 296];
const shadowAccumulatedXLCandyCosts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 24, 36, 48, 63, 78, 93, 108, 126, 144, 162, 180, 201, 222, 243, 264, 288, 312, 336, 360, 360, 360];

type NeededResources = {
    stardust: number,
    candies: number,
    candiesXL: number
}

export const levelToLevelIndex = (level: number) => (level - 1) * 2;

export const needsXLCandy = (pokemon: IGamemasterPokemon, cpThreshold: number) => {
    if (!cpThreshold) {
        return false;
    }

    const cp = calculateCP(pokemon.atk, 15, pokemon.def, 15, pokemon.hp, 15, levelToLevelIndex(41));
    return cp < cpThreshold + 150;
}

export const computeNeededResources: (currentLevel: number, targetLevel: number, isShadow: boolean) => NeededResources = (currentLevel: number, targetLevel: number, isShadow: boolean) => {
    const neededStardust = (accumulatedStardustCosts[levelToLevelIndex(targetLevel)] - accumulatedStardustCosts[levelToLevelIndex(currentLevel)]) * (isShadow ? 1.2 : 1);
    const neededCandies = isShadow ? (shadowAccumulatedCandyCosts[levelToLevelIndex(targetLevel)] - shadowAccumulatedCandyCosts[levelToLevelIndex(currentLevel)]) : (accumulatedCandyCosts[levelToLevelIndex(targetLevel)] - accumulatedCandyCosts[levelToLevelIndex(currentLevel)]);
    const neededXLCandies = isShadow ? (shadowAccumulatedXLCandyCosts[levelToLevelIndex(targetLevel)] - shadowAccumulatedXLCandyCosts[levelToLevelIndex(currentLevel)]) : (accumulatedXLCandyCosts[levelToLevelIndex(targetLevel)] - accumulatedXLCandyCosts[levelToLevelIndex(currentLevel)]);

    return {
        stardust: neededStardust,
        candies: neededCandies,
        candiesXL: neededXLCandies
    }
}

export const getAllFastMoves = (p: IGamemasterPokemon, moves: Dictionary<IGameMasterMove>) => {
    return Array.from(
        new Set(
            p.fastMoves
            .concat(p.eliteMoves.filter(m => moves[m].isFast))
            .concat(p.legacyMoves.filter(m => moves[m].isFast))
        )
    );
}

export const getAllChargedMoves = (p: IGamemasterPokemon, moves: Dictionary<IGameMasterMove>, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const moveSet = new Set(
        p.chargedMoves
        .concat(p.eliteMoves.filter(m => !moves[m].isFast))
        .concat(p.legacyMoves.filter(m => !moves[m].isFast))
    );

    if (p.isShadow) {
        moveSet.add("FRUSTRATION");
    }

    if (isNormalPokemonAndHasShadowVersion(p, gamemasterPokemon)) {
        moveSet.add("RETURN");
    }

    return Array.from(new Set(moveSet));
}

export const computeMoveEffectiveness = (ownMoveType: string, targetType1: string, targetType2?: string) => {
    const matrix: Dictionary<number[]> = {};
    matrix["normal"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.DoubleResistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["fighting"] = [
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.DoubleResistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance
    ];

    matrix["flying"] = [
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["poison"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.DoubleResistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective
    ];

    matrix["ground"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.DoubleResistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["rock"] = [
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["bug"] = [
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance
    ];

    matrix["ghost"] = [
        Effectiveness.DoubleResistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal
    ];

    matrix["steel"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective
    ];

    matrix["fire"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["water"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["grass"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["electric"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.DoubleResistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["psychic"] = [
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.DoubleResistance,
        Effectiveness.Normal
    ];

    matrix["ice"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal
    ];

    matrix["dragon"] = [
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.DoubleResistance
    ];

    matrix["dark"] = [
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance
    ];

    matrix["fairy"] = [
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Resistance,
        Effectiveness.Resistance,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Normal,
        Effectiveness.Effective,
        Effectiveness.Effective,
        Effectiveness.Normal
    ];
    
    const targetType1Index = Object.keys(matrix).indexOf(targetType1);
    const targetType2Index = targetType2 ? Object.keys(matrix).indexOf(targetType2) : -1;

    return matrix[ownMoveType][targetType1Index] * (targetType2 ? matrix[ownMoveType][targetType2Index] : 1);
}

export const computeDPSEntry = (p: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>, moves: Dictionary<IGameMasterMove>, attackIV = 15, level = 100, forcedType = "", target?: IGamemasterPokemon, movesetOverride?: [string, string]): DPSEntry => {
    const computeDamageCalculation = (moveId: string) => calculateDamage(p.atk, moves[moveId].pvePower, p.types.map(t => t.toString().toLocaleLowerCase()).includes(moves[moveId].type.toLocaleLowerCase()), p.isShadow, target ? target.isShadow : false, target ? computeMoveEffectiveness(moves[moveId].type, target.types[0].toString().toLocaleLowerCase(), target.types[1]?.toString().toLocaleLowerCase()) : (forcedType && forcedType !== "normal" && moves[moveId].type === forcedType) ? Effectiveness.Effective : Effectiveness.Normal, attackIV, level, target ? target.def : 200);
    const computePveDPS = (chargedMoveDmg: number, fastMoveDmg: number, fastMoveId: string, chargedMoveId: string) => pveDPS(chargedMoveDmg, fastMoveDmg, moves[fastMoveId].pveDuration, moves[chargedMoveId].pveEnergyDelta * -1, moves[fastMoveId].pveEnergyDelta, moves[chargedMoveId].pveDuration);
    
    if (movesetOverride) {
        const fastMoveDmg = computeDamageCalculation(movesetOverride[0]);
        const chargedMoveDmg = computeDamageCalculation(movesetOverride[1]);
        const dps = computePveDPS(chargedMoveDmg, fastMoveDmg, movesetOverride[0], movesetOverride[1]);
        return {
            fastMove: movesetOverride[0],
            chargedMove: movesetOverride[1],
            dps: dps,
            speciesId: p.speciesId,
            fastMoveDmg: fastMoveDmg,
            chargedMoveDmg: chargedMoveDmg
        };
    }

    const fastMoves = getAllFastMoves(p, moves);
    const chargedMoves = getAllChargedMoves(p, moves, gamemasterPokemon);
    let higherDPS = Number.MIN_VALUE;
    let higherFast = "";
    let higherFastDmg = 0;
    let higherCharged = "";
    let higherChargedDmg = 0;
    for(let i = 0; i < fastMoves.length; i++) {
        for(let j = 0; j < chargedMoves.length; j++) {
            const fastMove = moves[fastMoves[i]];
            const chargedMove = moves[chargedMoves[j]];
            if (forcedType && chargedMove.type !== forcedType) {
                continue;
            }
            const fastMoveDmg = computeDamageCalculation(fastMoves[i]);
            const chargedMoveDmg = computeDamageCalculation(chargedMoves[j]);
            const dps = computePveDPS(chargedMoveDmg, fastMoveDmg, fastMoves[i], chargedMoves[j]);
            if (dps > higherDPS) {
                higherDPS = dps;
                higherFast = fastMove.moveId;
                higherFastDmg = fastMoveDmg;
                higherCharged = chargedMove.moveId;
                higherChargedDmg = chargedMoveDmg;
            }
        }
    }
    return {
        fastMove: higherFast,
        chargedMove: higherCharged,
        dps: higherDPS,
        speciesId: p.speciesId,
        fastMoveDmg: higherFastDmg,
        chargedMoveDmg: higherChargedDmg
    };
}

export const calculateDamage = (baseAtk: number, moveDamage: number, stab: boolean, selfShadow: boolean, targetShadow = false, effectiveness: Effectiveness = Effectiveness.Effective, attackIV = 15, level = 100, targetDef = 200) => {
    return Math.floor(0.5 * moveDamage * (((baseAtk + attackIV) * cpm[level] * (selfShadow ? 1.2 : 1)) / ((targetDef + 15) * cpm[78] * (targetShadow ? 0.8333333 : 1))) * (stab ? 1.2 : 1) * effectiveness) + 1;
}

export const pveDPS = (chargedMoveDamage: number, fastMoveDamage: number, fastMoveCooldown: number, chargedMoveRequiredEnergy: number, fastMoveEnergy: number, chargedMoveAnimationDuration: number) => {
    const fastMoveDPS = fastMoveDamage / fastMoveCooldown;

    if (fastMoveEnergy === 0 && chargedMoveRequiredEnergy !== 0) {
        return fastMoveDPS;
    }

    const secondsNeededToLoadChargedMove = chargedMoveRequiredEnergy === 0 ? 0 : chargedMoveRequiredEnergy / fastMoveEnergy * fastMoveCooldown;

    const chargedMoveUsageDPS = (chargedMoveDamage + fastMoveDPS * secondsNeededToLoadChargedMove) / (secondsNeededToLoadChargedMove + chargedMoveAnimationDuration);
    
    return Math.max(chargedMoveUsageDPS, fastMoveDPS);
}

const isNonShadowVersion = (p: IGamemasterPokemon, original: IGamemasterPokemon) => original.isShadow && !p.isShadow && p.speciesId !== original.speciesId && p.dex === original.dex && !p.isMega && p.types.length === original.types.length && p.types.every(t => original.types.includes(t));   

export const fetchReachablePokemonIncludingSelf = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>, domainFilter?: (p: IGamemasterPokemon) => boolean) => {
    const reachablePokemons = new Set<IGamemasterPokemon>();

    const nonShadowReplica = !pokemon.isShadow || pokemon.isMega ? [] : Object.values(gamemasterPokemon)
        .filter(r => !r.aliasId && isNonShadowVersion(r, pokemon) && (!domainFilter || domainFilter(r)));
    
    const queue = [pokemon, ...nonShadowReplica];

    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;

        if (reachablePokemons.has(currentPokemon)) {
            continue;
        }

        reachablePokemons.add(currentPokemon);
        if (!currentPokemon.evolutions || currentPokemon.evolutions.length === 0) {
            continue;
        }
        queue.push(...currentPokemon.evolutions.map(id => gamemasterPokemon[id]).filter(pk => pk && pk.isShadow === currentPokemon.isShadow && (!domainFilter || domainFilter(pk))) as IGamemasterPokemon[]);
    }

    return reachablePokemons;
}

const sortPokemonByBattlePower = (a: IGamemasterPokemon, b: IGamemasterPokemon, asc: boolean) => {
    const sortScalar = asc ? -1 : 1;

    if (b.atk * b.def * b.hp > a.atk * a.def * a.hp) {
        return 1 * sortScalar;
    }

    if (b.atk * b.def * b.hp < a.atk * a.def * a.hp) {
        return -1 * sortScalar;
    }

    if (b.speciesId < a.speciesId) {
        return 1 * sortScalar;
    }

    return -1 * sortScalar;

}

export const sortPokemonByBattlePowerDesc = (a: IGamemasterPokemon, b: IGamemasterPokemon) => {
    return sortPokemonByBattlePower(a, b, false);
}

export const sortPokemonByBattlePowerAsc = (a: IGamemasterPokemon, b: IGamemasterPokemon) => {
    return sortPokemonByBattlePower(a, b, true);
}

export const fetchPredecessorPokemonIncludingSelf = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>, domainFilter?: (p: IGamemasterPokemon) => boolean) => {
    const predecessorPokemons = new Set<IGamemasterPokemon>();
    const queue = [pokemon];

    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;

        if (predecessorPokemons.has(currentPokemon)) {
            continue;
        }

        predecessorPokemons.add(currentPokemon);
        
        if (!currentPokemon.parent) {
            continue;
        }

        const parentRef = gamemasterPokemon[currentPokemon.parent];
        if (!parentRef || parentRef.isShadow !== pokemon.isShadow || (domainFilter && !domainFilter(parentRef))) {
            continue;
        }

        queue.push(parentRef);
    }

    return predecessorPokemons;
}

export const fetchPokemonFamily = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>, domainFilter?: (p: IGamemasterPokemon) => boolean, pokemonByDex?: Dictionary<IGamemasterPokemon[]>, pokemonByFamilyId?: Dictionary<IGamemasterPokemon[]>) => {
    const queue = [pokemon];
    const family = new Set<IGamemasterPokemon>();

    while (queue.length > 0) {
        let currentPokemon = queue.shift() as IGamemasterPokemon;

        if (family.has(currentPokemon)) {
            continue;
        }

        family.add(currentPokemon);

        const sameDex = pokemonByDex ? pokemonByDex[currentPokemon.dex].filter(p => (!domainFilter || domainFilter(p))) : Object.values(gamemasterPokemon).filter(p => (!domainFilter || domainFilter(p)) && p.dex === currentPokemon.dex && p.isShadow === currentPokemon.isShadow && !p.aliasId);
        const sameFamily = currentPokemon.familyId ? pokemonByFamilyId ? pokemonByFamilyId[currentPokemon.familyId].filter(p => (!domainFilter || domainFilter(p))) : Object.values(gamemasterPokemon).filter(p => (!domainFilter || domainFilter(p)) && p.familyId === currentPokemon.familyId && p.isShadow === currentPokemon.isShadow && !p.aliasId) : [];
        const predecessorPokemons = fetchPredecessorPokemonIncludingSelf(currentPokemon, gamemasterPokemon, domainFilter);
        const reachablePokemons = Array.from(fetchReachablePokemonIncludingSelf(currentPokemon, gamemasterPokemon, domainFilter)).filter(k => k.isShadow === currentPokemon.isShadow);

        const newBatch = new Set([
            ...sameDex,
            ...sameFamily,
            ...predecessorPokemons,
            ...reachablePokemons
        ].filter(p => !family.has(p)));

        queue.push(...newBatch);
    }

    return family;
}

export const calculateCP = (baseAtk: number, atkIV: number, baseDef: number, defIV: number, baseHP: number, hpIV: number, level: number) => Math.max(10, Math.floor((baseAtk + atkIV) * Math.sqrt(baseDef + defIV) * Math.sqrt(baseHP + hpIV) * cpm[level] * cpm[level] / 10));

export const calculateHP = (baseHP: number, hpIV: number, level: number) => Math.max(10, Math.floor((baseHP + hpIV) * cpm[level]));

export const cpm = [0.0939999967813491, 0.135137430784308, 0.166397869586944, 0.192650914456886, 0.215732470154762, 0.236572655026622, 0.255720049142837, 0.273530381100769, 0.290249884128570, 0.306057381335773, 0.321087598800659, 0.335445032295077, 0.349212676286697, 0.362457748778790, 0.375235587358474, 0.387592411085168, 0.399567276239395, 0.411193549517250, 0.422500014305114, 0.432926413410414, 0.443107545375824, 0.453059953871985, 0.462798386812210, 0.472336077786704, 0.481684952974319, 0.490855810259008, 0.499858438968658, 0.508701756943992, 0.517393946647644, 0.525942508771329, 0.534354329109191, 0.542635762230353, 0.550792694091796, 0.558830599438087, 0.566754519939422, 0.574569148039264, 0.582278907299041, 0.589887911977272, 0.597400009632110, 0.604823657502073, 0.612157285213470, 0.619404110566050, 0.626567125320434, 0.633649181622743, 0.640652954578399, 0.647580963301656, 0.654435634613037, 0.661219263506722, 0.667934000492096, 0.674581899290818, 0.681164920330047, 0.687684905887771, 0.694143652915954, 0.700542893277978, 0.706884205341339, 0.713169102333341, 0.719399094581604, 0.725575616972598, 0.731700003147125, 0.734741011137376, 0.737769484519958, 0.740785574597326, 0.743789434432983, 0.746781208702482, 0.749761044979095, 0.752729105305821, 0.755685508251190, 0.758630366519684, 0.761563837528228, 0.764486065255226, 0.767397165298461, 0.770297273971590, 0.773186504840850, 0.776064945942412, 0.778932750225067, 0.781790064808426, 0.784636974334716, 0.787473583646825, 0.790300011634826, 0.792803950958807, 0.795300006866455, 0.797803921486970, 0.800300002098083, 0.802803892322847, 0.805299997329711, 0.807803863460723, 0.810299992561340, 0.812803834895026, 0.815299987792968, 0.817803806620319, 0.820299983024597, 0.822803778631297, 0.825299978256225, 0.827803750922782, 0.830299973487854, 0.832803753381377, 0.835300028324127, 0.837803755931569, 0.840300023555755, 0.842803729034748, 0.845300018787384, 0.847803702398935, 0.850300014019012, 0.852803676019539, 0.855300009250640, 0.857803649892077, 0.860300004482269, 0.862803624012168, 0.865299999713897];

export const computeBestIVs = (baseatk: number, basedef: number, basesta: number, league: number) => {
    const floor = 0;
    let minLvl = 1;
    let maxLvl = 51;

    const ranks: Dictionary<any> = {};

    const maxAtk = {
        value: 0,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    const maxDef = {
        value: 0,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    const maxHP = {
        value: 0,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    const minAtk = {
        value: 1000,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    const minDef = {
        value: 1000,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    const minHP = {
        value: 1000,
        aIV: 0,
        dIV: 0,
        sIV: 0,
        sp: 0
    };
    let minRankLvl = 100;
    let maxRankLvl = 0;
    let numRanks = 0;
    /* account for half-level CPMs (40-1)*2=78 */
    minLvl = Math.max(0, (minLvl - 1) * 2);
    /* use half-levels */
    maxLvl = Math.max(0, (maxLvl - 1) * 2);
    /* use half-levels */
    for (let atk = floor / 1; atk <= 15; atk++) {
        for (let def = floor / 1; def <= 15; def++) {
            for (let sta = floor / 1; sta <= 15; sta++) {
                for (let level = maxLvl; level >= minLvl; level--) {
                    const cp = calculateCP(baseatk, atk, basedef, def, basesta, sta, level);
                    if ((league) && (cp > league)) {
                        continue;
                    }
                    /* Update maxLvl on first loop (0/0/0 or floor/floor/floor) to optimize performance */
                    if (atk === floor / 1 && def === floor / 1 && sta === floor / 1) {
                        maxLvl = level;
                    }
                    const aSt = (baseatk + atk) * cpm[level];
                    const dSt = (basedef + def) * cpm[level];
                    const sSt = calculateHP(basesta, sta, level);
                    const statProd = Math.round(aSt * dSt * sSt);
                    /* update maxStats if necessary */
                    if ((maxAtk.value < aSt) || ((maxAtk.sp < statProd) && (maxAtk.value <= aSt))) {
                        maxAtk.value = aSt;
                        maxAtk.aIV = atk;
                        maxAtk.dIV = def;
                        maxAtk.sIV = sta;
                        maxAtk.sp = statProd;
                    }
                    if ((maxDef.value < dSt) || ((maxDef.sp < statProd) && (maxDef.value <= dSt))) {
                        maxDef.value = dSt;
                        maxDef.aIV = atk;
                        maxDef.dIV = def;
                        maxDef.sIV = sta;
                        maxDef.sp = statProd;
                    }
                    if ((maxHP.value < sSt) || ((maxHP.sp < statProd) && (maxHP.value <= sSt))) {
                        maxHP.value = sSt;
                        maxHP.aIV = atk;
                        maxHP.dIV = def;
                        maxHP.sIV = sta;
                        maxHP.sp = statProd;
                    }
                    if (level / 1 > maxRankLvl / 1) {
                        maxRankLvl = level;
                    }
                    /* update minStats if necessary */
                    if ((minAtk.value > aSt) || ((minAtk.sp < statProd) && (minAtk.value >= aSt))) {
                        minAtk.value = aSt;
                        minAtk.aIV = atk;
                        minAtk.dIV = def;
                        minAtk.sIV = sta;
                        minAtk.sp = statProd;
                    }
                    if ((minDef.value > dSt) || ((minDef.sp < statProd) && (minDef.value >= dSt))) {
                        minDef.value = dSt;
                        minDef.aIV = atk;
                        minDef.dIV = def;
                        minDef.sIV = sta;
                        minDef.sp = statProd;
                    }
                    if ((minHP.value > sSt) || ((minHP.sp < statProd) && (minHP.value >= sSt))) {
                        minHP.value = sSt;
                        minHP.aIV = atk;
                        minHP.dIV = def;
                        minHP.sIV = sta;
                        minHP.sp = statProd;
                    }
                    if (level / 1 < minRankLvl / 1) {
                        minRankLvl = level;
                    }

                    var IVsum = atk / 1 + def / 1 + sta / 1;

    		        var star = 0;
			        if (IVsum < 23) {
                        star = 0;
                    } else if (IVsum < 30) {
                        star = 1;
                    } else if (IVsum < 37) {
                        star = 2;
                    } else if (IVsum < 45) {
                        star = 3;
                    } else {
                        star = 4;
                    }

                    level = level / 2 + 1;
                    /* store as arrays to prevent hash collisions from dropping entires */
                    /* Tie Breaking Order: 1)StatProd -> 2)AtkStat -> 3)HPval -> 4)finalCP -> 5)StaIV -> 6)ERROR */
                    const newIndex = statProd + "." + Math.round(100000 * aSt);
                    if (!(newIndex in ranks)) {
                        ranks[newIndex] = [{
                            "IVs": {
                                "A": atk,
                                "D": def,
                                "S": sta,
                                "star": star
                            },
                            "battle": {
                                "A": aSt,
                                "D": dSt,
                                "S": sSt
                            },
                            "L": level,
                            "CP": cp
                        }];
                    } else {
                        let i;
                        const ranksLen = ranks[newIndex].length;
                        for (i = 0; i < ranksLen; i++) {
                            if (sSt > ranks[newIndex][i].battle.S) {
                                break;
                            } else if (sSt === ranks[newIndex][i].battle.S) {
                                if (cp > ranks[newIndex][i].CP) {
                                    break;
                                } else if (cp === ranks[newIndex][i].CP) {
                                    if (sta > ranks[newIndex][i].IVs.S) {
                                        /*console.log("Used 5th tie breaker (Stamina IV) for newIndex("+newIndex+"):"+JSON.stringify(ranks[newIndex]));*/
                                        break;
                                    } else if (sta === ranks[newIndex][i].IVs.S) {
                                        console.log("Need 6th tie breaker for newIndex(" + newIndex + "):" + JSON.stringify(ranks[newIndex]));
                                    }
                                }
                            }
                        }
                        ranks[newIndex].splice(i, 0, {
                            "IVs": {
                                "A": atk,
                                "D": def,
                                "S": sta,
                                "star": star
                            },
                            "battle": {
                                "A": aSt,
                                "D": dSt,
                                "S": sSt
                            },
                            "L": level,
                            "CP": cp
                        });
                    }
                    numRanks = numRanks + 1;
                    break;
                    /* stop evaluating this IV combination */
                }
            }
        }
    }

    /* sort by statProd+CP before returning */
    const sorted: Dictionary<any> = {};
    Object.keys(ranks).sort(function(a: any, b: any) {
        return b - a;
    }).forEach(function(key) {
        sorted[key] = ranks[key];
    });
    return sorted;
}