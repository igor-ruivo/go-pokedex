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
            greatLeagueAtk={bestReachableGreatLeagueIvs.greatLeaguePerfect.A}
            greatLeagueDef={bestReachableGreatLeagueIvs.greatLeaguePerfect.D}
            greatLeagueSta={bestReachableGreatLeagueIvs.greatLeaguePerfect.S}
            greatLeaguePercent={getRankPercentage(bestReachableGreatLeagueIvs.greatLeagueRank)}
            greatLeaguePercentile={bestReachableGreatLeagueIvs.greatLeagueRank + 1}
            greatLeagueRank={ordinal(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.rank) ?? "-"}
            greatLeagueBestFamilyMemberName={simplifyName(bestInFamilyForGreatLeague.speciesName)}
            greatLeagueFastAttack={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[0] ?? ""]?.name ?? ""}
            greatLeagueFastAttackIsElite={bestInFamilyForGreatLeague.eliteMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[0] ?? "")}
            greatLeagueFastAttackIsLegacy={bestInFamilyForGreatLeague.legacyMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[0] ?? "")}
            greatLeagueFastAttackType={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[0] ?? ""]?.type ?? ""}
            greatLeagueCharged1={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[1] ?? ""]?.name ?? ""}
            greatLeagueCharged1IsElite={bestInFamilyForGreatLeague.eliteMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[1] ?? "")}
            greatLeagueCharged1IsLegacy={bestInFamilyForGreatLeague.legacyMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[1] ?? "")}
            greatLeagueCharged1Type={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[1] ?? ""]?.type ?? ""}
            greatLeagueCharged2={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[2] ?? ""]?.name ?? ""}
            greatLeagueCharged2IsElite={bestInFamilyForGreatLeague.eliteMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[2] ?? "")}
            greatLeagueCharged2IsLegacy={bestInFamilyForGreatLeague.legacyMoves.includes(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[2] ?? "")}
            greatLeagueCharged2Type={moves[rankLists[0][bestInFamilyForGreatLeague.speciesId]?.moveset[2] ?? ""]?.type ?? ""}
            greatLeagueCP={bestReachableGreatLeagueIvs.greatLeagueCP}
            greatLeagueLVL={bestReachableGreatLeagueIvs.greatLeagueLvl}
            greatLeagueBestCP={bestReachableGreatLeagueIvs.greatLeaguePerfectCP}
            greatLeagueBestLVL={bestReachableGreatLeagueIvs.greatLeaguePerfectLevel}
            ultraLeagueAtk={bestReachableUltraLeagueIvs.ultraLeaguePerfect.A}
            ultraLeagueDef={bestReachableUltraLeagueIvs.ultraLeaguePerfect.D}
            ultraLeagueSta={bestReachableUltraLeagueIvs.ultraLeaguePerfect.S}
            ultraLeaguePercent={getRankPercentage(bestReachableUltraLeagueIvs.ultraLeagueRank)}
            ultraLeaguePercentile={bestReachableUltraLeagueIvs.ultraLeagueRank + 1}
            ultraLeagueRank={ordinal(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.rank) ?? "-"}
            ultraLeagueBestFamilyMemberName={simplifyName(bestInFamilyForUltraLeague.speciesName)}
            ultraLeagueFastAttack={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[0] ?? ""]?.name ?? ""}
            ultraLeagueFastAttackIsElite={bestInFamilyForUltraLeague.eliteMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[0] ?? "")}
            ultraLeagueFastAttackIsLegacy={bestInFamilyForUltraLeague.legacyMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[0] ?? "")}
            ultraLeagueFastAttackType={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[0] ?? ""]?.type ?? ""}
            ultraLeagueCharged1={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[1] ?? ""]?.name ?? ""}
            ultraLeagueCharged1IsElite={bestInFamilyForUltraLeague.eliteMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[1] ?? "")}
            ultraLeagueCharged1IsLegacy={bestInFamilyForUltraLeague.legacyMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[1] ?? "")}
            ultraLeagueCharged1Type={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[1] ?? ""]?.type ?? ""}
            ultraLeagueCharged2={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[2] ?? ""]?.name ?? ""}
            ultraLeagueCharged2IsElite={bestInFamilyForUltraLeague.eliteMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[2] ?? "")}
            ultraLeagueCharged2IsLegacy={bestInFamilyForUltraLeague.legacyMoves.includes(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[2] ?? "")}
            ultraLeagueCharged2Type={moves[rankLists[1][bestInFamilyForUltraLeague.speciesId]?.moveset[2] ?? ""]?.type ?? ""}
            ultraLeagueCP={bestReachableUltraLeagueIvs.ultraLeagueCP}
            ultraLeagueLVL={bestReachableUltraLeagueIvs.ultraLeagueLvl}
            ultraLeagueBestCP={bestReachableUltraLeagueIvs.ultraLeaguePerfectCP}
            ultraLeagueBestLVL={bestReachableUltraLeagueIvs.ultraLeaguePerfectLevel}
            masterLeagueAtk={bestReachableMasterLeagueIvs.masterLeaguePerfect.A}
            masterLeagueDef={bestReachableMasterLeagueIvs.masterLeaguePerfect.D}
            masterLeagueSta={bestReachableMasterLeagueIvs.masterLeaguePerfect.S}
            masterLeaguePercent={getRankPercentage(bestReachableMasterLeagueIvs.masterLeagueRank)}
            masterLeaguePercentile={bestReachableMasterLeagueIvs.masterLeagueRank + 1}
            masterLeagueRank={ordinal(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.rank) ?? "-"}
            masterLeagueBestFamilyMemberName={simplifyName(bestInFamilyForMasterLeague.speciesName)}
            masterLeagueFastAttack={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[0] ?? ""]?.name ?? ""}
            masterLeagueFastAttackIsElite={bestInFamilyForMasterLeague.eliteMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[0] ?? "")}
            masterLeagueFastAttackIsLegacy={bestInFamilyForMasterLeague.legacyMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[0] ?? "")}
            masterLeagueFastAttackType={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[0] ?? ""]?.type ?? ""}
            masterLeagueCharged1={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[1] ?? ""]?.name ?? ""}
            masterLeagueCharged1IsElite={bestInFamilyForMasterLeague.eliteMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[1] ?? "")}
            masterLeagueCharged1IsLegacy={bestInFamilyForMasterLeague.legacyMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[1] ?? "")}
            masterLeagueCharged1Type={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[1] ?? ""]?.type ?? ""}
            masterLeagueCharged2={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[2] ?? ""]?.name ?? ""}
            masterLeagueCharged2IsElite={bestInFamilyForMasterLeague.eliteMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[2] ?? "")}
            masterLeagueCharged2IsLegacy={bestInFamilyForMasterLeague.legacyMoves.includes(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[2] ?? "")}
            masterLeagueCharged2Type={moves[rankLists[2][bestInFamilyForMasterLeague.speciesId]?.moveset[2] ?? ""]?.type ?? ""}
            masterLeagueCP={bestReachableMasterLeagueIvs.masterLeagueCP}
            masterLeagueLVL={bestReachableMasterLeagueIvs.masterLeagueLvl}
            masterLeagueBestCP={bestReachableMasterLeagueIvs.masterLeaguePerfectCP}
            masterLeagueBestLVL={bestReachableMasterLeagueIvs.masterLeaguePerfectLevel}
        />
    </div>;
}

export default PokemonInfoBanner;