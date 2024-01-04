import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import "./PokemonInfoBanner.scss";
import LeaguePanels from "./LeaguePanels";
import React, { useCallback, useMemo, useState } from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";
import { Effectiveness, computeDPSEntry, computeMoveEffectiveness, fetchReachablePokemonIncludingSelf, getAllChargedMoves } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import LeagueRanks from "./LeagueRanks";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";
import PokemonTypes from "./PokemonTypes";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { PokemonTypes as TypesDTO } from "../DTOs/PokemonTypes";
import translator, { TranslatorKeys } from "../utils/Translator";

interface IPokemonInfoBanner {
    pokemon: IGamemasterPokemon;
    ivPercents: Dictionary<IIvPercents>;
    attack: number;
    setAttack: (_: React.SetStateAction<number>) => void;
    defense: number;
    setDefense: (_: React.SetStateAction<number>) => void;
    hp: number;
    setHP: (_: React.SetStateAction<number>) => void;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
    level: number;
}

export interface IIvPercents {
    greatLeagueRank: number,
    greatLeagueLvl: number,
    greatLeagueCP: number,
    greatLeagueAttack: number,
    greatLeagueDefense: number,
    greatLeagueHP: number,
    greatLeaguePerfect: any,
    greatLeaguePerfectLevel: number,
    greatLeaguePerfectCP: number,
    ultraLeagueRank: number,
    ultraLeagueLvl: number,
    ultraLeagueCP: number,
    ultraLeagueAttack: number,
    ultraLeagueDefense: number,
    ultraLeagueHP: number,
    ultraLeaguePerfect: any,
    ultraLeaguePerfectLevel: number,
    ultraLeaguePerfectCP: number,
    masterLeagueRank: number,
    masterLeagueLvl: number,
    masterLeagueCP: number,
    masterLeagueAttack: number,
    masterLeagueDefense: number,
    masterLeagueHP: number,
    masterLeaguePerfect: any,
    masterLeaguePerfectLevel: number,
    masterLeaguePerfectCP: number,
    customLeagueRank: number,
    customLeagueLvl: number,
    customLeagueCP: number,
    customLeagueAttack: number,
    customLeagueDefense: number,
    customLeagueHP: number,
    customLeaguePerfect: any,
    customLeaguePerfectLevel: number,
    customLeaguePerfectCP: number
}

export type dpsEntry = {
    fastMoveId: string;
    chargedMoveId: string;
    dps: number;
    speciesId: string;
}

const PokemonInfoBanner = ({pokemon, ivPercents, attack, setAttack, defense, setDefense, hp, setHP, league, handleSetLeague, level}: IPokemonInfoBanner) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gameTranslationFetchCompleted} = useGameTranslation();

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {moves, movesFetchCompleted} = useMoves();

    const [currentBestReachableGreatLeagueIndex, setCurrentBestReachableGreatLeagueIndex] = useState(0);
    const [currentBestReachableUltraLeagueIndex, setCurrentBestReachableUltraLeagueIndex] = useState(0);
    const [currentBestReachableMasterLeagueIndex, setCurrentBestReachableMasterLeagueIndex] = useState(0);
    const [currentBestReachableCustomLeagueIndex, setCurrentBestReachableCustomLeagueIndex] = useState(0);
    const [currentBestReachableRaidLeagueIndex, setCurrentBestReachableRaidLeagueIndex] = useState(0);

    const rankOnlyFilteredTypePokemon = false; //TODO: connect to settings

    const resourcesNotReady = !fetchCompleted || !pokemon || !pvpFetchCompleted || !movesFetchCompleted || !gameTranslationFetchCompleted || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0;

    const typeFilter = useCallback((p: IGamemasterPokemon, forcedType: string) => {
        if (resourcesNotReady) {
            return false;
        }

        if (!forcedType) {
            return true;
        }

        if (rankOnlyFilteredTypePokemon) {
            if (!p.types.map(t => t.toString().toLocaleLowerCase()).includes(forcedType.toLocaleLowerCase())) {
                return false;
            }
        }

        return getAllChargedMoves(p, moves).some(m => moves[m].type === forcedType);
    }, [rankOnlyFilteredTypePokemon, moves, resourcesNotReady]);

    const computeComparisons = useCallback((forcedType = "") => {
        if (resourcesNotReady) {
            return [];
        }

        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && typeFilter(p, forcedType))
            .forEach(p => comparisons.push(computeDPSEntry(p, moves, 15, 100, forcedType)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }, [gamemasterPokemon, typeFilter, resourcesNotReady, moves]);

    const getSortedRaidReachableVersions = useCallback((comparisons: dpsEntry[]) => {
        if (resourcesNotReady) {
            return [];
        }
        const reachableExcludingMega = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
        const mega = pokemon.isMega || pokemon.isShadow ? [] : Object.values(gamemasterPokemon).filter(p => !p.aliasId && Array.from(reachableExcludingMega).map(pk => pk.dex).includes(p.dex) && p.isMega);

        const allPokemon = [...reachableExcludingMega, ...mega];

        const sortedPokemon = allPokemon.sort((a, b) => {
            const dpsA = comparisons.find(c => c.speciesId === a.speciesId)?.dps ?? 0;
            const dpsB = comparisons.find(c => c.speciesId === b.speciesId)?.dps ?? 0;
            return dpsB - dpsA;
        });

        return sortedPokemon.map(p => p.speciesId);
    }, [gamemasterPokemon, pokemon, resourcesNotReady]);

    //TODO: make this an async service or context provider...
    const globalComparisons = useMemo(() => computeComparisons(), [computeComparisons]);
    const orderedRaidVersions = useMemo(() => !resourcesNotReady ? getSortedRaidReachableVersions(globalComparisons) : [], [globalComparisons, getSortedRaidReachableVersions, resourcesNotReady]);
    const bestReachable = useMemo(() => !resourcesNotReady ? gamemasterPokemon[orderedRaidVersions[currentBestReachableRaidLeagueIndex]] : undefined, [gamemasterPokemon, orderedRaidVersions, resourcesNotReady, currentBestReachableRaidLeagueIndex]);
    
    const allChargedMoveTypes = useMemo(() => resourcesNotReady ? [] : Array.from(new Set(getAllChargedMoves(bestReachable as IGamemasterPokemon, moves).map(m => moves[m].type))), [bestReachable, moves, resourcesNotReady]);
    
    type ranksDicDTO = {
        rank: number,
        dps: number
    }

    const ranksComputation = useMemo(() => {
        if (resourcesNotReady) {
            return {};
        }

        const ranksDic: Dictionary<ranksDicDTO> = {};
    
        allChargedMoveTypes.filter(t => t !== "normal").forEach(t => {
            const comps = computeComparisons(t);
            const idx = comps.findIndex(c => c.speciesId === bestReachable!.speciesId);
            ranksDic[t] = {
                rank: idx + 1,
                dps: computeDPSEntry(bestReachable as IGamemasterPokemon, moves, attack, (level - 1) * 2, t, undefined, [comps[idx].fastMoveId, comps[idx].chargedMoveId]).dps//comps[idx].dps
            };
        });

        return ranksDic;
    }, [allChargedMoveTypes, computeComparisons, bestReachable, resourcesNotReady, attack, level, moves]);

    const mostRelevantType = Object.entries(ranksComputation)
        .sort(([typeA, rankA], [typeB, rankB]) => {
            if (typeA === "normal") {
                return 1;
            }
            if (typeB === "normal") {
                return -1;
            }
            return rankA.rank - rankB.rank;
        })
        .slice(0, 3)
        .map(([type, rank]) => ({type: type, rank: rank}));
    
    const rank = useMemo(() => resourcesNotReady ? 0 : globalComparisons.findIndex(c => c.speciesId === bestReachable!.speciesId) + 1, [globalComparisons, bestReachable, resourcesNotReady]);
    
    const selfRealDPS = useMemo(() => resourcesNotReady ? {fastMoveId: "", chargedMoveId: "", speciesId: "", dps: 0} : computeDPSEntry(bestReachable as IGamemasterPokemon, moves, attack, (level - 1) * 2), [bestReachable, attack, level, moves, resourcesNotReady]);

    if (resourcesNotReady) {
        return <></>;
    }
    
    const reachablePokemons = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);

    const leagueSorter = (reachablePokemons: Set<IGamemasterPokemon>, leagueIndex: number) => {
        return Array.from(reachablePokemons)
            .filter(p => p.speciesId === pokemon.speciesId || rankLists[leagueIndex][p.speciesId]?.rank)
            .sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => {
                const aRank = rankLists[leagueIndex][a.speciesId]?.rank;
                const bRank = rankLists[leagueIndex][b.speciesId]?.rank;
                if (!aRank && bRank) {
                    return 1;
                }
                if (aRank && !bRank) {
                    return -1;
                }
                if (!aRank && !bRank) {
                    return b.speciesId.localeCompare(a.speciesId);
                }
                return aRank - bRank;
            });
    }

    const allSortedReachableGreatLeaguePokemon = leagueSorter(reachablePokemons, 0);
    
    const allSortedReachableUltraLeaguePokemon = leagueSorter(reachablePokemons, 1);
    
    const allSortedReachableMasterLeaguePokemon = leagueSorter(reachablePokemons, 2);
    
    const allSortedReachableCustomLeaguePokemon = rankLists[3] ? leagueSorter(reachablePokemons, 3) : [];

    //TODO: these fallbacks shouldn't be needed... Need to refactor every async resource from the custom hooks.
    const bestInFamilyForGreatLeague = allSortedReachableGreatLeaguePokemon[currentBestReachableGreatLeagueIndex] ?? pokemon;
    const bestInFamilyForUltraLeague = allSortedReachableUltraLeaguePokemon[currentBestReachableUltraLeagueIndex] ?? pokemon;
    const bestInFamilyForMasterLeague = allSortedReachableMasterLeaguePokemon[currentBestReachableMasterLeagueIndex] ?? pokemon;
    const bestInFamilyForCustomLeague = allSortedReachableCustomLeaguePokemon[currentBestReachableCustomLeagueIndex] ?? pokemon;

    const indexedBests = [bestInFamilyForGreatLeague, bestInFamilyForUltraLeague, bestInFamilyForMasterLeague, bestInFamilyForCustomLeague];

    const bestReachableGreatLeagueIvs = ivPercents[bestInFamilyForGreatLeague.speciesId];
    const bestReachableUltraLeagueIvs = ivPercents[bestInFamilyForUltraLeague.speciesId];
    const bestReachableMasterLeagueIvs = ivPercents[bestInFamilyForMasterLeague.speciesId];
    const bestReachableCustomLeagueIvs = ivPercents[bestInFamilyForCustomLeague.speciesId];

    const computeEffectiveness = (effectiveness: Effectiveness) => Array.from(Object.keys(TypesDTO).filter(k => isNaN(+k) && (Math.round(1000000 * computeMoveEffectiveness(k.toLocaleLowerCase(), pokemon.types[0].toString().toLocaleLowerCase(), pokemon.types[1] ? pokemon.types[1].toString().toLocaleLowerCase() : undefined)) / 1000000) === effectiveness));
    const effective = computeEffectiveness(Effectiveness.Effective);
    const superEffective = computeEffectiveness(Effectiveness.DoubleEffective);
    const resistance = computeEffectiveness(Effectiveness.Resistance);
    const superResistance = computeEffectiveness(Effectiveness.DoubleResistance);

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

    const handleListEntryClick = (newLeague: LeagueType) => {
        if (league === newLeague) {
            switch (newLeague) {
                case LeagueType.GREAT_LEAGUE:
                    setCurrentBestReachableGreatLeagueIndex(p => (p + 1) % allSortedReachableGreatLeaguePokemon.length);
                    break;
                case LeagueType.ULTRA_LEAGUE:
                    setCurrentBestReachableUltraLeagueIndex(p => (p + 1) % allSortedReachableUltraLeaguePokemon.length);
                    break;
                case LeagueType.MASTER_LEAGUE:
                    setCurrentBestReachableMasterLeagueIndex(p => (p + 1) % allSortedReachableMasterLeaguePokemon.length);
                    break;
                case LeagueType.CUSTOM_CUP:
                    setCurrentBestReachableCustomLeagueIndex(p => (p + 1) % allSortedReachableCustomLeaguePokemon.length);
                    break;
                case LeagueType.RAID:
                    setCurrentBestReachableRaidLeagueIndex(p => (p + 1) % orderedRaidVersions.length);
                    break;
            }
        } else {
            setCurrentBestReachableGreatLeagueIndex(0);
            setCurrentBestReachableUltraLeagueIndex(0);
            setCurrentBestReachableMasterLeagueIndex(0);
            setCurrentBestReachableCustomLeagueIndex(0);
            setCurrentBestReachableRaidLeagueIndex(0);
            handleSetLeague(newLeague);
        }
    }

    if (([...superEffective, ...effective].length > 6 && [...superResistance, ...resistance].length > 6) || [...superResistance, ...resistance].length > 12 || [...superEffective, ...effective].length > 12) {
        alert("debug: Too many effectivenesses and resistances. Layout is broken.");
    }

    return <div className="banner_layout">
        <div className="pokemon_with_ivs">
            <div className="item aligned">
                <LeagueRanks
                    greatLeagueStats={
                        {
                            leagueTitle: "great",
                            bestReachablePokemon: bestInFamilyForGreatLeague,
                            pokemonRankInLeague: ordinal(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.rank)
                        }
                    }
                    ultraLeagueStats={
                        {
                            leagueTitle: "ultra",
                            bestReachablePokemon: bestInFamilyForUltraLeague,
                            pokemonRankInLeague: ordinal(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.rank)
                        }
                    }
                    masterLeagueStats={
                        {
                            leagueTitle: "master",
                            bestReachablePokemon: bestInFamilyForMasterLeague,
                            pokemonRankInLeague: ordinal(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.rank)
                        }
                    }
                    customLeagueStats={
                        {
                            leagueTitle: "custom",
                            bestReachablePokemon: bestInFamilyForCustomLeague,
                            pokemonRankInLeague: ordinal(rankLists[3] ? rankLists[3][bestInFamilyForCustomLeague.speciesId]?.rank : 0)
                        }
                    }
                    raidsStats={
                        {
                            leagueTitle: "raid",
                            bestReachablePokemon: bestReachable as IGamemasterPokemon,
                            pokemonRankInLeague: ordinal(rank)
                        }
                    }
                    league={league}
                    handleSetLeague={handleListEntryClick}
                />
            </div>
                <AppraisalBar
                    attack = {attack}
                    setAttack={setAttack}
                    defense={defense}
                    setDefense={setDefense}
                    hp={hp}
                    setHP={setHP}
                />
                    <LeaguePanels
                        league={league}
                        level={level}
                        atk={attack}
                        def={defense}
                        hp={hp}
                        isShadow={pokemon.isShadow}
                        greatLeagueStats={
                            {
                                leagueTitle: "great",
                                bestReachablePokemonName: bestInFamilyForGreatLeague.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableGreatLeagueIvs.greatLeagueRank),
                                pokemonLeaguePercentile: bestReachableGreatLeagueIvs.greatLeagueRank + 1,
                                pokemonCP: bestReachableGreatLeagueIvs.greatLeagueCP,
                                pokemonLevel: bestReachableGreatLeagueIvs.greatLeagueLvl,
                                atk: bestReachableGreatLeagueIvs.greatLeaguePerfect.A,
                                def: bestReachableGreatLeagueIvs.greatLeaguePerfect.D,
                                hp: bestReachableGreatLeagueIvs.greatLeaguePerfect.S,
                                bestCP: bestReachableGreatLeagueIvs.greatLeaguePerfectCP,
                                bestLevel: bestReachableGreatLeagueIvs.greatLeaguePerfectLevel
                            }
                        }
                        ultraLeagueStats={
                            {
                                leagueTitle: "ultra",
                                bestReachablePokemonName: bestInFamilyForUltraLeague.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableUltraLeagueIvs.ultraLeagueRank),
                                pokemonLeaguePercentile: bestReachableUltraLeagueIvs.ultraLeagueRank + 1,
                                pokemonCP: bestReachableUltraLeagueIvs.ultraLeagueCP,
                                pokemonLevel: bestReachableUltraLeagueIvs.ultraLeagueLvl,
                                atk: bestReachableUltraLeagueIvs.ultraLeaguePerfect.A,
                                def: bestReachableUltraLeagueIvs.ultraLeaguePerfect.D,
                                hp: bestReachableUltraLeagueIvs.ultraLeaguePerfect.S,
                                bestCP: bestReachableUltraLeagueIvs.ultraLeaguePerfectCP,
                                bestLevel: bestReachableUltraLeagueIvs.ultraLeaguePerfectLevel
                            }
                        }
                        masterLeagueStats={
                            {
                                leagueTitle: "master",
                                bestReachablePokemonName: bestInFamilyForMasterLeague.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableMasterLeagueIvs.masterLeagueRank),
                                pokemonLeaguePercentile: bestReachableMasterLeagueIvs.masterLeagueRank + 1,
                                pokemonCP: bestReachableMasterLeagueIvs.masterLeagueCP,
                                pokemonLevel: bestReachableMasterLeagueIvs.masterLeagueLvl,
                                atk: bestReachableMasterLeagueIvs.masterLeaguePerfect.A,
                                def: bestReachableMasterLeagueIvs.masterLeaguePerfect.D,
                                hp: bestReachableMasterLeagueIvs.masterLeaguePerfect.S,
                                bestCP: bestReachableMasterLeagueIvs.masterLeaguePerfectCP,
                                bestLevel: bestReachableMasterLeagueIvs.masterLeaguePerfectLevel
                            }
                        }
                        customLeagueStats={
                            {
                                leagueTitle: "custom",
                                bestReachablePokemonName: bestInFamilyForCustomLeague.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableCustomLeagueIvs.customLeagueRank),
                                pokemonLeaguePercentile: bestReachableCustomLeagueIvs.customLeagueRank + 1,
                                pokemonCP: bestReachableCustomLeagueIvs.customLeagueCP,
                                pokemonLevel: bestReachableCustomLeagueIvs.customLeagueLvl,
                                atk: bestReachableCustomLeagueIvs.customLeaguePerfect.A,
                                def: bestReachableCustomLeagueIvs.customLeaguePerfect.D,
                                hp: bestReachableCustomLeagueIvs.customLeaguePerfect.S,
                                bestCP: bestReachableCustomLeagueIvs.customLeaguePerfectCP,
                                bestLevel: bestReachableCustomLeagueIvs.customLeaguePerfectLevel
                            }
                        }
                        raidStats={
                            {
                                bestReachablePokemonName: (bestReachable as IGamemasterPokemon).speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
                                rank: rank,
                                dps: selfRealDPS.dps,
                                typeRanks: mostRelevantType.map(t => ({
                                    type: (t.type.substring(0, 1).toLocaleUpperCase() + t.type.substring(1)) as keyof typeof PokemonTypes,
                                    rank: t.rank.rank,
                                    dps: t.rank.dps
                                }))
                            }
                        }
                        unranked={rankLists[league] && indexedBests[league] && !rankLists[league][indexedBests[league].speciesId]?.rank ? true : false}
                    />
                    <div className="with-computed-min-height item default-padding adjusting-font-size">
                        <div className="full-height type-effectiveness-distribution">
                            <div className="with-shadow aligned column-display gapped unjustified">
                                <div className="pvp-entry full-width smooth with-border fitting-content gapped"><strong>{translator(TranslatorKeys.Weak, currentLanguage)}:</strong></div>
                                
                                <div className="max-width aligned full-height">
                                    <div className="overflowing">
                                        <div className="types-family no-padding">
                                            {[...superEffective, ...effective].length > 0 ? [...superEffective, ...effective]
                                            .map(t => (
                                                <div key = {t}>
                                                    <strong className={`move-detail ${superEffective.includes(t) ? "special-item" : ""} soft family-padding item`}>
                                                        {superEffective.includes(t) && <sub className="special-overlay">2x</sub>}
                                                        <div className="img-padding"><img height={20} width={20} alt="type" src={`${process.env.PUBLIC_URL}/images/types/${t.toLocaleLowerCase()}.png`}/></div>
                                                    </strong>
                                                </div>
                                            )) : <sub className="weighted-font">{translator(TranslatorKeys.Nothing, currentLanguage)}</sub>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="with-shadow aligned column-display gapped unjustified">
                                <div className="pvp-entry full-width smooth with-border fitting-content gapped"><strong>{translator(TranslatorKeys.Resistant, currentLanguage)}:</strong></div>
                                <div className="max-width aligned full-height">
                                    <div className="overflowing">
                                        <div className="types-family no-padding">
                                            {[...superResistance, ...resistance].length > 0 ? [...superResistance, ...resistance]
                                            .map(t => (
                                                <div key = {t}>
                                                    <strong className={`move-detail ${superResistance.includes(t) ? "special-item" : ""} soft family-padding item`}>
                                                        {superResistance.includes(t) && <sub className="special-overlay">2x</sub>}
                                                        <div className="img-padding"><img height={20} width={20} alt="type" src={`${process.env.PUBLIC_URL}/images/types/${t.toLocaleLowerCase()}.png`}/></div>
                                                    </strong>
                                                </div>
                                            )) : <sub className="weighted-font">{translator(TranslatorKeys.Nothing, currentLanguage)}</sub>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    </div>;
}

export default PokemonInfoBanner;