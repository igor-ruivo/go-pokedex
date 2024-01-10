import { useEffect, useRef, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import { usePokemon } from "../contexts/pokemon-context";
import { usePvp } from "../contexts/pvp-context";
import Dictionary from "../utils/Dictionary";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { computeBestIVs, fetchReachablePokemonIncludingSelf } from "../utils/pokemon-helper";
import "./DeleteTrash.scss"
import { IRankedPokemon } from "../DTOs/IRankedPokemon";
import { ConfigKeys, readPersistentValue, writePersistentValue } from "../utils/persistent-configs-handler";
import LoadingRenderer from "./LoadingRenderer";

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const DeleteTrash = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {currentGameLanguage} = useLanguage();
    const [trashGreat, setTrashGreat] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashGreat, 100));
    const [trashUltra, setTrashUltra] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashUltra, 100));
    const [trashMaster, setTrashMaster] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashMaster, 200));
    const [trashRaid, setTrashRaid] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashRaid, 20));
    const [top, setTop] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashTop, 20));
    const [cp, setCP] = useState(parsePersistentCachedNumberValue(ConfigKeys.TrashCP, 2000));

    const targetRef = useRef<HTMLTextAreaElement>(null);

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
        writePersistentValue(ConfigKeys.TrashTop, top.toString());
    }, [top, targetRef]);

    useEffect(() => {
        if (targetRef.current) {
            targetRef.current.value = "";
        }
        writePersistentValue(ConfigKeys.TrashCP, cp.toString());
    }, [cp, targetRef]);

    const isBadRank = (rank: number, rankLimit: number) => {
        return rank === Infinity || rank > rankLimit;
    }

    const needsLessThanFiveAttack = (p: IGamemasterPokemon, leagueIndex: number) => {
        const bestIVs = Object.values(computeBestIVs(p.atk, p.def, p.hp, leagueIndex === 0 ? 1500 : leagueIndex === 1 ? 2500 : Number.MAX_VALUE)).flat();
        for (let i = 0; i < top; i++) {
            const neededAtk = bestIVs[i].IVs.A;
            if (neededAtk >= 5) {
                return false;
            }
        }
        return true;
    }

    const isBadWithAttack = (p: IGamemasterPokemon) => {
        // here, the pokémon is good for something...
        // find those good for gl and ul that need <5 atk in the first 20 spots, except if rank for great or ultra is <= 20
        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));

        const findMinRankAndPokemon = (reachablePokemon: IGamemasterPokemon[], rankList: Dictionary<IRankedPokemon>) => {
            let minRank = Infinity;
            let minSpeciesId = undefined;
          
            for (const p of reachablePokemon) {
                const rank = rankList[p.speciesId]?.rank;
          
                if (rank !== undefined && rank < minRank) {
                    minRank = rank;
                    minSpeciesId = p.speciesId;
                }
            }
          
            return minSpeciesId !== undefined ? { speciesId: minSpeciesId, rank: minRank } : undefined;
        }

        const glLowestRank = findMinRankAndPokemon(reachablePokemon, rankLists[0]);
        const ulLowestRank = findMinRankAndPokemon(reachablePokemon, rankLists[1]);
        const mlLowestRank = findMinRankAndPokemon(reachablePokemon, rankLists[2]);

        if ((mlLowestRank && !isBadRank(mlLowestRank.rank, trashMaster)) || (glLowestRank && !isBadRank(glLowestRank.rank, 0)) || (ulLowestRank && !isBadRank(ulLowestRank.rank, 0))) {
            return false;
        }

        if (glLowestRank && !isBadRank(glLowestRank.rank, trashGreat) && !needsLessThanFiveAttack(gamemasterPokemon[glLowestRank.speciesId], 0)) {
            return false;
        }

        if (ulLowestRank && !isBadRank(ulLowestRank.rank, trashUltra) && !needsLessThanFiveAttack(gamemasterPokemon[ulLowestRank.speciesId], 1)) {
            return false;
        }

        if (glLowestRank && !isBadRank(glLowestRank.rank, trashGreat) && needsLessThanFiveAttack(gamemasterPokemon[glLowestRank.speciesId], 0)) {
            return true;
        }

        if (ulLowestRank && !isBadRank(ulLowestRank.rank, trashUltra) && needsLessThanFiveAttack(gamemasterPokemon[ulLowestRank.speciesId], 1)) {
            return true;
        }

        return false;
    }

    const isAlwaysBadPokemon = (p: IGamemasterPokemon) => {
        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
        const glLowestRank = Math.min(...reachablePokemon.map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...reachablePokemon.map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...reachablePokemon.map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        
        return isBadRank(glLowestRank, trashGreat) && isBadRank(ulLowestRank, trashUltra) && isBadRank(mlLowestRank, trashMaster);
    }

    if (!fetchCompleted || !pvpFetchCompleted) {
        return <span className="text-color">Fetching Pokémon...</span>;
    }

    type DisambiguatedEntry = {
        dex: number,
        shadow: boolean,
        alolan: boolean,
        galarian: boolean,
        hisuian: boolean,
        paldean: boolean
    }

    const computeStr = () => {
        const dexesWithGoodForms = new Set<number>();
        const potentiallyDeletablePokemon = new Set<number>();
        const pokemonBadWithAttack: Dictionary<DisambiguatedEntry[]> = {};
        const needsDisambiguation = new Set<number>();
        const alwaysBadSet = new Set<number>();
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && !p.isMega)
            .forEach(p => {
                const pEntry: DisambiguatedEntry = {
                    dex: p.dex,
                    shadow: p.isShadow,
                    alolan: p.speciesName.includes("(Alolan)"),
                    galarian: p.speciesName.includes("(Galarian)"),
                    hisuian: p.speciesName.includes("(Hisuian)"),
                    paldean: p.speciesName.includes("(Paldean)")
                };

                if (isAlwaysBadPokemon(p)) {
                    alwaysBadSet.add(p.dex);
                    potentiallyDeletablePokemon.add(p.dex);
                } else {
                    if (isBadWithAttack(p)) {
                        if (alwaysBadSet.has(p.dex)) {
                            needsDisambiguation.add(p.dex);
                        }
                        potentiallyDeletablePokemon.add(p.dex);
                        if (!pokemonBadWithAttack[p.dex]) {
                            pokemonBadWithAttack[p.dex] = [];
                        }
                        pokemonBadWithAttack[p.dex].push(pEntry);
                    } else {
                        dexesWithGoodForms.add(p.dex);
                    }
                }
            });

        let str = "";

        // excluding Pokémon that are potentially deletable if they have at least one form that shouldn't be deleted,
        // because it would be very hard to create an exception in the search string for them.
        const alwaysDeletablePokemon = Array.from(potentiallyDeletablePokemon).filter(d => !dexesWithGoodForms.has(d));
        str += alwaysDeletablePokemon.join(",");

        const terms = new Set<string>();
        alwaysDeletablePokemon.forEach(d => {
            const specificPokemon = pokemonBadWithAttack[d];
            if (specificPokemon) {
                specificPokemon.forEach(b => {
                    let newStr = `&!${b.dex}`;
                    const pokemonNeedsDisambiguation = needsDisambiguation.has(d);
                    if (pokemonNeedsDisambiguation) {
                        if (b.shadow) {
                            newStr += `,!${gameTranslator(GameTranslatorKeys.ShadowSearch, currentGameLanguage)}`;
                        }
                        if (b.hisuian) {
                            newStr += `,!${gameTranslator(GameTranslatorKeys.HisuianSearch, currentGameLanguage)}`;
                        }
                        if (b.alolan) {
                            newStr += `,!${gameTranslator(GameTranslatorKeys.AlolanSearch, currentGameLanguage)}`;
                        }
                        if (b.galarian) {
                            newStr += `,!${gameTranslator(GameTranslatorKeys.GalarianSearch, currentGameLanguage)}`;
                        }
                        if (b.paldean) {
                            newStr += `,!${gameTranslator(GameTranslatorKeys.PaldeanSearch, currentGameLanguage)}`;
                        }
                    }
                    newStr += `,2-${gameTranslator(GameTranslatorKeys.AttackSearch, currentGameLanguage)}`;

                    if (!terms.has(newStr)) {
                        str += newStr;
                        terms.add(newStr);
                    }
                });
            }
        });

        str += `&!4*&!#&!${gameTranslator(GameTranslatorKeys.Legendary, currentGameLanguage)}&!${gameTranslator(GameTranslatorKeys.Mythical, currentGameLanguage)}&!${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage)}${cp}-&!${gameTranslator(GameTranslatorKeys.Favorite, currentGameLanguage)}`;
        return str;
    }

    return (
        <main className="layout">
            <div className="full-height">
                <div className="pokemon-content">
                    <LoadingRenderer errors="" completed={pvpFetchCompleted && fetchCompleted}>
                        <div className="content with-default-top-padding">
                            <div className="extra-ivs-options item default-padding column">
                                <div className="row-flex">
                                    <div>
                                    CP Limit: <select value={cp} onChange={e => setCP(+e.target.value)} className="select-level">
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
                                <div>
                                Top <select value={top} onChange={e => setTop(+e.target.value)} className="select-level">
                                        {Array.from({length: 4096}, (_x, i) => i + 1)
                                            .map(e => (<option key={e} value={e}>{"#" + e}</option>))}
                                </select>
                                </div>
                                </div>
                                <div className="row-flex">
                                <div>
                                <img height={20} width={20} src={`${process.env.PUBLIC_URL}/images/leagues/great.png`}/> Top <select value={trashGreat} onChange={e => setTrashGreat(+e.target.value)} className="select-level">
                                        {Array.from({length: 2000}, (_x, i) => i)
                                            .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                <div>
                                <img height={20} width={20} src={`${process.env.PUBLIC_URL}/images/leagues/ultra.png`}/> Top <select value={trashUltra} onChange={e => setTrashUltra(+e.target.value)} className="select-level">
                                    {Array.from({length: 2000}, (_x, i) => i)
                                        .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                <div>
                                <img height={20} width={20} src={`${process.env.PUBLIC_URL}/images/leagues/master.png`}/> Top <select value={trashMaster} onChange={e => setTrashMaster(+e.target.value)} className="select-level">
                                    {Array.from({length: 2000}, (_x, i) => i)
                                        .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                </div>
                                <div className="row-flex">
                                <div>
                                <img height={20} width={20} className="raid-img-with-contrast" alt="Raids" src={`${process.env.PUBLIC_URL}/images/raid.webp`}/> Top <select value={trashRaid} onChange={e => setTrashRaid(+e.target.value)} className="select-level">
                                        {Array.from({length: 2000}, (_x, i) => i)
                                            .map(e => (<option key={e} value={e}>{e}</option>))}
                                </select>
                                </div>
                                </div>
                            </div>
                            <button className="dark-text main-btn with-big-top-margin" onClick={() => {
                                if (targetRef?.current) {
                                    targetRef.current.value = "Loading data...";
                                    setTimeout(() => {
                                        if (targetRef?.current) {
                                            targetRef.current.value = computeStr();
                                        }
                                    }, 100);
                                }
                            }}>Calculate!</button>
                            <textarea
                                ref={targetRef}
                                className="search-strings-container big-height"
                                readOnly
                                onClick={(e: any) => {e.target.select();
                                    document.execCommand("copy");
                                    alert("Copied to clipboard.");}}
                            />
                        </div>
                    </LoadingRenderer>
                </div>
            </div>
        </main>
    );
}

export default DeleteTrash;