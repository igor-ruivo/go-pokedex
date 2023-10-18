import { createRef, useEffect, useRef, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { calculateCP, calculateHP, computeBestIVs, fetchPokemonFamily, fetchPredecessorPokemonIncludingSelf, sortPokemonByBattlePowerAsc, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import "./PokemonSearchStrings.scss"
import PokemonHeader from "./PokemonHeader";
import { ListType } from "../views/pokedex";
import { Link, useLocation } from "react-router-dom";
import PokemonImage from "./PokemonImage";
import { usePokemon } from "../contexts/pokemon-context";
import LoadingRenderer from "./LoadingRenderer";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from "../utils/persistent-configs-handler";
import Dictionary from "../utils/Dictionary";

interface PokemonSearchStrings {
    pokemon: IGamemasterPokemon;
}

const getDefaultListType = () => {
    const cachedValue = readSessionValue(ConfigKeys.LastListType);
    if (!cachedValue) {
        return undefined;
    }

    const typedValue = +cachedValue as ListType;

    return typedValue === ListType.POKEDEX ? ListType.GREAT_LEAGUE : typedValue;
}

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const PokemonSearchStrings = ({pokemon}: PokemonSearchStrings) => {
    const [levelCap, setLevelCap] = useState(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 40));
    const [league, setLeague] = useState(getDefaultListType() ?? ListType.GREAT_LEAGUE);
    const [top, setTop] = useState(10);
    const [trash, setTrash] = useState(false);

    const {gamemasterPokemon, fetchCompleted, errors} = usePokemon();
    const {pathname} = useLocation();

    const predecessorPokemon = fetchPredecessorPokemonIncludingSelf(pokemon, gamemasterPokemon);
    const predecessorPokemonArray = Array.from(predecessorPokemon);

    useEffect(() => {
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [levelCap]);

    useEffect(() => {
        writeSessionValue(ConfigKeys.LastListType, JSON.stringify(league));
    }, [league]);

    useEffect(() => {
        const textAreas = predecessorPokemonArray.map(p => document.getElementById(p.speciesId + "-textarea")).filter(e => e) as HTMLTextAreaElement[];
        
        const eventListener = async (event: any) => {
            event.target.select();
            document.execCommand("copy");
            alert("Copied to clipboard.");
        };

        textAreas.forEach(t => {
            t.addEventListener("click", eventListener);
        });

        return () => {
            textAreas.forEach(t => {
                t.removeEventListener("click", eventListener);
            });
        }
    }, [pokemon]);

    let cpCap = Number.MAX_VALUE;

    switch (league) {
        case ListType.GREAT_LEAGUE:
            cpCap = 1500;
            break;
        case ListType.ULTRA_LEAGUE:
            cpCap = 2500;
            break;
        case ListType.MASTER_LEAGUE:
            cpCap = Number.MAX_VALUE;
            break;
    }

    if (!fetchCompleted || !gamemasterPokemon) {
        return <></>;
    }

    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);

    const valueToLevel = (value: number) => {
        return value / 2 + 0.5;
    }

    const getRanges = (array: any[]) => {
        /* https://stackoverflow.com/a/54205694 */
        return array.reduce(((l:any)=>(r,v: number,i,a)=>{
            if (l[1] > v)
                return r;
            r.push(l[1] === v ? (r.pop(),
            l.join('-')) : (l = [v, v]).slice(0, 1).toString());
            l[1]++;
            return r;
        }
        )([]), []);
    }

    const groupAttr = (input: Set<number>, lang: string) => {
        let output = Array.from(input);
        output.sort((a, b) => a - b);
        output = getRanges(output);
        if (output.length < 1) {
            console.log("groupAttr: No output(" + JSON.stringify(output) + "), returning empty string('')");
            return "";
        }
        /* Otherwise if we have something to output, keep going */
        var checkStr = output + lang;
        /* Can possibly return 0-1,2attack by default */
        var splitStr = checkStr.split(',');
        if (splitStr.length > 1) {
            for (var i = 0; i < splitStr.length; i++) {
                /* Add missing attack/defense/HP lang as needed */
                if (splitStr[i].includes(lang)) {
                    continue;
                } else {
                    splitStr[i] = splitStr[i] + lang;
                }
            }
            /* Ensure we merge the strings back together to return */
            checkStr = splitStr.join(",");
        }
        return "," + checkStr;
    }

    const get_matching_string = (a: number[], t: string) => {
        var list = ''
          , last = -1;
        for (var i = 0; i < a.length; i++) {
            if (a[i] === last + 1) {
                list += '-';
                last = a[i];
                while (++i < a.length) {
                    if (a[i] != last + 1)
                        break;
                    last = a[i];
                }
                if (a[--i] < 9999) {
                    list += a[i];
                }
            } else {
                list += ',' + t + a[i];
                last = a[i];
            }
        }
        return list.substr(1);
    }

    const trashFlip = (cps: Set<number>, maxCP: number, attr: boolean) => {
        for (let i = attr ? 0 : 10; i <= maxCP; i++) {
            if (cps.has(i)) {
                cps.delete(i);
            } else {
                cps.add(i);
            }
        }

        return cps;
    }

    const computeSearchString = (predecessorPokemon: IGamemasterPokemon) => {
        const cps = [];
        const hps = [];
        const atkivs = [];
        const defivs = [];
        const hpivs = [];

        for (let i = 0; i <= 4; i++) {
            cps[i] = new Set<number>();
            hps[i] = new Set<number>();
            atkivs[i] = new Set<number>();
            defivs[i] = new Set<number>();
            hpivs[i] = new Set<number>();
        }

        const maxCP = new Array(5).fill(0), maxHP = new Array(5).fill(0);

        const topIVCombinations = Object.values(computeBestIVs(pokemon.atk, pokemon.def, pokemon.hp, cpCap, levelCap)).flat();

        for (let i = 0; i < top; i++) {
            const topIVCombination = topIVCombinations[i];
            const maxLevel = topIVCombination.L;

            const atkBucket = topIVCombination.IVs.A === 15 ? 4 : Math.ceil(topIVCombination.IVs.A / 5);
            const defBucket = topIVCombination.IVs.D === 15 ? 4 : Math.ceil(topIVCombination.IVs.D / 5);
            const hpBucket = topIVCombination.IVs.S === 15 ? 4 : Math.ceil(topIVCombination.IVs.S / 5);

            const star = topIVCombination.IVs.star;

            const baseatk = predecessorPokemon.atk;
            const basedef = predecessorPokemon.def;
            const basesta = predecessorPokemon.hp;

            for (let j = 0; j <= (Math.min(35, maxLevel) - 1) * 2; j += 2) {
                const cp = calculateCP(baseatk, topIVCombination.IVs.A, basedef, topIVCombination.IVs.D, basesta, topIVCombination.IVs.S, j);
                const hp = calculateHP(basesta, topIVCombination.IVs.S, j);
                cps[star].add(cp);
                hps[star].add(hp);
                atkivs[star].add(atkBucket);
                defivs[star].add(defBucket);
                hpivs[star].add(hpBucket);

                if (maxCP[star] < cp) {
                    maxCP[star] = cp;
                }

                if (maxHP[star] < hp) {
                    maxHP[star] = hp;
                }
            }
        }

        if (trash) {
            maxCP.fill(Math.max(...maxCP));
            maxHP.fill(Math.max(...maxHP));
        }

        let result = predecessorPokemon.dex.toString();

        if (trash) {
            for (let i = 0; i < atkivs.length; i++) {
                atkivs[i] = trashFlip(atkivs[i], 4, true);
                defivs[i] = trashFlip(defivs[i], 4, true);
                hpivs[i] = trashFlip(hpivs[i], 4, true);
            }
        }

        let emptyBuf = "";

        for (let i = 0; i < 4; i++) {
            if ((cps[i] as Set<number>).size > 0) {

                if (trash) {
                    cps[i] = trashFlip(cps[i] as Set<number>, maxCP[i], false);
                    
                    /* skip empty hps */
                    if ((hps[i] as Set<number>).size > 0) {
                        hps[i] = trashFlip(hps[i] as Set<number>, maxHP[i], false);
                    }
                }

                cps[i] = Array.from(cps[i]);
                (cps[i] as number[]).sort((a, b) => a - b);
                result += '&!' + i + '*' + groupAttr(atkivs[i], "attack");
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += groupAttr(defivs[i], "defense");
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += groupAttr(hpivs[i], "hp");
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += "," + get_matching_string(cps[i] as number[], "cp");
                if (!trash) {
                    result += '&!' + i + '*';
                }
                if ((hps[i] as Set<number>).size > 0) {
                    hps[i] = Array.from(hps[i]);
                    (hps[i] as number[]).sort((a, b) => a - b);
                    result += ',' + get_matching_string(hps[i] as number[], "hp");
                }
            } else if (!trash) {
                emptyBuf += '&!' + i + '*';
            }
        }

        result += emptyBuf;

        if (trash) {
            result += '&!4*';
        } else {
            if ((cps[4] as Set<number>).size > 0) {
                result += ',4*';
            }
        }

        return result;
    }

    return (
        <div className="pokemon-content">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <div className="content">
                    <PokemonHeader
                        pokemonName={pokemon.speciesName}
                        type1={pokemon.types[0]}
                        type2={pokemon.types.length > 1 ? pokemon.types[1] : undefined}
                    />
                        <nav className="navigation-header ivs-nav">
                            <ul>
                                <li>
                                    <div onClick={() => setLeague(ListType.GREAT_LEAGUE)} className={"header-tab " + (league === ListType.GREAT_LEAGUE ? "selected" : "")}>
                                        <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                                        <span>Great</span>
                                    </div>
                                </li>
                                <li>
                                    <div onClick={() => setLeague(ListType.ULTRA_LEAGUE)} className={"header-tab " + (league === ListType.ULTRA_LEAGUE ? "selected" : "")}>
                                        <img height="24" width="24" src="https://i.imgur.com/jtA6QiL.png" alt="Ultra League"/>
                                        <span>Ultra</span>
                                    </div>
                                </li>
                                <li>
                                    <div onClick={() => setLeague(ListType.MASTER_LEAGUE)} className={"header-tab " + (league === ListType.MASTER_LEAGUE ? "selected" : "")}>
                                        <img height="24" width="24" src="https://i.imgur.com/vJOBwfH.png" alt="Master League"/>
                                        <span>Master</span>
                                    </div>
                                </li>
                            </ul>
                        </nav>
                        <div className="extra-ivs-options">
                                    <select value={levelCap} onChange={e => setLevelCap(+e.target.value)} className="select-level">
                                        {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                                            .map(e => (<option key={e} value={e}>Max Lvl {e}</option>))}
                                    </select>
                                    &nbsp;&nbsp;&nbsp;Find Top <input className="select-level" type="number" value={top} onChange={e => {const value = +e.target.value; Number.isInteger(value) && value >= 1 && value <= 4096 && setTop(+e.target.value)}} min={1} max={4096}/>
                                    &nbsp;&nbsp;&nbsp;Trash string <input type="checkbox" checked={trash} onChange={_ => setTrash(previous => !previous)}/>
                                    </div>
                                    
                        {similarPokemon.size > 1 && <div className="img-container">
                            <div className="img-family">
                                {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                                    <div key = {p.speciesId} className="img-family-container">
                                        <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                            <PokemonImage pokemon={p}/>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>}
                        {predecessorPokemonArray.sort(sortPokemonByBattlePowerAsc).map(p => <div key = {p.speciesId} className="textarea-label">{p.speciesId === pokemon.speciesId ? `Find ${!trash ? "" : "all except "} top ${top} wild caught unpowered ${p.speciesName} for ${league === 1 ? "Great League" : league === 2 ? "Ultra League" : "Master League"}, up to level ${levelCap}` : `Find wild caught unpowered ${p.speciesName} that result in ${!trash ? "" : "all except "} top ${top} ${pokemon.speciesName} for ${league === 1 ? "Great League" : league === 2 ? "Ultra League" : "Master League"}, up to level ${levelCap}`}<textarea id={p.speciesId + "-textarea"} className="search-strings-container"
                            value={computeSearchString(p)}
                            readOnly
                        /></div>)}
                        
                </div>
            </LoadingRenderer>
        </div>
    );
}

export default PokemonSearchStrings;