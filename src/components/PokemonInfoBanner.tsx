import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import "./PokemonInfoBanner.scss";
import LeaguePanels from "./LeaguePanels";
import React, { useEffect, useMemo, useState } from "react";
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
import { useRaidRanker } from "../contexts/raid-ranker-context";

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

type ranksDicDTO = {
    rank: number,
    dps: number
}

const PokemonInfoBanner = ({pokemon, ivPercents, attack, setAttack, defense, setDefense, hp, setHP, league, handleSetLeague, level}: IPokemonInfoBanner) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gameTranslationFetchCompleted} = useGameTranslation();

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {moves, movesFetchCompleted} = useMoves();
    const [bestReachableRaidVersion, setBestReachableRaidVersion] = useState<IGamemasterPokemon | undefined>(undefined);
    const { raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted } = useRaidRanker();

    const allRelevantChargedMoveTypes = useMemo(() => {
        if (!fetchCompleted || !movesFetchCompleted || !bestReachableRaidVersion) {
            return [];
        }

        return Array.from(new Set(getAllChargedMoves(bestReachableRaidVersion, moves, gamemasterPokemon).map(m => moves[m].type)))
            .filter(t => t !== "normal")
            .map(t => (t.substring(0, 1).toLocaleUpperCase() + t.substring(1).toLocaleLowerCase()) as unknown as TypesDTO);
    }, [fetchCompleted, movesFetchCompleted, bestReachableRaidVersion, moves, gamemasterPokemon]);

    const ranksComputation = useMemo(() => {
        if (!fetchCompleted || !movesFetchCompleted || !bestReachableRaidVersion || !raidRankerFetchCompleted(allRelevantChargedMoveTypes)) {
            return {};
        }

        const ranksDic: Dictionary<ranksDicDTO> = {};
    
        allRelevantChargedMoveTypes
            .map(t => t.toString().toLocaleLowerCase())
            .forEach(t => {
                const typeCollection = raidDPS[t];
                //todo: make rank part of the obj. it's safer, but not quicker...
                const idx = Object.keys(typeCollection).indexOf(bestReachableRaidVersion.speciesId);
                const dpsEntry = typeCollection[bestReachableRaidVersion.speciesId];
                ranksDic[t] = {
                    rank: idx + 1,
                    dps: computeDPSEntry(bestReachableRaidVersion, gamemasterPokemon, moves, !bestReachableRaidVersion.isShadow && pokemon.isShadow ? Math.min(15, attack + 2) : attack, (level - 1) * 2, t, undefined, [dpsEntry.fastMove, dpsEntry.chargedMove]).dps
                };
            });

        return ranksDic;
    }, [fetchCompleted, raidRankerFetchCompleted, movesFetchCompleted, allRelevantChargedMoveTypes, raidDPS, bestReachableRaidVersion, attack, level, moves, gamemasterPokemon, pokemon]);
    
    useEffect(() => {
        setTimeout(() => {
            const typeArray = allRelevantChargedMoveTypes.length === 0 ? undefined : allRelevantChargedMoveTypes;

            if (!fetchCompleted || !movesFetchCompleted || raidRankerFetchCompleted(typeArray)) {
                return;
            }
    
            computeRaidRankerforTypes(gamemasterPokemon, moves, typeArray);
        }, 0);
    }, [fetchCompleted, movesFetchCompleted, gamemasterPokemon, moves, computeRaidRankerforTypes, raidRankerFetchCompleted, allRelevantChargedMoveTypes]);

    const resourcesNotReady = !raidRankerFetchCompleted(allRelevantChargedMoveTypes.length === 0 ? undefined : allRelevantChargedMoveTypes) || !bestReachableRaidVersion || !fetchCompleted || !pokemon || !pvpFetchCompleted || !movesFetchCompleted || !gameTranslationFetchCompleted || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0;

    const [currentBestReachableGreatLeagueIndex, setCurrentBestReachableGreatLeagueIndex] = useState(0);
    const [currentBestReachableUltraLeagueIndex, setCurrentBestReachableUltraLeagueIndex] = useState(0);
    const [currentBestReachableMasterLeagueIndex, setCurrentBestReachableMasterLeagueIndex] = useState(0);
    const [currentBestReachableCustomLeagueIndex, setCurrentBestReachableCustomLeagueIndex] = useState(0);
    const [currentBestReachableRaidLeagueIndex, setCurrentBestReachableRaidLeagueIndex] = useState(0);

    const allReachableRaidPokemon = useMemo(() => {
        if (!fetchCompleted) {
            return [pokemon];
        }
        
        const reachableExcludingMega = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);

        const exclusions = ["slowbro_galarian", "slowpoke_galarian"];

        const mega = pokemon.isMega || exclusions.includes(pokemon.speciesId) ? [] : Object.values(gamemasterPokemon).filter(p => !p.aliasId && Array.from(reachableExcludingMega).map(pk => pk.dex).includes(p.dex) && p.isMega);

        return [...reachableExcludingMega, ...mega];
    }, [pokemon, gamemasterPokemon, fetchCompleted]);

    useEffect(() => {
        setTimeout(() => {
            if (!fetchCompleted || !movesFetchCompleted || !raidRankerFetchCompleted()) {
                return;
            }
            
            const sortedPokemon = [...allReachableRaidPokemon].sort((a, b) => {
                const dpsA = raidDPS[""][a.speciesId].dps;
                const dpsB = raidDPS[""][b.speciesId].dps;
                return dpsB - dpsA;
            });
    
            setBestReachableRaidVersion(sortedPokemon[currentBestReachableRaidLeagueIndex]);
        }, 0);
    }, [fetchCompleted, allReachableRaidPokemon, movesFetchCompleted, gamemasterPokemon, pokemon, raidDPS, raidRankerFetchCompleted, setBestReachableRaidVersion, currentBestReachableRaidLeagueIndex]);

    const mostRelevantType = Object.entries(ranksComputation)
        .sort(([, rankA], [, rankB]) => {
            return rankA.rank - rankB.rank;
        })
        .slice(0, 3)
        .map(([type, rank]) => ({type: type, rank: rank}));
    
    const rank = useMemo(() => {
        if (!fetchCompleted || !movesFetchCompleted || !bestReachableRaidVersion || !raidRankerFetchCompleted()) {
            return 0;
        }

        return Object.entries(raidDPS[""])
            .findIndex(([speciesId]) => speciesId === bestReachableRaidVersion.speciesId) + 1;
    }, [raidDPS, bestReachableRaidVersion, fetchCompleted, movesFetchCompleted, raidRankerFetchCompleted]);
    
    const selfRealDPS = useMemo(() => {
        if (!fetchCompleted || !movesFetchCompleted || !bestReachableRaidVersion) {
            return {fastMoveId: "", chargedMoveId: "", speciesId: "", dps: 0};
        }

        return computeDPSEntry(bestReachableRaidVersion, gamemasterPokemon, moves, !bestReachableRaidVersion.isShadow && pokemon.isShadow ? Math.min(15, attack + 2) : attack, (level - 1) * 2);
    }, [bestReachableRaidVersion, attack, level, moves, gamemasterPokemon, fetchCompleted, movesFetchCompleted, pokemon]);

    if (resourcesNotReady) {
        return <span className="centered">{translator(TranslatorKeys.Loading, currentLanguage)}</span>;
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

    const computeEffectiveness = (effectiveness: Effectiveness) => Array.from(Object.keys(TypesDTO).filter(k => isNaN(+k) && (Math.round(1000000000 * computeMoveEffectiveness(k.toLocaleLowerCase(), pokemon.types[0].toString().toLocaleLowerCase(), pokemon.types[1] ? pokemon.types[1].toString().toLocaleLowerCase() : undefined)) / 1000000000) === effectiveness));
    const effective = computeEffectiveness(Effectiveness.Effective);
    const superEffective = computeEffectiveness(Effectiveness.DoubleEffective);
    const resistance = computeEffectiveness(Effectiveness.Resistance);
    const superResistance = computeEffectiveness(Effectiveness.DoubleResistance);
    const tripleResistance = computeEffectiveness(Effectiveness.DoubleResistance * Effectiveness.Resistance);

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
                    setCurrentBestReachableRaidLeagueIndex(p => (p + 1) % allReachableRaidPokemon.length);
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
                            bestReachablePokemon: bestReachableRaidVersion as IGamemasterPokemon || pokemon,
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
                                bestIsShadow: bestInFamilyForGreatLeague.isShadow,
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
                                bestIsShadow: bestInFamilyForUltraLeague.isShadow,
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
                                bestIsShadow: bestInFamilyForMasterLeague.isShadow,
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
                                bestIsShadow: bestInFamilyForCustomLeague.isShadow,
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
                                bestReachablePokemonName: ((bestReachableRaidVersion as IGamemasterPokemon) ?? pokemon).speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
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
                                    <div className="full-width">
                                        <div className="types-family no-padding">
                                            {[...superEffective, ...effective].length > 0 ? [...superEffective, ...effective]
                                            .map(t => (
                                                <div key = {t}>
                                                    <strong className={`move-detail ${superEffective.includes(t) ? "special-item" : ""} relative soft family-padding item`}>
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
                                    <div className="full-width">
                                        <div className="types-family no-padding">
                                            {[...tripleResistance, ...superResistance, ...resistance].length > 0 ? [...tripleResistance, ...superResistance, ...resistance]
                                            .map(t => (
                                                <div key = {t}>
                                                    <strong className={`move-detail ${tripleResistance.includes(t)  ? "triple-item" : superResistance.includes(t) ? "special-item" : ""} relative soft family-padding item`}>
                                                        {superResistance.includes(t) && <sub className="special-overlay">2x</sub>}
                                                        {tripleResistance.includes(t) && <sub className="special-overlay triple-overlay">3x</sub>}
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