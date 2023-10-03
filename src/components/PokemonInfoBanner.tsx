import { Link, useNavigate } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import { IIvPercents } from "../views/pokemon";
import PokemonInfoImage from "./PokemonInfo/PokemonInfoImage";
import "./PokemonInfoBanner.scss";
import { useEffect, useRef, useState } from "react";
import LeaguePanels from "./LeaguePanels";
import PokemonHeader from "./PokemonHeader";
import CircularSliderInput from "./CircularSliderInput";
import React from "react";
import AppraisalBar from "./AppraisalBar";

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
    const navigate = useNavigate();
    const selectedImageRef = React.createRef<HTMLImageElement>();
    /*
    useEffect(() => {
        if (pokemon?.isShadow) {
            navigate(`/pokemon/${pokemon.speciesId.replace("_shadow", "")}`);
        }
    }, [pokemon]);
    */

    const {gamemasterPokemon, rankLists} = usePokemon();

    if (!pokemon || /*pokemon.isShadow || */!gamemasterPokemon || rankLists.length === 0 || Object.keys(ivPercents).length === 0) {
        return <></>;
    }

    const familyTreeExceptSelf = pokemon.familyId ? gamemasterPokemon.filter(p => p.speciesId !== pokemon.speciesId && p.familyId === pokemon.familyId && pokemon.isShadow === p.isShadow).sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => b.atk * b.def * b.hp - a.atk * a.def * a.hp) : [];
    const english_ordinal_rules = new Intl.PluralRules("en", {type: "ordinal"});
    const suffixes: Dictionary<string> = {
        one: "st",
        two: "nd",
        few: "rd",
        other: "th"
    };

    const ordinal = (number: number) => {
        if (number < 1) {
            return undefined;
        }
        const category = english_ordinal_rules.select(number);
        const suffix = suffixes[category];
        return number + suffix;
    }

    const normalizeAttack = (attack: string) => {
        if (!attack) {
            return "";
        }
        
        const words = attack.split("_");

        for (let i = 0; i < words.length; i++) {
            words[i] = words[i][0].toLocaleUpperCase() + words[i].substring(1).toLocaleLowerCase();
        }

        return words.join(' ');
    }
    
    const valueToLevel = (value: number) => {
        return value / 2 + 0.5
    }

    let bestInFamilyForGreatLeague = pokemon;
    let bestInFamilyForGreatLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForUltraLeague = pokemon;
    let bestInFamilyForUltraLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForMasterLeague = pokemon;
    let bestInFamilyForMasterLeagueRank = Number.MAX_VALUE;

    const reachablePokemons: IGamemasterPokemon[] = [];
    const queue = [pokemon];
    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;
        reachablePokemons.push(currentPokemon);
        if (!currentPokemon.evolutions || currentPokemon.evolutions.length === 0) {
            continue;
        }
        queue.push(...currentPokemon.evolutions.map(id => gamemasterPokemon.find(pk => pk.speciesId === id)).filter(pk => pk) as IGamemasterPokemon[]);
    }

    console.log(reachablePokemons.map(e => e.speciesId));

    reachablePokemons.forEach(member => {
        const rankInGreat = rankLists[0].findIndex(p => p.speciesId === member.speciesId);
        const rankInUltra = rankLists[1].findIndex(p => p.speciesId === member.speciesId);
        const rankInMaster = rankLists[2].findIndex(p => p.speciesId === member.speciesId);
        if (rankInGreat !== -1 && rankInGreat < bestInFamilyForGreatLeagueRank) {
            bestInFamilyForGreatLeagueRank = rankInGreat;
            bestInFamilyForGreatLeague = member;
        }
        if (rankInUltra !== -1 && rankInUltra < bestInFamilyForUltraLeagueRank) {
            bestInFamilyForUltraLeagueRank = rankInUltra;
            bestInFamilyForUltraLeague = member;
        }
        if (rankInMaster !== -1 && rankInMaster < bestInFamilyForMasterLeagueRank) {
            bestInFamilyForMasterLeagueRank = rankInMaster;
            bestInFamilyForMasterLeague = member;
        }
    });

    const simplifyName = (name: string) => {
        return name
            /*.replace("(Alolan)", "(A)")
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
            .replace("Female", "♀")*/;
    }


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
                            <PokemonInfoImage pokemon={pokemon} ref={selectedImageRef}/* height={100} width={100}*//>
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
                    @ LVL {<select value={displayLevel} onChange={e => {setLevelCap(+e.target.value); setDisplayLevel(+e.target.value);}} className="select-level">
                            {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                            .map(e => (<option key={e} value={e}>{e}</option>))}
                        </select>}
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
        
        <div className="img-container">
            <div className="img-family">
                {familyTreeExceptSelf.map(p => (
                    <div key = {p.speciesId} className="img-family-container">
                        <Link to={`/pokemon/${p.speciesId}`}>
                            <PokemonInfoImage pokemon={p}/* height={32} width={32}*//>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
        <LeaguePanels
            greatLeagueAtk={ivPercents[bestInFamilyForGreatLeague.speciesId].greatLeaguePerfect.A}
            greatLeagueDef={ivPercents[bestInFamilyForGreatLeague.speciesId].greatLeaguePerfect.D}
            greatLeagueSta={ivPercents[bestInFamilyForGreatLeague.speciesId].greatLeaguePerfect.S}
            greatLeaguePercent={Math.round(((1 - (ivPercents[bestInFamilyForGreatLeague.speciesId].greatLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}
            greatLeaguePercentile={ivPercents[bestInFamilyForGreatLeague.speciesId].greatLeagueRank + 1}
            greatLeagueRank={ordinal(rankLists[0].findIndex(p => p.speciesId === bestInFamilyForGreatLeague.speciesId) + 1) ?? "-"}
            greatLeagueBestFamilyMemberName={simplifyName(bestInFamilyForGreatLeague.speciesName)}
            greatLeagueFastAttack={normalizeAttack(rankLists[0].find(p => p.speciesId === bestInFamilyForGreatLeague.speciesId)?.moveset[0] ?? "")}
            greatLeagueCharged1={normalizeAttack(rankLists[0].find(p => p.speciesId === bestInFamilyForGreatLeague.speciesId)?.moveset[1] ?? "")}
            greatLeagueCharged2={normalizeAttack(rankLists[0].find(p => p.speciesId === bestInFamilyForGreatLeague.speciesId)?.moveset[2] ?? "")}
            ultraLeagueAtk={ivPercents[bestInFamilyForUltraLeague.speciesId].ultraLeaguePerfect.A}
            ultraLeagueDef={ivPercents[bestInFamilyForUltraLeague.speciesId].ultraLeaguePerfect.D}
            ultraLeagueSta={ivPercents[bestInFamilyForUltraLeague.speciesId].ultraLeaguePerfect.S}
            ultraLeaguePercent={Math.round(((1 - (ivPercents[bestInFamilyForUltraLeague.speciesId].ultraLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}
            ultraLeaguePercentile={ivPercents[bestInFamilyForUltraLeague.speciesId].ultraLeagueRank + 1}
            ultraLeagueRank={ordinal(rankLists[1].findIndex(p => p.speciesId === bestInFamilyForUltraLeague.speciesId) + 1) ?? "-"}
            ultraLeagueBestFamilyMemberName={simplifyName(bestInFamilyForUltraLeague.speciesName)}
            ultraLeagueFastAttack={normalizeAttack(rankLists[1].find(p => p.speciesId === bestInFamilyForUltraLeague.speciesId)?.moveset[0] ?? "")}
            ultraLeagueCharged1={normalizeAttack(rankLists[1].find(p => p.speciesId === bestInFamilyForUltraLeague.speciesId)?.moveset[1] ?? "")}
            ultraLeagueCharged2={normalizeAttack(rankLists[1].find(p => p.speciesId === bestInFamilyForUltraLeague.speciesId)?.moveset[2] ?? "")}
            masterLeagueAtk={ivPercents[bestInFamilyForMasterLeague.speciesId].masterLeaguePerfect.A}
            masterLeagueDef={ivPercents[bestInFamilyForMasterLeague.speciesId].masterLeaguePerfect.D}
            masterLeagueSta={ivPercents[bestInFamilyForMasterLeague.speciesId].masterLeaguePerfect.S}
            masterLeaguePercent={Math.round(((1 - (ivPercents[bestInFamilyForMasterLeague.speciesId].masterLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}
            masterLeaguePercentile={ivPercents[bestInFamilyForMasterLeague.speciesId].masterLeagueRank + 1}
            masterLeagueRank={ordinal(rankLists[2].findIndex(p => p.speciesId === bestInFamilyForMasterLeague.speciesId) + 1) ?? "-"}
            masterLeagueBestFamilyMemberName={simplifyName(bestInFamilyForMasterLeague.speciesName)}
            masterLeagueFastAttack={normalizeAttack(rankLists[2].find(p => p.speciesId === bestInFamilyForMasterLeague.speciesId)?.moveset[0] ?? "")}
            masterLeagueCharged1={normalizeAttack(rankLists[2].find(p => p.speciesId === bestInFamilyForMasterLeague.speciesId)?.moveset[1] ?? "")}
            masterLeagueCharged2={normalizeAttack(rankLists[2].find(p => p.speciesId === bestInFamilyForMasterLeague.speciesId)?.moveset[2] ?? "")}
        />
    </div>;
}

export default PokemonInfoBanner;