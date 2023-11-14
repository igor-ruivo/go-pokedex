import { useEffect, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { calculateCP, calculateHP, computeBestIVs, fetchPokemonFamily, fetchPredecessorPokemonIncludingSelf, sortPokemonByBattlePowerAsc, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import "./PokemonSearchStrings.scss"
import { Link, useLocation } from "react-router-dom";
import PokemonImage from "./PokemonImage";
import { usePokemon } from "../contexts/pokemon-context";
import { ConfigKeys, readPersistentValue, writePersistentValue } from "../utils/persistent-configs-handler";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";

interface PokemonSearchStrings {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
}

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
    const cachedValue = readPersistentValue(key);
    if (cachedValue === null) {
        return defaultValue;
    }
    return cachedValue === "true";
}

const PokemonSearchStrings = ({pokemon, league}: PokemonSearchStrings) => {
    const [levelCap, setLevelCap] = useState(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 40));
    const [top, setTop] = useState(parsePersistentCachedNumberValue(ConfigKeys.TopPokemonInSearchString, 10));
    const [trash, setTrash] = useState(parsePersistentCachedBooleanValue(ConfigKeys.TrashString, false));

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {pathname} = useLocation();

    const predecessorPokemon = fetchPredecessorPokemonIncludingSelf(pokemon, gamemasterPokemon);
    const predecessorPokemonArray = Array.from(predecessorPokemon);

    const {currentLanguage, currentGameLanguage} = useLanguage();

    useEffect(() => {
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [levelCap]);

    useEffect(() => {
        writePersistentValue(ConfigKeys.TopPokemonInSearchString, top.toString());
    }, [top]);

    useEffect(() => {
        writePersistentValue(ConfigKeys.TrashString, trash.toString());
    }, [trash]);

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
        case LeagueType.GREAT_LEAGUE:
            cpCap = 1500;
            break;
        case LeagueType.ULTRA_LEAGUE:
            cpCap = 2500;
            break;
        case LeagueType.MASTER_LEAGUE:
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
                result += '&!' + i + '*' + groupAttr(atkivs[i], gameTranslator(GameTranslatorKeys.AttackSearch, currentGameLanguage));
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += groupAttr(defivs[i], gameTranslator(GameTranslatorKeys.DefenseSearch, currentGameLanguage));
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += groupAttr(hpivs[i], gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage));
                if (!trash) {
                    result += '&!' + i + '*';
                }
                result += "," + get_matching_string(cps[i] as number[], gameTranslator(GameTranslatorKeys.CPSearch, currentGameLanguage));
                if (!trash) {
                    result += '&!' + i + '*';
                } else {
                    result += ',' + gameTranslator(GameTranslatorKeys.CPSearch, currentGameLanguage) + (maxCP[i] + 1) + "-";
                }
                if ((hps[i] as Set<number>).size > 0) {
                    hps[i] = Array.from(hps[i]);
                    (hps[i] as number[]).sort((a, b) => a - b);
                    result += ',' + get_matching_string(hps[i] as number[], gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage));
                    if (trash) {
                        result += ',' + gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage) + (maxHP[i] + 1) + "-";
                    }
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
        <div className="banner_layout">
            <div className="extra-ivs-options">
                <select value={levelCap} onChange={e => setLevelCap(+e.target.value)} className="select-level">
                    {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                        .map(e => (<option key={e} value={e}>{translator(TranslatorKeys.MaxLvl, currentLanguage)} {e}</option>))}
                </select>
                &nbsp;&nbsp;&nbsp;Top <select value={top} onChange={e => setTop(+e.target.value)} className="select-level">
                    {Array.from({length: 4096}, (_x, i) => i + 1)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
                &nbsp;&nbsp;&nbsp;{translator(TranslatorKeys.TrashString, currentLanguage)} <input type="checkbox" checked={trash} onChange={_ => setTrash(previous => !previous)}/>
            </div>
                        
            {similarPokemon.size > 1 && <div className="img-container">
                <div className="img-family">
                    {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                        <div key = {p.speciesId} className="img-family-container">
                            <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                <PokemonImage pokemon={p} withName={false} withMetadata={false}/>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>}
            {predecessorPokemonArray.sort(sortPokemonByBattlePowerAsc).map(p => <div key = {p.speciesId} className="textarea-label">{p.speciesId === pokemon.speciesId ?
            `${translator(TranslatorKeys.Find, currentLanguage)} ${!trash ? "" : translator(TranslatorKeys.AllExcept, currentLanguage)} ${translator(TranslatorKeys.FindTop, currentLanguage)} ${top} ${p.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} (${translator(TranslatorKeys.WildUnpowered, currentLanguage)}) ${translator(TranslatorKeys.ForLeague, currentLanguage)} ${(league === 0 || league === 1) ? gameTranslator(GameTranslatorKeys.GreatLeague, currentGameLanguage) : league === 2 ? gameTranslator(GameTranslatorKeys.UltraLeague, currentGameLanguage) : gameTranslator(GameTranslatorKeys.MasterLeague, currentGameLanguage)} ${translator(TranslatorKeys.UpToLevel, currentLanguage)} ${levelCap}` :
            `${translator(TranslatorKeys.Find, currentLanguage)} ${p.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} (${translator(TranslatorKeys.WildUnpowered, currentLanguage)}) ${translator(TranslatorKeys.ThatResultIn, currentLanguage)} ${!trash ? "" : translator(TranslatorKeys.AllExcept, currentLanguage)} ${translator(TranslatorKeys.FindTop, currentLanguage)} ${top} ${pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} ${translator(TranslatorKeys.ForLeague, currentLanguage)} ${(league === 0 || league === 1) ? gameTranslator(GameTranslatorKeys.GreatLeague, currentGameLanguage) : league === 2 ? gameTranslator(GameTranslatorKeys.UltraLeague, currentGameLanguage) : gameTranslator(GameTranslatorKeys.MasterLeague, currentGameLanguage)} ${translator(TranslatorKeys.UpToLevel, currentLanguage)} ${levelCap}`}<textarea id={p.speciesId + "-textarea"} className="search-strings-container"
                value={computeSearchString(p)}
                readOnly
            /></div>)}
        </div>
    );
}

export default PokemonSearchStrings;