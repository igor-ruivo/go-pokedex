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
import { useEffect, useMemo, useState } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import PokemonCounters from '../components/PokemonCounters';
import PokemonInfoImagePlaceholder from '../components/PokemonInfoImagePlaceholder';
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from '../utils/persistent-configs-handler';
import useComputeIVs from '../hooks/useComputeIVs';

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const parseSessionCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readSessionValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const Pokemon = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const {currentLanguage} = useLanguage();
    const { speciesId } = useParams();
    const { pathname } = useLocation();
    const {league, handleSetLeague} = useLeague();

    const [attackIV, setAttackIV] = useState(parseSessionCachedNumberValue(ConfigKeys.AttackIV, 0));
    const [defenseIV, setDefenseIV] = useState(parseSessionCachedNumberValue(ConfigKeys.DefenseIV, 0));
    const [hpIV, setHPIV] = useState(parseSessionCachedNumberValue(ConfigKeys.HPIV, 0));
    
    const [levelCap, setLevelCap] = useState<number>(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 40));

    useEffect(() => {
        writeSessionValue(ConfigKeys.AttackIV, attackIV.toString());
        writeSessionValue(ConfigKeys.DefenseIV, defenseIV.toString());
        writeSessionValue(ConfigKeys.HPIV, hpIV.toString());
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [attackIV, defenseIV, hpIV, levelCap]);

    const [displayLevel, setDisplayLevel] = useState(levelCap);

    const pokemon = fetchCompleted && !gamemasterPokemon[speciesId ?? ""]?.aliasId ? gamemasterPokemon[speciesId ?? ""] : undefined;
    
    const [ivPercents, loading] = useComputeIVs({pokemon: pokemon as IGamemasterPokemon, levelCap, attackIV, defenseIV, hpIV});

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const computedPokemonFamily = useMemo(() => fetchCompleted ? fetchPokemonFamily(pokemon as IGamemasterPokemon, gamemasterPokemon) : undefined, [pokemon, fetchCompleted, gamemasterPokemon]);

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
                        <Link to={pokemonBasePath + "/counters"} className={"header-tab " + (tab.endsWith("/counters") ? "selected" : "")}>
                            <span>{translator(TranslatorKeys.Counters, currentLanguage)}</span>
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
                    <LoadingRenderer errors={errors} completed={fetchCompleted && !loading && !!pokemon && Object.hasOwn(ivPercents, pokemon.speciesId)}>
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

                                        {fetchCompleted && !loading && !!pokemon && Object.hasOwn(ivPercents, pokemon.speciesId) && <PokemonInfoImagePlaceholder
                                            pokemon={pokemon}
                                            computedCP={ivPercents[pokemon.speciesId].masterLeagueCP}
                                            computedAtk={+(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueAttack * 10) / 10).toFixed(1)}
                                            computedDef={+(Math.trunc(ivPercents[pokemon.speciesId].masterLeagueDefense * 10) / 10).toFixed(1)}
                                            computedHP={ivPercents[pokemon.speciesId].masterLeagueHP}
                                            displayLevel={displayLevel}
                                            setDisplayLevel={(newLevel: number) => {setDisplayLevel(newLevel); setLevelCap(newLevel);}}
                                        />}
                                        
                                        {tab.endsWith("/info") && <PokemonInfo
                                            pokemon={pokemon}
                                            league={league}
                                            handleSetLeague={handleSetLeague}
                                            loading={loading}
                                            ivPercents={ivPercents}
                                            attackIV={attackIV}
                                            setAttackIV={setAttackIV}
                                            defenseIV={defenseIV}
                                            setDefenseIV={setDefenseIV}
                                            hpIV={hpIV}
                                            setHPIV={setHPIV}
                                        />}
                                        {tab.endsWith("/moves") && <PokemonMoves pokemon={pokemon} league={league}/>}
                                        {tab.endsWith("/counters") && <PokemonCounters pokemon={pokemon} league={league}/>}
                                        {tab.endsWith("/tables") && <PokemonIVTables pokemon={pokemon} league={league} levelCap={levelCap} />}
                                        {tab.endsWith("/strings") && <PokemonSearchStrings pokemon={pokemon} league={league} levelCap={levelCap} />}
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