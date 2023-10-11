import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import { IIvPercents } from "../views/pokemon";
import PokemonImage from "./PokemonImage";
import "./PokemonInfoBanner.scss";
import { useState } from "react";
import LeaguePanels from "./LeaguePanels";
import PokemonHeader from "./PokemonHeader";
import CircularSliderInput from "./CircularSliderInput";
import React from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";

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

const PokemonInfoBanner = ({pokemon, ivPercents, levelCap, setLevelCap, attack, setAttack, defense, setDefense, hp, setHP}: IPokemonInfoBanner) => {
    const [displayLevel, setDisplayLevel] = useState(levelCap);
    const selectedImageRef = React.createRef<HTMLImageElement>();

    const {gamemasterPokemon, rankLists, moves, fetchCompleted} = usePokemon();

    if (!fetchCompleted || !pokemon || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0) {
        return <></>;
    }

    const familyTreeExceptSelf = new Set(pokemon.familyId ? Object.values(gamemasterPokemon).filter(p => p.speciesId !== pokemon.speciesId && p.familyId === pokemon.familyId && pokemon.isShadow === p.isShadow) : []);
    
    const valueToLevel = (value: number) => {
        return value / 2 + 0.5
    }

    let bestInFamilyForGreatLeague = pokemon;
    let bestInFamilyForGreatLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForUltraLeague = pokemon;
    let bestInFamilyForUltraLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForMasterLeague = pokemon;
    let bestInFamilyForMasterLeagueRank = Number.MAX_VALUE;

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

    reachablePokemons.forEach(member => {
        familyTreeExceptSelf.add(member);
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

    const queue2 = Array.from(familyTreeExceptSelf);
    while (queue2.length > 0) {
        const currentPokemon = queue2.shift() as IGamemasterPokemon;
        familyTreeExceptSelf.add(currentPokemon);
        if (!currentPokemon.parent) {
            continue;
        }
        const parentRef = gamemasterPokemon[currentPokemon.parent];
        if (!parentRef) {
            continue;
        }
        queue2.push(parentRef);
    }

    const simplifyName = (name: string) => {
        return name
            .replace("(Alolan)", "(A)")
            .replace("(Galarian)", "(G)")
            .replace("(Mega)", "(M)")
            .replace("(Shadow)", "(S)")
            .replace("(Complete Forme)", "(CF)")
            .replace("(50% Forme)", "(50% F)")
            .replace("(10% Forme)", "(10% F)")
            .replace("(Hisuian)", "(H)")
            .replace("(Standard)", "(Std.)")
            .replace("(Incarnate)", "(Inc.)")
            .replace("(Average)", "(Avg.)")
            .replace("Male", "♂")
            .replace("Female", "♀");
    }

    const bestReachableGreatLeagueIvs = ivPercents[bestInFamilyForGreatLeague.speciesId];
    const bestReachableUltraLeagueIvs = ivPercents[bestInFamilyForUltraLeague.speciesId];
    const bestReachableMasterLeagueIvs = ivPercents[bestInFamilyForMasterLeague.speciesId];

    const greatLeagueMoveset = rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset ?? [];

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

    return <div className="content">
        <PokemonHeader
            pokemonName={pokemon.speciesName}
            type1={pokemon.types[0]}
            type2={pokemon.types.length > 1 ? pokemon.types[1] : undefined}
        />
        <div className="main-banner-content">
            <div className="banner-left-side">
                <div className="lvl-input-with-image">
                    <div className="lvl-input">
                        <CircularSliderInput
                            handleColor={getComputedStyle(document.body).getPropertyValue(`--type-${pokemon.types[0]}`)}
                            value={levelCap}
                            displayValue={displayLevel}
                            setDisplayValue={setDisplayLevel}
                            setValue={setLevelCap}
                        />
                    </div>
                    <div className="lvl-img-container">
                        <div className="lvl-img-selected-container">
                            <PokemonImage pokemon={pokemon} ref={selectedImageRef}/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="banner-right-side">
                <AppraisalBar
                    attack = {attack}
                    setAttack={setAttack}
                    defense={defense}
                    setDefense={setDefense}
                    hp={hp}
                    setHP={setHP}
                />
            </div>
        </div>
        <strong className="base-stats">
            <span>
                {(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueAttack * 10) / 10).toFixed(1)}
            </span>
            <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
            <span>
                {(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueDefense * 10) / 10).toFixed(1)}
            </span>
            <img src="https://i.imgur.com/D2SX4kq.png" width={14} height={14}/>
            <span>
                {ivPercents[pokemon.speciesId].masterLeagueHP}
            </span>
            <img src="https://i.imgur.com/jft7ZzO.png" width={14} height={14}/>
        </strong>
        <span className="level-cp">
            <strong>{ivPercents[pokemon.speciesId].masterLeagueCP} CP&nbsp;</strong>
            @ LVL {<select value={displayLevel} onChange={e => {setDisplayLevel(+e.target.value); setLevelCap(+e.target.value);}} className="select-level">
                    {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                    .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>}
                &nbsp;&nbsp;{displayLevel > 40 && <img src="https://i.imgur.com/NTtZq10.png" width={14} height={14}/>}
                &nbsp;{displayLevel > 50 && <img src="https://i.imgur.com/MGCXGl0.png" width={14} height={14}/>}
        </span>
        <div className="types-container">
            <div className="types">
                <span className="types-bg" style={{backgroundColor: `var(--type-${pokemon.types[0]})`}}>
                    {pokemon.types[0].toString().charAt(0).toUpperCase() + pokemon.types[0].toString().slice(1)}
                </span>
                {pokemon.types[1] && <span className="types-bg" style={{backgroundColor: `var(--type-${pokemon.types[1]})`}}>
                    {pokemon.types[1].toString().charAt(0).toUpperCase() + pokemon.types[1].toString().slice(1)}
                </span>}
            </div>
        </div>
        {familyTreeExceptSelf.size > 1 && <div className="img-container">
            <div className="img-family">
                {Array.from(familyTreeExceptSelf).sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => b.atk * b.def * b.hp - a.atk * a.def * a.hp).map(p => (
                    <div key = {p.speciesId} className="img-family-container">
                        <Link to={`/pokemon/${p.speciesId}`}>
                            <PokemonImage pokemon={p}/>
                        </Link>
                    </div>
                ))}
            </div>
        </div>}
        <LeaguePanels
            greatLeagueStats={
                {
                    leagueTitle: "great",
                    bestReachablePokemonName: simplifyName(bestInFamilyForGreatLeague.speciesName),
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
                        moveName: moves[greatLeagueMoveset[0]]?.name,
                        type: moves[greatLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[0]),
                        isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: moves[greatLeagueMoveset[1]]?.name,
                        type: moves[greatLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[1]),
                        isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: moves[greatLeagueMoveset[2]]?.name,
                        type: moves[greatLeagueMoveset[2]]?.type,
                        isElite: bestInFamilyForGreatLeague.eliteMoves.includes(greatLeagueMoveset[2]),
                        isLegacy: bestInFamilyForGreatLeague.legacyMoves.includes(greatLeagueMoveset[2])
                    }
                }
            }
            ultraLeagueStats={
                {
                    leagueTitle: "ultra",
                    bestReachablePokemonName: simplifyName(bestInFamilyForUltraLeague.speciesName),
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
                        moveName: moves[ultraLeagueMoveset[0]]?.name,
                        type: moves[ultraLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[0]),
                        isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: moves[ultraLeagueMoveset[1]]?.name,
                        type: moves[ultraLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[1]),
                        isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: moves[ultraLeagueMoveset[2]]?.name,
                        type: moves[ultraLeagueMoveset[2]]?.type,
                        isElite: bestInFamilyForUltraLeague.eliteMoves.includes(ultraLeagueMoveset[2]),
                        isLegacy: bestInFamilyForUltraLeague.legacyMoves.includes(ultraLeagueMoveset[2])
                    }
                }
            }
            masterLeagueStats={
                {
                    leagueTitle: "master",
                    bestReachablePokemonName: simplifyName(bestInFamilyForMasterLeague.speciesName),
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
                        moveName: moves[masterLeagueMoveset[0]]?.name,
                        type: moves[masterLeagueMoveset[0]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[0]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[0])
                    },
                    chargedAttack1: {
                        moveName: moves[masterLeagueMoveset[1]]?.name,
                        type: moves[masterLeagueMoveset[1]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[1]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[1])
                    },
                    chargedAttack2: {
                        moveName: moves[masterLeagueMoveset[2]]?.name,
                        type: moves[masterLeagueMoveset[2]]?.type,
                        isElite: bestInFamilyForMasterLeague.eliteMoves.includes(masterLeagueMoveset[2]),
                        isLegacy: bestInFamilyForMasterLeague.legacyMoves.includes(masterLeagueMoveset[2])
                    }
                }
            }
        />
    </div>;
}

export default PokemonInfoBanner;