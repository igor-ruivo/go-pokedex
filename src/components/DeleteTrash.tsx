import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { GameLanguage, useLanguage } from "../contexts/language-context";
import { usePokemon } from "../contexts/pokemon-context";
import { usePvp } from "../contexts/pvp-context";
import Dictionary from "../utils/Dictionary";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { computeBestIVs, fetchReachablePokemonIncludingSelf, isNormalPokemonAndHasShadowVersion } from "../utils/pokemon-helper";
import "./DeleteTrash.scss"
import { ConfigKeys, readPersistentValue, writePersistentValue } from "../utils/persistent-configs-handler";
import LoadingRenderer from "./LoadingRenderer";
import { useRaidRanker } from "../contexts/raid-ranker-context";
import { useMoves } from "../contexts/moves-context";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonHeader from "./PokemonHeader";

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const DeleteTrash = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {moves, movesFetchCompleted} = useMoves();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {currentGameLanguage, currentLanguage} = useLanguage();
    const [trashGreat, setTrashGreat] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashGreat, 50));
    const [trashUltra, setTrashUltra] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashUltra, 50));
    const [trashMaster, setTrashMaster] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashMaster, 110));
    const [trashRaid, setTrashRaid] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashRaid, 5));
    const [cp, setCP] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashCP, 2500));
    const {raidDPS, raidDPSFetchCompleted} = useRaidRanker();
    const [isCalculating, setIsCalculating] = useState(false);
    const [isExpanded, setExpanded] = useState(false);

    const targetRef = useRef<HTMLTextAreaElement>(null);
    
    const enumValues: PokemonTypes[] = useMemo(() => Object.keys(PokemonTypes)
        .filter(key => isNaN(Number(key)) && key !== "Normal")
        .map(key => key as unknown as PokemonTypes), []);
    
    const isBadRank = useCallback((rank: number, rankLimit: number) => {
        return rank === Infinity || rank > rankLimit;
    }, []);

    const needsLessThanFiveAttack = useCallback((p: IGamemasterPokemon, leagueIndex: number) => {
        const bestIVs = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, leagueIndex === 0 ? 1500 : leagueIndex === 1 ? 2500 : Number.MAX_VALUE)).flat();
        for (let i = 0; i < 5; i++) {
            const neededAtk = bestIVs[i].IVs.A;
            if (neededAtk >= 5) {
                return false;
            }
        }
        return true;
    }, []);

    const isGoodForRaids = useCallback((p: IGamemasterPokemon) => {
        if (!fetchCompleted || !raidDPSFetchCompleted) {
            return true;
        }

        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
        const exceptionPokemon = ["slowpoke_galarian", "slowbro_galarian"];

        const mega = exceptionPokemon.includes(p.speciesId) ? [] : Object.values(gamemasterPokemon)
            .filter(pk => !pk.aliasId && pk.isMega && reachablePokemon.some(r => r.dex === pk.dex));

        let minRaidRank = Infinity;
        const finalCollection = [...reachablePokemon, ...mega];
        enumValues.forEach(t => {
            finalCollection.forEach(pk => {
                const rank = Object.keys(raidDPS[t.toString().toLocaleLowerCase()]).indexOf(pk.speciesId);
                if (rank !== -1) {
                    minRaidRank = Math.min(minRaidRank, rank + 1);
                }
            });
        });

        return minRaidRank <= trashRaid;
    }, [fetchCompleted, trashRaid, raidDPSFetchCompleted, enumValues, gamemasterPokemon, raidDPS]);

    const isBadForEverythingIfItHasHighAttack = useCallback((p: IGamemasterPokemon) => {
        if (!fetchCompleted || !pvpFetchCompleted) {
            return false;
        }

        if (isGoodForRaids(p)) {
            return false;
        }

        // here, the pokémon is good for something...
        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));

        // if any reachable is good for master, return false
        // if some reachable good for great DONT need little attack, return false
        // if some reabhable good for ultra DONT need little attack, return false
        // otherwise, return true

        if (reachablePokemon.some(k => !isBadRank(rankLists[2][k.speciesId]?.rank ?? Infinity, trashMaster))) {
            return false;
        }

        if (reachablePokemon.some(k => !isBadRank(rankLists[0][k.speciesId]?.rank ?? Infinity, trashGreat) && !needsLessThanFiveAttack(k, 0))) {
            return false;
        }

        if (reachablePokemon.some(k => !isBadRank(rankLists[1][k.speciesId]?.rank ?? Infinity, trashUltra) && !needsLessThanFiveAttack(k, 1))) {
            return false;
        }

        return true;
    }, [fetchCompleted, pvpFetchCompleted, isGoodForRaids, gamemasterPokemon, rankLists, trashMaster, isBadRank, needsLessThanFiveAttack, trashGreat, trashUltra]);

    const isBadForEverything = useCallback((p: IGamemasterPokemon) => {
        if (!fetchCompleted || !pvpFetchCompleted) {
            return false;
        }

        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
        const glLowestRank = Math.min(...reachablePokemon.map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...reachablePokemon.map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...reachablePokemon.map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        
        return !isGoodForRaids(p) && isBadRank(glLowestRank, trashGreat) && isBadRank(ulLowestRank, trashUltra) && isBadRank(mlLowestRank, trashMaster);
    }, [fetchCompleted, isGoodForRaids, pvpFetchCompleted, gamemasterPokemon, rankLists, isBadRank, trashGreat, trashUltra, trashMaster]);

    const computeStr = useCallback(() => {
        if (!fetchCompleted) {
            return "";
        }

        const potentiallyDeletablePokemon = new Set<number>();

        const alwaysBadIfHighAtk: Dictionary<Set<IGamemasterPokemon>> = {};
        const alwaysGood: Dictionary<Set<IGamemasterPokemon>> = {};

        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && !p.isMega && !p.isLegendary && !p.isMythical && !p.isBeast)
            .forEach(p => {
                if (isBadForEverything(p)) {
                    potentiallyDeletablePokemon.add(p.dex);
                } else {
                    if (isBadForEverythingIfItHasHighAttack(p)) {
                        potentiallyDeletablePokemon.add(p.dex);
                        if (!alwaysBadIfHighAtk[p.dex]) {
                            alwaysBadIfHighAtk[p.dex] = new Set<IGamemasterPokemon>();
                        }
                        alwaysBadIfHighAtk[p.dex].add(p);
                    } else {
                        // is always good for something, no matter the IVs.
                        if (!alwaysGood[p.dex]) {
                            alwaysGood[p.dex] = new Set<IGamemasterPokemon>();
                        }
                        alwaysGood[p.dex].add(p);
                    }
                }
            });

        //
        type PokemonForm = {
            dexNumber: number;
            types: string[];
            isShadow: boolean;
            p: IGamemasterPokemon;
        };
        
        type UniqueTypes = { [dexNumber: number]: Set<string> };
        
        const buildUniqueTypes = (pokemonForms: PokemonForm[]): UniqueTypes => {
            const typeOccurrences: { [dexNumber: number]: { [type: string]: number } } = {};
        
            pokemonForms.forEach(({ dexNumber, types }) => {
                if (!typeOccurrences[dexNumber]) typeOccurrences[dexNumber] = {};
                types.forEach(type => {
                    typeOccurrences[dexNumber][type] = (typeOccurrences[dexNumber][type] || 0) + 1;
                });
            });
        
            const uniqueTypes: UniqueTypes = {};
            for (const dex in typeOccurrences) {
                const dexNumber = parseInt(dex);
                uniqueTypes[dexNumber] = new Set<string>();
                for (const type in typeOccurrences[dexNumber]) {
                    if (typeOccurrences[dexNumber][type] === 1) {
                        uniqueTypes[dexNumber].add(type);
                    }
                }
            }
        
            return uniqueTypes;
        };
        
        const generatePokemonId = (
            dexNumber: number,
            types: string[],
            uniqueTypes: UniqueTypes,
            formSiblings: PokemonForm[],
            form: PokemonForm
        ) => {
            // Base case: if only one form exists for this dex number, no disambiguation is needed.
            if (formSiblings.length === 1) {
                return `${dexNumber}`;
            }
        
            let identifier = `${dexNumber}`;
            const uniqueTypesForDex = uniqueTypes[dexNumber] || new Set<string>();
            const siblingTypesToNegate = new Set<string>();
        
            // Check if this form has a unique type
            const uniqueType = types.find(type => uniqueTypesForDex.has(type));
        
            if (uniqueType) {
                identifier += `,${uniqueType}`;
            } else {
                // No unique type; include all types and selectively negate sibling-specific types
                types.forEach(type => {
                    // only if not all other forms already have it...
                    if (formSiblings.some(t => !t.types.includes(type))) {
                        identifier += `,${type}`;
                    }
                });
        
                formSiblings.forEach(sibling => {
                    if (sibling !== form) {
                        sibling.types.forEach(siblingType => {
                            if (!types.includes(siblingType) && sibling.types.some(t => types.includes(t))) {
                                siblingTypesToNegate.add(siblingType);
                            }
                        });
                    }
                });
        
                siblingTypesToNegate.forEach(type => {
                    identifier += `,!${type}`;
                });
            }
        
            return identifier;
        };
        
        // Original collection that includes shadow Pokémon
        const allPokemonForms = Object.values(gamemasterPokemon)
            .filter(e => !e.isMega && !e.aliasId)
            .map(e => ({
                dexNumber: e.dex,
                types: e.types.map(f => f.toString().toLocaleLowerCase()),
                isShadow: e.isShadow,
                p: e,
            }));
        
        const uniqueTypes = buildUniqueTypes(allPokemonForms.filter(c => !c.isShadow));
        
        const baseIds: { [key: string]: string } = {};
        
        allPokemonForms.forEach(form => {
            const formSiblings = allPokemonForms.filter(f => f.dexNumber === form.dexNumber && !f.isShadow);
            const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
            baseIds[`${form.dexNumber},${form.types.join(",")}`] = id;
        });

        let str = "";

        const potentiallyDeletablePokemonArray = Array.from(potentiallyDeletablePokemon);
        str += potentiallyDeletablePokemonArray.join(",");

        const terms = new Set<string>();
        
        // so these are all the pokémon dexes that will be deleted.
        // take dex number x, for example. there can be y variations that are always bad, and there can be another one that is just bad if it has high atk and yet another one that is always good.
        // we don't need to care about "if it needs to be disambiguated or not in order to save space", because their baseIds already compute that.
        // so we always use that baseId.
        // so: for each dex, check if there are variants alwaysGood. they will be negated in the search string and even if more entries with the same id are not alwaysGood, we can rest assured because this single one will save that pkm.
        // then, check if there are entries bad if they have high atk. same thing, but add 2- atk after.
        // no need to do anything for the alwaysBad collection. these are already the default due to the first AND that has all dexes.
        potentiallyDeletablePokemonArray.forEach(d => {
            if (alwaysGood[d]) {
                // first: check if it's always good for something. if this is the case, abort immediatelly because it may not be a pokémon that is able to be differenciated.
                // (examples: pumpkaboo, genesect...)
                // the !dex will appear in the string and even if more entries appear, this one will be enough to not delete any of them.
                const entries = alwaysGood[d];
                entries.forEach(e => {
                    let newStr = '';
                    const baseId = baseIds[`${e.dex},${e.types.map(t => t.toString().toLocaleLowerCase()).join(",")}`];//23,dark,!dragon
                    newStr += ('&' + baseId.split(',').map(f => {
                        if (f.startsWith('!')) {
                            return f.substring(1);
                        }
                        return `!${f}`;
                    }).join(","));//!23,!dark,dragon

                    // improvement: for each dex: for each entry: if there's 1 with shadow and there's its non-shadow counterpart in the delete string, remove from both.
                    // no repetitions
                    // improvement check if it's better to invert the first part if it saves space...
                    if (e.isShadow) {
                        newStr += `,!shadow`;
                    } else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
                        newStr += `,shadow`;
                    }
                    
                    if (!terms.has(newStr)) {
                        str += newStr;
                        terms.add(newStr);
                    }
                });
            }

            if (alwaysBadIfHighAtk[d]) {
                const entries = alwaysBadIfHighAtk[d];
                entries.forEach(e => {
                    let newStr = '';
                    const baseId = baseIds[`${e.dex},${e.types.map(t => t.toString().toLocaleLowerCase()).join(",")}`];//23,dark,!dragon
                    newStr += ('&' + baseId.split(',').map(f => {
                        if (f.startsWith('!')) {
                            return f.substring(1);
                        }
                        return `!${f}`;
                    }).join(","));//!23,!dark,dragon

                    if (e.isShadow) {
                        newStr += `,!shadow`;
                    } else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
                        newStr += `,shadow`;
                    }

                    newStr += `,2-${gameTranslator(GameTranslatorKeys.AttackSearch, currentGameLanguage)}`;
                    
                    if (!terms.has(newStr)) {
                        str += newStr;
                        terms.add(newStr);
                    }
                });
            }
        });

        // optimization for lower length query (apk on android devices has a limit of 5k characters...)

        const parts = str.split('&');
        const allDexes = new Set(Object.values(gamemasterPokemon)
            .filter(e => !e.isMega && !e.aliasId).map(f => f.dex));

        const actualDexes = new Set(parts[0].split(',').map(f => +f));

        const specialDexes = new Set(Object.values(gamemasterPokemon).filter(d => !d.aliasId && !d.isMega && (d.isBeast || d.isLegendary || d.isMythical)).map(d => +d.dex));

        const oppositeDexes = '!' + Array.from(allDexes).filter(j => !actualDexes.has(j) || specialDexes.has(j)).join('&!');

        let newStr = '';

        if (parts[0].length <= oppositeDexes.length) {
            newStr = parts[0];
        } else {
            newStr = oppositeDexes;
        }

        let currentDex = '';
        const buffer = new Map<string, string>();
        for (let i = 1; i < parts.length; i++) {
            const current = parts[i];
            const readDex = current.substring(1, current.indexOf(','));
            if (currentDex !== readDex) {
                currentDex = readDex;
                if (buffer.size > 0) {
                    newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
                    buffer.clear();
                }
            }
            const termWithoutShadowModifier = current.replaceAll(',!shadow', '').replaceAll(',shadow', '');

            if (!buffer.has(termWithoutShadowModifier)) {
                buffer.set(termWithoutShadowModifier, current);
            } else {
                buffer.set(termWithoutShadowModifier, termWithoutShadowModifier);
            }
        }

        if (buffer.size > 0) {
            newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
        }

        if (currentGameLanguage === GameLanguage.ptbr) {
            newStr = newStr
            .replaceAll('bug', 'inseto')
            .replaceAll('dark', 'sombrio')
            .replaceAll('dragon', 'dragão')
            .replaceAll('electric', 'elétrico')
            .replaceAll('fairy', 'fada')
            .replaceAll('fighting', 'lutador')
            .replaceAll('fire', 'fogo')
            .replaceAll('flying', 'voador')
            .replaceAll('ghost', 'fantasma')
            .replaceAll('grass', 'planta')
            .replaceAll('ground', 'terrestre')
            .replaceAll('ice', 'gelo')
            .replaceAll('poison', 'venenoso')
            .replaceAll('psychic', 'psíquico')
            .replaceAll('rock', 'pedra')
            .replaceAll('steel', 'aço')
            .replaceAll('water', 'água')
            .replaceAll('shadow', 'sombroso');
        }

        newStr += `&!4*&!#&!${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage)}${cp}-&!${gameTranslator(GameTranslatorKeys.Favorite, currentGameLanguage)}&!${gameTranslator(GameTranslatorKeys.MegaEvolve, currentGameLanguage)}`;

        return newStr;
    }, [fetchCompleted, gamemasterPokemon, isBadForEverything, isBadForEverythingIfItHasHighAttack, cp, currentGameLanguage]);

    useEffect(() => {
        if (!isCalculating || !fetchCompleted || !movesFetchCompleted || raidDPSFetchCompleted) {
            return;
        }

        if (targetRef?.current) { 
            targetRef.current.value = translator(TranslatorKeys.Loading, currentLanguage);
        }

    }, [fetchCompleted, currentLanguage, movesFetchCompleted, enumValues, gamemasterPokemon, isCalculating, moves, raidDPSFetchCompleted]);

    useEffect(() => {
        if (!isCalculating || !raidDPSFetchCompleted || !fetchCompleted || !pvpFetchCompleted || !movesFetchCompleted) {
            return;
        }
        
        if (targetRef?.current) { 
            targetRef.current.value = translator(TranslatorKeys.Loading, currentLanguage);
        }

        setTimeout(() => {
            if (targetRef?.current) {
                targetRef.current.value = computeStr();
            }
            setIsCalculating(false);
        }, 100);
        
    }, [isCalculating, enumValues, fetchCompleted, pvpFetchCompleted, movesFetchCompleted, computeStr, raidDPSFetchCompleted, targetRef, currentLanguage]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashGreat, trashGreat.toString());
    }, [trashGreat, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashUltra, trashUltra.toString());
    }, [trashUltra, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashMaster, trashMaster.toString());
    }, [trashMaster, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashRaid, trashRaid.toString());
    }, [trashRaid, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashCP, cp.toString());
    }, [cp, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
    }, [currentGameLanguage, targetRef]);

    return (
        <main className="layout">
            <div className="full-height">
                <div className="pokemon-content">
                    <LoadingRenderer errors="" completed={pvpFetchCompleted && fetchCompleted}>
                        {() => <div className="content">
                            <PokemonHeader
                                pokemonName={translator(TranslatorKeys.Trash, currentLanguage)}
                                type1={undefined}
                                type2={undefined}
                                defaultTextColor
                                defaultBannerColor
                                whiteTextColor
                            />
                            <div className="pokemon normal-text-descendants">
                            <div className="item with-small-margin-top events-header-image-container">
                                        <img alt='AI' src= {`${process.env.PUBLIC_URL}/images/ai/trash-no-bg.png`}/>
                                    </div>
                                    <div className="flex-column normal-margin-top">
                            <div className={`extra-ivs-options item default-padding column text-container ${isExpanded ? 'expanded' : ''}`}>
                            <p id="readMoreText" className={`${isExpanded ? 'expanded' : ''}`}>{translator(TranslatorKeys.TrashHelp, currentLanguage)}</p>
                            <u onClick={()=>{setExpanded(e => !e)}} id="readMoreLink">
                                {isExpanded ? translator(TranslatorKeys.ReadLess, currentLanguage) : translator(TranslatorKeys.ReadMore, currentLanguage)}
                            </u>
                            
                            </div>

                            <div className="extra-ivs-options item default-padding column">
                                <div className="row-flex">
                                    <div>
                                    {translator(TranslatorKeys.Save, currentLanguage)} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}s{translator(TranslatorKeys.CPCap, currentLanguage)}: <select value={cp} onChange={e => setCP(+e.target.value)} className="select-level">
                                        <option key={500} value={500}>{500}</option>
                                        <option key={1000} value={1000}>{1000}</option>
                                        <option key={1500} value={1500}>{1500}</option>
                                        <option key={2000} value={2000}>{2000}</option>
                                        <option key={2500} value={2500}>{2500}</option>
                                        <option key={3000} value={3000}>{3000}</option>
                                        <option key={3500} value={3500}>{3500}</option>
                                        <option key={4000} value={4000}>{4000}</option>
                                    </select>
                                    </div>
                                </div>
                                <div className="row-flex">
                                <div>
                                <img height={20} width={20} alt="Great League" src={`${process.env.PUBLIC_URL}/images/leagues/great.png`}/> {translator(TranslatorKeys.Save, currentLanguage)} top <select value={trashGreat} onChange={e => setTrashGreat(+e.target.value)} className="select-level">
                                        {Array.from({length: 2000}, (_x, i) => i)
                                            .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                <div>
                                <img height={20} width={20} alt="Ultra League" src={`${process.env.PUBLIC_URL}/images/leagues/ultra.png`}/> {translator(TranslatorKeys.Save, currentLanguage)} top <select value={trashUltra} onChange={e => setTrashUltra(+e.target.value)} className="select-level">
                                    {Array.from({length: 2000}, (_x, i) => i)
                                        .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                </div>
                                <div className="row-flex">
                                    
                                <div>
                                <img height={20} width={20} alt="Master League" src={`${process.env.PUBLIC_URL}/images/leagues/master.png`}/> {translator(TranslatorKeys.Save, currentLanguage)} top <select value={trashMaster} onChange={e => setTrashMaster(+e.target.value)} className="select-level">
                                    {Array.from({length: 2000}, (_x, i) => i)
                                        .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                <div>
                                <img height={20} width={20} className="padded-img raid-img-with-contrast" alt="Raids" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`}/> {translator(TranslatorKeys.Save, currentLanguage)} top <select value={trashRaid} onChange={e => setTrashRaid(+e.target.value)} className="select-level">
                                        {Array.from({length: 2000}, (_x, i) => i)
                                            .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                </div>
                            </div>
                            <button className="dark-text main-btn with-big-top-margin" disabled={isCalculating} onClick={(e) => {
                                setIsCalculating(true);
                            }}>{translator(TranslatorKeys.Compute, currentLanguage)}!</button>
                            <textarea
                                ref={targetRef}
                                className="search-strings-container big-height"
                                readOnly
                                onClick={(e: any) => {e.target.select();
                                    document.execCommand("copy");
                                    alert("Copied to clipboard.");}}
                            /></div>
                            </div>
                        </div>
}
                    </LoadingRenderer>
                </div>
            </div>
        </main>
    );
}

export default DeleteTrash;