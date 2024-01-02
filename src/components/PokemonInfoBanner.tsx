import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import "./PokemonInfoBanner.scss";
import LeaguePanels from "./LeaguePanels";
import React, { useCallback, useMemo } from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";
import { computeDPSEntry, fetchReachablePokemonIncludingSelf, getAllChargedMoves } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import LeagueRanks from "./LeagueRanks";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";
import PokemonTypes from "./PokemonTypes";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";

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
    const {currentGameLanguage} = useLanguage();
    const {gameTranslationFetchCompleted} = useGameTranslation();

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists} = usePvp();
    const {moves} = useMoves();

    const rankOnlyFilteredTypePokemon = false; //TODO: connect to settings

    const typeFilter = useCallback((p: IGamemasterPokemon, forcedType: string) => {
        if (!forcedType) {
            return true;
        }

        if (rankOnlyFilteredTypePokemon) {
            if (!p.types.map(t => t.toString().toLocaleLowerCase()).includes(forcedType.toLocaleLowerCase())) {
                return false;
            }
        }

        return getAllChargedMoves(p, moves).some(m => moves[m].type === forcedType);
    }, [rankOnlyFilteredTypePokemon, moves]);

    const resourcesNotReady = !fetchCompleted || !pokemon || !gameTranslationFetchCompleted || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0;

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

    const getBestReachableVersion = useCallback((comparisons: dpsEntry[]) => {
        const reachableExcludingMega = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
        const mega = pokemon.isMega ? [] : Object.values(gamemasterPokemon).filter(p => !p.aliasId && Array.from(reachableExcludingMega).map(pk => pk.dex).includes(p.dex) && p.isMega);

        const allPokemon = [...reachableExcludingMega, ...mega];

        const sortedPokemon = allPokemon.sort((a, b) => {
            const dpsA = comparisons.find(c => c.speciesId === a.speciesId)?.dps ?? 0;
            const dpsB = comparisons.find(c => c.speciesId === b.speciesId)?.dps ?? 0;
            return dpsB - dpsA;
        });

        return sortedPokemon[0].speciesId;
    }, [gamemasterPokemon, pokemon]);

    //TODO: make this an async service or context provider...
    const globalComparisons = useMemo(() => computeComparisons(), [computeComparisons]);
    const bestReachable = useMemo(() => !resourcesNotReady ? gamemasterPokemon[getBestReachableVersion(globalComparisons)] : undefined, [gamemasterPokemon, globalComparisons, getBestReachableVersion, resourcesNotReady]);

    const allChargedMoveTypes = useMemo(() => resourcesNotReady ? [] : Array.from(new Set(getAllChargedMoves(bestReachable as IGamemasterPokemon, moves).map(m => moves[m].type))), [bestReachable, moves, resourcesNotReady]);
    
    const ranksComputation = useMemo(() => {
        if (resourcesNotReady) {
            return {};
        }

        const ranksDic: Dictionary<number> = {};
    
        allChargedMoveTypes.filter(t => t !== "normal").forEach(t => ranksDic[t] = computeComparisons(t).findIndex(c => c.speciesId === bestReachable!.speciesId) + 1);

        return ranksDic;
    }, [allChargedMoveTypes, computeComparisons, bestReachable, resourcesNotReady]);

    const mostRelevantType = Object.entries(ranksComputation)
        .sort(([typeA, rankA], [typeB, rankB]) => {
            if (typeA === "normal") {
                return 1;
            }
            if (typeB === "normal") {
                return -1;
            }
            return rankA - rankB;
        })
        .slice(0, 3)
        .map(([type, rank]) => ({type: type, rank: rank}));
    
    const rank = useMemo(() => resourcesNotReady ? 0 : globalComparisons.findIndex(c => c.speciesId === bestReachable!.speciesId) + 1, [globalComparisons, bestReachable, resourcesNotReady]);
    
    const selfRealDPS = useMemo(() => resourcesNotReady ? {fastMoveId: "", chargedMoveId: "", speciesId: "", dps: 0} : computeDPSEntry(bestReachable as IGamemasterPokemon, moves, attack, (level - 1) * 2), [bestReachable, attack, level, moves, resourcesNotReady]);

    if (resourcesNotReady) {
        return <></>;
    }

    let bestInFamilyForGreatLeague = pokemon;
    let bestInFamilyForGreatLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForUltraLeague = pokemon;
    let bestInFamilyForUltraLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForMasterLeague = pokemon;
    let bestInFamilyForMasterLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForCustomLeague = pokemon;
    let bestInFamilyForCustomLeagueRank = Number.MAX_VALUE;

    const reachablePokemons = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);

    reachablePokemons.forEach(member => {
        const rankInGreat = rankLists[0][member.speciesId]?.rank;
        const rankInUltra = rankLists[1][member.speciesId]?.rank;
        const rankInMaster = rankLists[2][member.speciesId]?.rank;
        const rankInCustom = rankLists[3] ? rankLists[3][member.speciesId]?.rank : 0;
        if (!isNaN(rankInGreat) && rankInGreat < bestInFamilyForGreatLeagueRank) {
            bestInFamilyForGreatLeagueRank = rankInGreat;
            bestInFamilyForGreatLeague = member;
        }
        if (!isNaN(rankInUltra) && rankInUltra < bestInFamilyForUltraLeagueRank) {
            bestInFamilyForUltraLeagueRank = rankInUltra;
            bestInFamilyForUltraLeague = member;
        }
        if (!isNaN(rankInMaster) && rankInMaster < bestInFamilyForMasterLeagueRank) {
            bestInFamilyForMasterLeagueRank = rankInMaster;
            bestInFamilyForMasterLeague = member;
        }
        if (!isNaN(rankInCustom) && rankInCustom < bestInFamilyForCustomLeagueRank) {
            bestInFamilyForCustomLeagueRank = rankInCustom;
            bestInFamilyForCustomLeague = member;
        }
    });

    const bestReachableGreatLeagueIvs = ivPercents[bestInFamilyForGreatLeague.speciesId];
    const bestReachableUltraLeagueIvs = ivPercents[bestInFamilyForUltraLeague.speciesId];
    const bestReachableMasterLeagueIvs = ivPercents[bestInFamilyForMasterLeague.speciesId];
    const bestReachableCustomLeagueIvs = ivPercents[bestInFamilyForCustomLeague.speciesId];

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

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
                    handleSetLeague={handleSetLeague}
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
                                    rank: t.rank
                                }))
                            }
                        }
                    />
            </div>
    </div>;
}

export default PokemonInfoBanner;