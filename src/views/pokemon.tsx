import { useEffect } from 'react';
import './pokemon.scss';
import '../components/PokemonImage.css';
import { Link, useLocation, useParams } from 'react-router-dom';
import { usePokemon } from '../contexts/pokemon-context';
import LoadingRenderer from '../components/LoadingRenderer';
import PokemonInfo from '../components/PokemonInfo';
import PokemonIVTables from '../components/PokemonIVTables';
import PokemonSearchStrings from '../components/PokemonSearchStrings';

const Pokemon = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { speciesId } = useParams();
    const pokemon = fetchCompleted ? gamemasterPokemon[speciesId ?? ""] : undefined;
    const { pathname } = useLocation();
    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to={pokemonBasePath + "/info"} className={"header-tab " + (tab.endsWith("/info") ? "selected" : "")}>
                            <span>Info</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/tables"} className={"header-tab " + (tab.endsWith("/tables") ? "selected" : "")}>
                            <span>IV Tables</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/moves"} className={"header-tab " + (tab.endsWith("/moves") ? "selected" : "")}>
                            <span>Moves</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/strings"} className={"header-tab " + (tab.endsWith("/strings") ? "selected" : "")}>
                            <span>Search Strings</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokemon">
                <LoadingRenderer errors={errors} completed={fetchCompleted}>
                    <>
                        {
                            !pokemon ?
                                <div>Pokémon not found</div> :
                                <div className="pokemon">
                                    {tab.endsWith("/info") && <PokemonInfo pokemon={pokemon}/>}
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