import './pokemon.scss';
import '../components/PokemonImage.css';
import { Link, useLocation, useParams } from 'react-router-dom';
import { usePokemon } from '../contexts/pokemon-context';
import LoadingRenderer from '../components/LoadingRenderer';
import PokemonInfo from '../components/PokemonInfo';
import PokemonIVTables from '../components/PokemonIVTables';
import PokemonSearchStrings from '../components/PokemonSearchStrings';
import translator, { TranslatorKeys } from '../utils/Translator';
import { useLanguage } from '../contexts/language-context';
import PokemonMoves from '../components/PokemonMoves';
import LeaguePicker from '../components/LeaguePicker';
import PokemonHeader from '../components/PokemonHeader';
import useLeague from '../hooks/useLeague';
import PokemonFamily from '../components/PokemonFamily';
import { fetchPokemonFamily } from '../utils/pokemon-helper';
import { useMemo } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';

const Pokemon = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const {currentLanguage} = useLanguage();
    const { speciesId } = useParams();
    const { pathname } = useLocation();
    const {league, handleSetLeague} = useLeague();

    const pokemon = fetchCompleted && !gamemasterPokemon[speciesId ?? ""]?.aliasId ? gamemasterPokemon[speciesId ?? ""] : undefined;
    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const computedPokemonFamily = useMemo(() => fetchCompleted ? fetchPokemonFamily(pokemon as IGamemasterPokemon, gamemasterPokemon) : undefined, [pokemon, fetchCompleted]);

    return (
        <main className="layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to={pokemonBasePath + "/info"} className={"header-tab " + (tab.endsWith("/info") ? "selected" : "")}>
                            <span>{translator(TranslatorKeys.Stats, currentLanguage)}</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/moves"} className={"header-tab " + (tab.endsWith("/moves") ? "selected" : "")}>
                            <span>{translator(TranslatorKeys.Moves, currentLanguage)}</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/tables"} className={"header-tab " + (tab.endsWith("/tables") ? "selected" : "")}>
                            <span>{translator(TranslatorKeys.IVTables, currentLanguage)}</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/strings"} className={"header-tab " + (tab.endsWith("/strings") ? "selected" : "")}>
                            <span>{translator(TranslatorKeys.SearchStrings, currentLanguage)}</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokemon">
                <div className="pokemon-content">
                    <LoadingRenderer errors={errors} completed={fetchCompleted}>
                        {
                            !pokemon ?
                                <div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div> :        
                                <div className="content">
                                    <PokemonHeader
                                        pokemonName={pokemon!.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))}
                                        type1={pokemon!.types[0]}
                                        type2={pokemon!.types.length > 1 ? pokemon!.types[1] : undefined}
                                    />
                                    <div className="pokemon">
                                        <LeaguePicker
                                            league={league}
                                            handleSetLeague={handleSetLeague}
                                        />
                                        
                                        {fetchCompleted && computedPokemonFamily && <PokemonFamily
                                            pokemon={pokemon}
                                            similarPokemon={computedPokemonFamily}
                                            getClickDestination={(speciesId: string) => `/pokemon/${speciesId}/${tab.substring(tab.lastIndexOf("/") + 1)}`}
                                        />}
                                        
                                        {tab.endsWith("/info") && <PokemonInfo pokemon={pokemon} league={league} handleSetLeague={handleSetLeague}/>}
                                        {tab.endsWith("/moves") && <PokemonMoves pokemon={pokemon} league={league}/>}
                                        {tab.endsWith("/tables") && <PokemonIVTables pokemon={pokemon} league={league}/>}
                                        {tab.endsWith("/strings") && <PokemonSearchStrings pokemon={pokemon} league={league}/>}
                                    </div>
                                </div>
                        }
                    </LoadingRenderer>
                </div>
            </div>
        </main>
    );
}

export default Pokemon;