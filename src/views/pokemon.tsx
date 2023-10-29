import { useEffect } from 'react';
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

const Pokemon = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { speciesId } = useParams();
    const pokemon = fetchCompleted ? gamemasterPokemon[speciesId ?? ""] : undefined;
    const { pathname } = useLocation();
    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));
    const {currentLanguage} = useLanguage();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to={pokemonBasePath + "/info"} className={"header-tab " + (tab.endsWith("/info") ? "selected" : "")}>
                            <span>Pokémon</span>
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
                <LoadingRenderer errors={errors} completed={fetchCompleted}>
                    <>
                        {
                            !pokemon ?
                                <div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div> :
                                <div className="pokemon">
                                    {tab.endsWith("/info") && <PokemonInfo pokemon={pokemon}/>}
                                    {tab.endsWith("/moves") && <PokemonMoves pokemon={pokemon}/>}
                                    {tab.endsWith("/tables") && <PokemonIVTables pokemon={pokemon}/>}
                                    {tab.endsWith("/strings") && <PokemonSearchStrings pokemon={pokemon}/>}
                                </div>
                        }
                    </>
                </LoadingRenderer>
            </div>
        </main>
    );
}

export default Pokemon;