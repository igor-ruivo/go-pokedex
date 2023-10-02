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
    attack: number,
    setAttack: (_: React.SetStateAction<number>) => void,
    defense: number,
    setDefense: (_: React.SetStateAction<number>) => void,
    hp: number,
    setHP: (_: React.SetStateAction<number>) => void,
}

const PokemonInfoBanner = ({pokemon, ivPercents, levelCap, setLevelCap, attack, setAttack, defense, setDefense, hp, setHP}: IPokemonInfoBanner) => {
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

    const familyTreeExceptSelf = !gamemasterPokemon ? [] : pokemon.familyId ? gamemasterPokemon.filter(p => p.speciesId !== pokemon.speciesId && p.familyId === pokemon.familyId && !p.isShadow).sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => b.atk * b.def * b.hp - a.atk * a.def * a.hp) : [];
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
                    @ LVL {<select value={levelCap} onChange={e => setLevelCap(+e.target.value)} className="select-level">
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
            greatLeagueAtk={ivPercents[pokemon.speciesId].greatLeaguePerfect.A}
            greatLeagueDef={ivPercents[pokemon.speciesId].greatLeaguePerfect.D}
            greatLeagueSta={ivPercents[pokemon.speciesId].greatLeaguePerfect.S}
            greatLeagueCp={ivPercents[pokemon.speciesId].greatLeagueCP}
            greatLeagueLvl={ivPercents[pokemon.speciesId].greatLeagueLvl}
            greatLeagueRank={ordinal(rankLists[0].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}
            ultraLeagueAtk={ivPercents[pokemon.speciesId].ultraLeaguePerfect.A}
            ultraLeagueDef={ivPercents[pokemon.speciesId].ultraLeaguePerfect.D}
            ultraLeagueSta={ivPercents[pokemon.speciesId].ultraLeaguePerfect.S}
            ultraLeagueCp={ivPercents[pokemon.speciesId].ultraLeagueCP}
            ultraLeagueLvl={ivPercents[pokemon.speciesId].ultraLeagueLvl}
            ultraLeagueRank={ordinal(rankLists[1].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}
            masterLeagueAtk={ivPercents[pokemon.speciesId].masterLeaguePerfect.A}
            masterLeagueDef={ivPercents[pokemon.speciesId].masterLeaguePerfect.D}
            masterLeagueSta={ivPercents[pokemon.speciesId].masterLeaguePerfect.S}
            masterLeagueCp={ivPercents[pokemon.speciesId].masterLeagueCP}
            masterLeagueLvl={ivPercents[pokemon.speciesId].masterLeagueLvl}
            masterLeagueRank={ordinal(rankLists[2].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}
        />

        <table className="league-ranks">
            <tbody>
                <tr>
                    <th></th>
                    <th><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/great.png"/></th>
                    <th><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png"/></th>
                    <th><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/master.png"/></th>
                </tr>
                <tr>
                    <td>Rank</td>
                    <td>{ordinal(rankLists[0].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}</td>
                    <td>{ordinal(rankLists[1].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}</td>
                    <td>{ordinal(rankLists[2].findIndex(p => p.speciesId === pokemon.speciesId) + 1) ?? "-"}</td>
                </tr>
                <tr>
                    <td>Perfect IVs</td>
                    <td>{ivPercents[pokemon.speciesId].greatLeaguePerfect.A + " / " + ivPercents[pokemon.speciesId].greatLeaguePerfect.D + " / " + ivPercents[pokemon.speciesId].greatLeaguePerfect.S}</td>
                    <td>{ivPercents[pokemon.speciesId].ultraLeaguePerfect.A + " / " + ivPercents[pokemon.speciesId].ultraLeaguePerfect.D + " / " + ivPercents[pokemon.speciesId].ultraLeaguePerfect.S}</td>
                    <td>{ivPercents[pokemon.speciesId].masterLeaguePerfect.A + " / " + ivPercents[pokemon.speciesId].masterLeaguePerfect.D + " / " + ivPercents[pokemon.speciesId].masterLeaguePerfect.S}</td>
                </tr>
            </tbody>

            <tbody>
                <tr>
                    <th>-</th>
                    <th>-</th>
                    <th>-</th>
                    <th>-</th>
                </tr>
                <tr>
                    <td>Fast Atk</td>
                    <td>{normalizeAttack(rankLists[0].find(p => p.speciesId === pokemon.speciesId)?.moveset[0] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[1].find(p => p.speciesId === pokemon.speciesId)?.moveset[0] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[2].find(p => p.speciesId === pokemon.speciesId)?.moveset[0] ?? "")}</td>
                </tr>
                <tr>
                    <td>Charged #1</td>
                    <td>{normalizeAttack(rankLists[0].find(p => p.speciesId === pokemon.speciesId)?.moveset[1] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[1].find(p => p.speciesId === pokemon.speciesId)?.moveset[1] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[2].find(p => p.speciesId === pokemon.speciesId)?.moveset[1] ?? "")}</td>
                </tr>
                <tr>
                    <td>Charged #2</td>
                    <td>{normalizeAttack(rankLists[0].find(p => p.speciesId === pokemon.speciesId)?.moveset[2] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[1].find(p => p.speciesId === pokemon.speciesId)?.moveset[2] ?? "")}</td>
                    <td>{normalizeAttack(rankLists[2].find(p => p.speciesId === pokemon.speciesId)?.moveset[2] ?? "")}</td>
                </tr>
            </tbody>
        </table>
    </div>;
}

export default PokemonInfoBanner;