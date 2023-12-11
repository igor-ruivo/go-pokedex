import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import "./PokemonInfoBanner.scss";
import { useState } from "react";
import LeaguePanels from "./LeaguePanels";
import React from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";
import { fetchReachablePokemonIncludingSelf } from "../utils/pokemon-helper";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import PokemonInfoImagePlaceholder from "./PokemonInfoImagePlaceholder";
import LeagueRanks from "./LeagueRanks";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";
import { IGameMasterMove } from "../DTOs/IGameMasterMove";

interface IPokemonInfoBanner {
    pokemon: IGamemasterPokemon;
    ivPercents: Dictionary<IIvPercents>;
    levelCap: number;
    setLevelCap: React.Dispatch<React.SetStateAction<number>>;
    attack: number;
    setAttack: (_: React.SetStateAction<number>) => void;
    defense: number;
    setDefense: (_: React.SetStateAction<number>) => void;
    hp: number;
    setHP: (_: React.SetStateAction<number>) => void;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
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

const PokemonInfoBanner = ({pokemon, ivPercents, levelCap, setLevelCap, attack, setAttack, defense, setDefense, hp, setHP, league, handleSetLeague}: IPokemonInfoBanner) => {
    const [displayLevel, setDisplayLevel] = useState(levelCap);
    const {currentLanguage} = useLanguage();
    const {gameTranslation, gameTranslationFetchCompleted} = useGameTranslation();
    const selectedImageRef = React.createRef<HTMLImageElement>();

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists} = usePvp();
    const {moves} = useMoves();

    if (!fetchCompleted || !pokemon || !gameTranslationFetchCompleted || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0) {
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
        const rankInCustom = rankLists[3][member.speciesId]?.rank;
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

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];
    const customLeagueMoveset = rankLists[3][pokemon.speciesId]?.moveset ?? [];

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

    const translatedMove = (move: IGameMasterMove) => {
        if (!move) {
            return "";
        }

        if (!move.vId) {
            console.log(`missing vId for move ${move.moveId}`);
            return move.moveId;
        }

        if (!gameTranslation[move.vId]) {
            console.log(`missing gameTranslation for move ${move.moveId}`);
            return move.moveId;
        }

        return gameTranslation[move.vId].name;
    }

    return <div className="banner_layout">
        <div className="pokemon_with_ivs">
            <PokemonInfoImagePlaceholder
                pokemon={pokemon}
                computedCP={ivPercents[pokemon.speciesId].masterLeagueCP}
                computedAtk={+(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueAttack * 10) / 10).toFixed(1)}
                computedDef={+(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueDefense * 10) / 10).toFixed(1)}
                computedHP={ivPercents[pokemon.speciesId].masterLeagueHP}
                displayLevel={displayLevel}
                setDisplayLevel={(newLevel: number) => {setDisplayLevel(newLevel); setLevelCap(newLevel);}}
                imageRef={selectedImageRef}
            />
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
                            pokemonRankInLeague: ordinal(rankLists[3][bestInFamilyForCustomLeague.speciesId]?.rank)
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
                        atk={attack}
                        def={defense}
                        hp={hp}
                        greatLeagueStats={
                            {
                                leagueTitle: "great",
                                bestReachablePokemonName: bestInFamilyForGreatLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonRankInLeague: ordinal(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.rank),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableGreatLeagueIvs.greatLeagueRank),
                                pokemonLeaguePercentile: bestReachableGreatLeagueIvs.greatLeagueRank + 1,
                                pokemonCP: bestReachableGreatLeagueIvs.greatLeagueCP,
                                pokemonLevel: bestReachableGreatLeagueIvs.greatLeagueLvl,
                                atk: bestReachableGreatLeagueIvs.greatLeaguePerfect.A,
                                def: bestReachableGreatLeagueIvs.greatLeaguePerfect.D,
                                hp: bestReachableGreatLeagueIvs.greatLeaguePerfect.S,
                                bestCP: bestReachableGreatLeagueIvs.greatLeaguePerfectCP,
                                bestLevel: bestReachableGreatLeagueIvs.greatLeaguePerfectLevel,
                                fastAttack: {
                                    moveName: translatedMove(moves[greatLeagueMoveset[0]]),
                                    type: moves[greatLeagueMoveset[0]]?.type,
                                    isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[0]),
                                    isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[0])
                                },
                                chargedAttack1: {
                                    moveName: translatedMove(moves[greatLeagueMoveset[1]]),
                                    type: moves[greatLeagueMoveset[1]]?.type,
                                    isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[1]),
                                    isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[1])
                                },
                                chargedAttack2: {
                                    moveName: translatedMove(moves[greatLeagueMoveset[2]]),
                                    type: moves[greatLeagueMoveset[2]]?.type,
                                    isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[2]),
                                    isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[2])
                                }
                            }
                        }
                        ultraLeagueStats={
                            {
                                leagueTitle: "ultra",
                                bestReachablePokemonName: bestInFamilyForUltraLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonRankInLeague: ordinal(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.rank),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableUltraLeagueIvs.ultraLeagueRank),
                                pokemonLeaguePercentile: bestReachableUltraLeagueIvs.ultraLeagueRank + 1,
                                pokemonCP: bestReachableUltraLeagueIvs.ultraLeagueCP,
                                pokemonLevel: bestReachableUltraLeagueIvs.ultraLeagueLvl,
                                atk: bestReachableUltraLeagueIvs.ultraLeaguePerfect.A,
                                def: bestReachableUltraLeagueIvs.ultraLeaguePerfect.D,
                                hp: bestReachableUltraLeagueIvs.ultraLeaguePerfect.S,
                                bestCP: bestReachableUltraLeagueIvs.ultraLeaguePerfectCP,
                                bestLevel: bestReachableUltraLeagueIvs.ultraLeaguePerfectLevel,
                                fastAttack: {
                                    moveName: translatedMove(moves[ultraLeagueMoveset[0]]),
                                    type: moves[ultraLeagueMoveset[0]]?.type,
                                    isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[0]),
                                    isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[0])
                                },
                                chargedAttack1: {
                                    moveName: translatedMove(moves[ultraLeagueMoveset[1]]),
                                    type: moves[ultraLeagueMoveset[1]]?.type,
                                    isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[1]),
                                    isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[1])
                                },
                                chargedAttack2: {
                                    moveName: translatedMove(moves[ultraLeagueMoveset[2]]),
                                    type: moves[ultraLeagueMoveset[2]]?.type,
                                    isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[2]),
                                    isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[2])
                                }
                            }
                        }
                        masterLeagueStats={
                            {
                                leagueTitle: "master",
                                bestReachablePokemonName: bestInFamilyForMasterLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonRankInLeague: ordinal(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.rank),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableMasterLeagueIvs.masterLeagueRank),
                                pokemonLeaguePercentile: bestReachableMasterLeagueIvs.masterLeagueRank + 1,
                                pokemonCP: bestReachableMasterLeagueIvs.masterLeagueCP,
                                pokemonLevel: bestReachableMasterLeagueIvs.masterLeagueLvl,
                                atk: bestReachableMasterLeagueIvs.masterLeaguePerfect.A,
                                def: bestReachableMasterLeagueIvs.masterLeaguePerfect.D,
                                hp: bestReachableMasterLeagueIvs.masterLeaguePerfect.S,
                                bestCP: bestReachableMasterLeagueIvs.masterLeaguePerfectCP,
                                bestLevel: bestReachableMasterLeagueIvs.masterLeaguePerfectLevel,
                                fastAttack: {
                                    moveName: translatedMove(moves[masterLeagueMoveset[0]]),
                                    type: moves[masterLeagueMoveset[0]]?.type,
                                    isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[0]),
                                    isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[0])
                                },
                                chargedAttack1: {
                                    moveName: translatedMove(moves[masterLeagueMoveset[1]]),
                                    type: moves[masterLeagueMoveset[1]]?.type,
                                    isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[1]),
                                    isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[1])
                                },
                                chargedAttack2: {
                                    moveName: translatedMove(moves[masterLeagueMoveset[2]]),
                                    type: moves[masterLeagueMoveset[2]]?.type,
                                    isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[2]),
                                    isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[2])
                                }
                            }
                        }
                        customLeagueStats={
                            {
                                leagueTitle: "custom",
                                bestReachablePokemonName: bestInFamilyForCustomLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonRankInLeague: ordinal(rankLists[3][bestInFamilyForCustomLeague.speciesId]?.rank),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableCustomLeagueIvs.customLeagueRank),
                                pokemonLeaguePercentile: bestReachableCustomLeagueIvs.customLeagueRank + 1,
                                pokemonCP: bestReachableCustomLeagueIvs.customLeagueCP,
                                pokemonLevel: bestReachableCustomLeagueIvs.customLeagueLvl,
                                atk: bestReachableCustomLeagueIvs.customLeaguePerfect.A,
                                def: bestReachableCustomLeagueIvs.customLeaguePerfect.D,
                                hp: bestReachableCustomLeagueIvs.customLeaguePerfect.S,
                                bestCP: bestReachableCustomLeagueIvs.customLeaguePerfectCP,
                                bestLevel: bestReachableCustomLeagueIvs.customLeaguePerfectLevel,
                                fastAttack: {
                                    moveName: translatedMove(moves[customLeagueMoveset[0]]),
                                    type: moves[customLeagueMoveset[0]]?.type,
                                    isElite: bestInFamilyForCustomLeague.eliteMoves.includes(customLeagueMoveset[0]),
                                    isLegacy: bestInFamilyForCustomLeague.legacyMoves.includes(customLeagueMoveset[0])
                                },
                                chargedAttack1: {
                                    moveName: translatedMove(moves[customLeagueMoveset[1]]),
                                    type: moves[customLeagueMoveset[1]]?.type,
                                    isElite: bestInFamilyForCustomLeague.eliteMoves.includes(customLeagueMoveset[1]),
                                    isLegacy: bestInFamilyForCustomLeague.legacyMoves.includes(customLeagueMoveset[1])
                                },
                                chargedAttack2: {
                                    moveName: translatedMove(moves[customLeagueMoveset[2]]),
                                    type: moves[customLeagueMoveset[2]]?.type,
                                    isElite: bestInFamilyForCustomLeague.eliteMoves.includes(customLeagueMoveset[2]),
                                    isLegacy: bestInFamilyForCustomLeague.legacyMoves.includes(customLeagueMoveset[2])
                                }
                            }
                        }
                    />
            </div>
    </div>;
}

export default PokemonInfoBanner;