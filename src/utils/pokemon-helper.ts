import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import Dictionary from "./Dictionary";

export const fetchReachablePokemonIncludingSelf = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    const reachablePokemons = new Set<IGamemasterPokemon>();
    const queue = [pokemon];

    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;
        reachablePokemons.add(currentPokemon);
        if (!currentPokemon.evolutions || currentPokemon.evolutions.length === 0) {
            continue;
        }
        queue.push(...currentPokemon.evolutions.map(id => gamemasterPokemon[id]).filter(pk => pk) as IGamemasterPokemon[]);
    }

    return reachablePokemons;
}

export const fetchPokemonFamily = (pokemon: IGamemasterPokemon, gamemasterPokemon: Dictionary<IGamemasterPokemon>)  => {
    const family = new Set(pokemon.familyId ? Object.values(gamemasterPokemon).filter(p => p.speciesId !== pokemon.speciesId && p.familyId === pokemon.familyId && pokemon.isShadow === p.isShadow) : []);
    const reachableFromFamily = new Set(family);

    family.forEach(f => {
        const reachable = fetchReachablePokemonIncludingSelf(f, gamemasterPokemon);
        reachable.forEach(r => reachableFromFamily.add(r));
    });

    const queue = Array.from(reachableFromFamily);
    const queueSet = new Set(reachableFromFamily);

    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;
        queueSet.delete(currentPokemon);

        reachableFromFamily.add(currentPokemon);
        if (!currentPokemon.parent) {
            continue;
        }

        const parentRef = gamemasterPokemon[currentPokemon.parent];
        if (!parentRef) {
            continue;
        }

        if (!queueSet.has(parentRef)) {
            queueSet.add(parentRef);
            queue.push(parentRef);
        }
    }

    return reachableFromFamily;
}

export const computeBestIVs = (baseatk: number, basedef: number, basesta: number, league: number, maxLvlAllowed = 51) => {
    const cpm = [0.0939999967813491, 0.135137430784308, 0.166397869586944, 0.192650914456886, 0.215732470154762, 0.236572655026622, 0.255720049142837, 0.273530381100769, 0.290249884128570, 0.306057381335773, 0.321087598800659, 0.335445032295077, 0.349212676286697, 0.362457748778790, 0.375235587358474, 0.387592411085168, 0.399567276239395, 0.411193549517250, 0.422500014305114, 0.432926413410414, 0.443107545375824, 0.453059953871985, 0.462798386812210, 0.472336077786704, 0.481684952974319, 0.490855810259008, 0.499858438968658, 0.508701756943992, 0.517393946647644, 0.525942508771329, 0.534354329109191, 0.542635762230353, 0.550792694091796, 0.558830599438087, 0.566754519939422, 0.574569148039264, 0.582278907299041, 0.589887911977272, 0.597400009632110, 0.604823657502073, 0.612157285213470, 0.619404110566050, 0.626567125320434, 0.633649181622743, 0.640652954578399, 0.647580963301656, 0.654435634613037, 0.661219263506722, 0.667934000492096, 0.674581899290818, 0.681164920330047, 0.687684905887771, 0.694143652915954, 0.700542893277978, 0.706884205341339, 0.713169102333341, 0.719399094581604, 0.725575616972598, 0.731700003147125, 0.734741011137376, 0.737769484519958, 0.740785574597326, 0.743789434432983, 0.746781208702482, 0.749761044979095, 0.752729105305821, 0.755685508251190, 0.758630366519684, 0.761563837528228, 0.764486065255226, 0.767397165298461, 0.770297273971590, 0.773186504840850, 0.776064945942412, 0.778932750225067, 0.781790064808426, 0.784636974334716, 0.787473583646825, 0.790300011634826, 0.792803950958807, 0.795300006866455, 0.797803921486970, 0.800300002098083, 0.802803892322847, 0.805299997329711, 0.807803863460723, 0.810299992561340, 0.812803834895026, 0.815299987792968, 0.817803806620319, 0.820299983024597, 0.822803778631297, 0.825299978256225, 0.827803750922782, 0.830299973487854, 0.832803753381377, 0.835300028324127, 0.837803755931569, 0.840300023555755, 0.842803729034748, 0.845300018787384, 0.847803702398935, 0.850300014019012, 0.852803676019539, 0.855300009250640, 0.857803649892077, 0.860300004482269, 0.862803624012168, 0.865299999713897];
    const floor = 0;
    let minLvl = 1;
    let maxLvl = maxLvlAllowed;

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
                    const cp = Math.max(10, Math.floor((baseatk + atk) * Math.sqrt(basedef + def) * Math.sqrt(basesta + sta) * cpm[level] * cpm[level] / 10));
                    if ((league) && (cp > league)) {
                        continue;
                    }
                    /* Update maxLvl on first loop (0/0/0 or floor/floor/floor) to optimize performance */
                    if (atk === floor / 1 && def === floor / 1 && sta === floor / 1) {
                        maxLvl = level;
                    }
                    const aSt = (baseatk + atk) * cpm[level];
                    const dSt = (basedef + def) * cpm[level];
                    const sSt = Math.floor((basesta + sta) * cpm[level]);
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
                    level = level / 2 + 1;
                    /* store as arrays to prevent hash collisions from dropping entires */
                    /* Tie Breaking Order: 1)StatProd -> 2)AtkStat -> 3)HPval -> 4)finalCP -> 5)StaIV -> 6)ERROR */
                    const newIndex = statProd + "." + Math.round(100000 * aSt);
                    if (!(newIndex in ranks)) {
                        ranks[newIndex] = [{
                            "IVs": {
                                "A": atk,
                                "D": def,
                                "S": sta
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
                                "S": sta
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