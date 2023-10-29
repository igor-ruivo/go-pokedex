import { useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import { ConfigKeys, readPersistentValue } from "../utils/persistent-configs-handler";
import "./PokemonMoves.scss"
import { fetchPokemonFamily, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import { usePokemon } from "../contexts/pokemon-context";
import { Link, useLocation } from "react-router-dom";
import LoadingRenderer from "./LoadingRenderer";
import PokemonHeader from "./PokemonHeader";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import movesTranslator, { MovesTranslatorKeys } from "../utils/MovesTranslator";

interface IPokemonMoves {
    pokemon: IGamemasterPokemon;
}

const PokemonMoves = ({pokemon}: IPokemonMoves) => {
    const {currentLanguage} = useLanguage();

    const {gamemasterPokemon, moves, fetchCompleted, errors} = usePokemon();
    const {pathname} = useLocation();
    
    if (!fetchCompleted || !gamemasterPokemon) {
        return <></>;
    }

    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);

    return (
        <div className="pokemon-content">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <div className="content">
                    <PokemonHeader
                        pokemonName={pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))}
                        type1={pokemon.types[0]}
                        type2={pokemon.types.length > 1 ? pokemon.types[1] : undefined}
                    />
                    {similarPokemon.size > 1 && <div className="img-container">
                        <div className="img-family">
                            {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                                <div key = {p.speciesId} className="img-family-container">
                                    <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                        <PokemonImage pokemon={p} withName={false}/>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>}
                    <h3 className="moves-title">
                        {translator(TranslatorKeys.FastMoves, currentLanguage)}
                    </h3>
                    <ul className="moves-list">
                        {
                            pokemon.fastMoves.map(m => {
                                const className = `move-card background-${moves[m].type}`;
                                const movesTranslatorKey = MovesTranslatorKeys[m as keyof typeof MovesTranslatorKeys];
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                                return (
                                    <li key={m}>
                                        <div className={className}>
                                            <div className="move-card-content">
                                                <strong className="move-detail move-name">
                                                    <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                                    {movesTranslator(movesTranslatorKey ?? m, currentLanguage) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                                </strong>
                                                <strong className="move-detail move-stats">
                                                    <span className="move-stats-content">
                                                        {moves[m].power}
                                                        <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                                    </span>
                                                    <span className="move-stats-content">
                                                        {moves[m].energyGain}
                                                        <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                                    </span>
                                                    <span className="move-stats-content">
                                                        {moves[m].cooldown}
                                                        <img src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
                                                    </span>
                                                </strong>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })
                        }
                        
                    </ul>
                    <h3 className="moves-title charged-attacks">
                        {translator(TranslatorKeys.ChargedMoves, currentLanguage)}
                    </h3>
                    <ul className="moves-list">
                        {
                            pokemon.chargedMoves.map(m => {
                                const className = `move-card background-${moves[m].type}`;
                                const movesTranslatorKey = MovesTranslatorKeys[m as keyof typeof MovesTranslatorKeys];
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                                return (
                                    <li key={m}>
                                        <div className={className}>
                                            <div className="move-card-content">
                                                <strong className="move-detail move-name">
                                                    <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                                    {movesTranslator(movesTranslatorKey ?? m, currentLanguage) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                                </strong>
                                                <strong className="move-detail move-stats">
                                                    <span className="move-stats-content">
                                                        {moves[m].power}
                                                        <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                                    </span>
                                                    <span className="move-stats-content">
                                                        {moves[m].energy}
                                                        <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                                    </span>
                                                </strong>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })
                        }
                    </ul>
                </div>
            </LoadingRenderer>
        </div>
    );
}

export default PokemonMoves;