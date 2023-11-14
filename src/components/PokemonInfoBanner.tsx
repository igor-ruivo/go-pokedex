import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import PokemonImage from "./PokemonImage";
import "./PokemonInfoBanner.scss";
import { useState } from "react";
import LeaguePanels from "./LeaguePanels";
import React from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";
import { fetchPokemonFamily, fetchReachablePokemonIncludingSelf, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import PokemonInfoImagePlaceholder from "./PokemonInfoImagePlaceholder";
import LeagueRanks from "./LeagueRanks";
import { ListType } from "../views/pokedex";
import useLeague from "../hooks/useLeague";

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
    masterLeaguePerfectCP: number
}

const PokemonInfoBanner = ({pokemon, ivPercents, levelCap, setLevelCap, attack, setAttack, defense, setDefense, hp, setHP}: IPokemonInfoBanner) => {
    const [displayLevel, setDisplayLevel] = useState(levelCap);
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const [league, handleSetLeague] = useLeague();
    const selectedImageRef = React.createRef<HTMLImageElement>();

    const {gamemasterPokemon, rankLists, moves, fetchCompleted} = usePokemon();

    if (!fetchCompleted || !pokemon || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0) {
        return <></>;
    }

    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);
    
    const valueToLevel = (value: number) => {
        return value / 2 + 0.5
    }

    let bestInFamilyForGreatLeague = pokemon;
    let bestInFamilyForGreatLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForUltraLeague = pokemon;
    let bestInFamilyForUltraLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForMasterLeague = pokemon;
    let bestInFamilyForMasterLeagueRank = Number.MAX_VALUE;

    const reachablePokemons = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);

    reachablePokemons.forEach(member => {
        const rankInGreat = rankLists[0][member.speciesId]?.rank;
        const rankInUltra = rankLists[1][member.speciesId]?.rank;
        const rankInMaster = rankLists[2][member.speciesId]?.rank;
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
    });

    const bestReachableGreatLeagueIvs = ivPercents[bestInFamilyForGreatLeague.speciesId];
    const bestReachableUltraLeagueIvs = ivPercents[bestInFamilyForUltraLeague.speciesId];
    const bestReachableMasterLeagueIvs = ivPercents[bestInFamilyForMasterLeague.speciesId];

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

    const translatedType = (type: PokemonTypes) => {
        const translatorKey = TranslatorKeys[type];
        return translator(translatorKey as any, currentLanguage)
    }

    const translatedMove = (move: string) => {
        const translatorKey = GameTranslatorKeys[move as keyof typeof GameTranslatorKeys];
        return gameTranslator(translatorKey ?? move, currentGameLanguage);
    }

    const relevantMoveSet = (league === ListType.GREAT_LEAGUE || league === ListType.POKEDEX) ? greatLeagueMoveset : league === ListType.ULTRA_LEAGUE ? ultraLeagueMoveset : masterLeagueMoveset;
    
    const fastMoveClassName = `move-card background-${moves[relevantMoveSet[0]]?.type}`;
    const chargedMove1ClassName = `move-card background-${moves[relevantMoveSet[1]]?.type}`;
    const chargedMove2ClassName = `move-card background-${moves[relevantMoveSet[2]]?.type}`;
    
    const fastMoveTranslatorKey = GameTranslatorKeys[relevantMoveSet[0] as keyof typeof GameTranslatorKeys];
    const chargedMove1TranslatorKey = GameTranslatorKeys[relevantMoveSet[1] as keyof typeof GameTranslatorKeys];
    const chargedMove2TranslatorKey = GameTranslatorKeys[relevantMoveSet[2] as keyof typeof GameTranslatorKeys];

    const fastMoveTypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[0]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[0]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove1TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[1]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[1]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove2TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[2]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[2]]?.type.substring(1)) as keyof typeof TranslatorKeys];
                    
    const fastMoveUrl = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[0]]?.type}.png`;
    const chargedMove1Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[1]]?.type}.png`;
    const chargedMove2Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[2]]?.type}.png`;

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
            >
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
                    currentLeague={league}
                    setLeague={handleSetLeague}
                />
            </PokemonInfoImagePlaceholder>
            <div className="appraisal_with_moves">
                <AppraisalBar
                    attack = {attack}
                    setAttack={setAttack}
                    defense={defense}
                    setDefense={setDefense}
                    hp={hp}
                    setHP={setHP}
                />
                <div className="moves_main_panel">
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
                        moveName: translatedMove(moves[greatLeagueMoveset[0]]?.moveId),
                        type: moves[greatLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[0]),
                        isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: translatedMove(moves[greatLeagueMoveset[1]]?.moveId),
                        type: moves[greatLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[1]),
                        isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: translatedMove(moves[greatLeagueMoveset[2]]?.moveId),
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
                        moveName: translatedMove(moves[ultraLeagueMoveset[0]]?.moveId),
                        type: moves[ultraLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[0]),
                        isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: translatedMove(moves[ultraLeagueMoveset[1]]?.moveId),
                        type: moves[ultraLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[1]),
                        isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: translatedMove(moves[ultraLeagueMoveset[2]]?.moveId),
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
                        moveName: translatedMove(moves[masterLeagueMoveset[0]]?.moveId),
                        type: moves[masterLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[0]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: translatedMove(moves[masterLeagueMoveset[1]]?.moveId),
                        type: moves[masterLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[1]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: translatedMove(moves[masterLeagueMoveset[2]]?.moveId),
                        type: moves[masterLeagueMoveset[2]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[2]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[2])
                    }
                }
            }
        />
    </div>
            </div>
        </div>
        {similarPokemon.size > 1 && <div className="img-container">
            <div className="img-family">
                {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                    <div key = {p.speciesId} className="img-family-container">
                        <Link to={`/pokemon/${p.speciesId}/info`}>
                            <PokemonImage pokemon={p} withName={false} withMetadata={false}/>
                        </Link>
                    </div>
                ))}
            </div>
        </div>}
    </div>;
}

export default PokemonInfoBanner;