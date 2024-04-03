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
import { calculateCP, fetchPokemonFamily } from '../utils/pokemon-helper';
import { useEffect, useMemo, useState } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import PokemonCounters from '../components/PokemonCounters';
import PokemonInfoImagePlaceholder from '../components/PokemonInfoImagePlaceholder';
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from '../utils/persistent-configs-handler';
import useComputeIVs from '../hooks/useComputeIVs';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

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
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const { speciesId } = useParams();
    const { pathname } = useLocation();
    const {league, handleSetLeague} = useLeague();

    const [attackIV, setAttackIV] = useState(parseSessionCachedNumberValue(ConfigKeys.AttackIV, 0));
    const [defenseIV, setDefenseIV] = useState(parseSessionCachedNumberValue(ConfigKeys.DefenseIV, 0));
    const [hpIV, setHPIV] = useState(parseSessionCachedNumberValue(ConfigKeys.HPIV, 0));
    
    const [levelCap, setLevelCap] = useState<number>(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 51));

    useEffect(() => {
        writeSessionValue(ConfigKeys.AttackIV, attackIV.toString());
        writeSessionValue(ConfigKeys.DefenseIV, defenseIV.toString());
        writeSessionValue(ConfigKeys.HPIV, hpIV.toString());
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [attackIV, defenseIV, hpIV, levelCap]);

    const [displayLevel, setDisplayLevel] = useState(levelCap);

    const pokemon = fetchCompleted && !gamemasterPokemon[speciesId ?? ""]?.aliasId ? gamemasterPokemon[speciesId ?? ""] : undefined;
    
    const [ivPercents, loading] = useComputeIVs({pokemon: pokemon as IGamemasterPokemon, attackIV, defenseIV, hpIV});

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const computedPokemonFamily = useMemo(() => fetchCompleted ? fetchPokemonFamily(pokemon as IGamemasterPokemon, gamemasterPokemon) : undefined, [pokemon, fetchCompleted, gamemasterPokemon]);

    return (
        <main className="layout">
            <div className="pokemon">
                <div className="pokemon-content">
                    <LoadingRenderer errors={errors} completed={fetchCompleted && !loading && !!pokemon && Object.hasOwn(ivPercents, pokemon.speciesId)}>
                        {
                            !pokemon ?
                                <div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div> :        
                                <div className="content">
                                    <PokemonHeader
                                        pokemonName={pokemon!.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))}
                                        type1={pokemon!.types[0]}
                                        type2={pokemon!.types.length > 1 ? pokemon!.types[1] : undefined}
                                    />
                                    <div className="pokemon">

                                        {fetchCompleted && !loading && !!pokemon && Object.hasOwn(ivPercents, pokemon.speciesId) && <PokemonInfoImagePlaceholder
                                            pokemon={pokemon}
                                            computedCP={calculateCP(pokemon.atk, attackIV, pokemon.def, defenseIV, pokemon.hp, hpIV, (displayLevel - 1) * 2)}
                                            displayLevel={displayLevel}
                                            setDisplayLevel={(newLevel: number) => {setDisplayLevel(newLevel); setLevelCap(newLevel);}}
                                        />}
                                        
                                        <div className='item with-margin-top'>
                                        <LeaguePicker
                                            league={league}
                                            handleSetLeague={handleSetLeague}
                                        />
                                        
                                        {fetchCompleted && computedPokemonFamily && <PokemonFamily
                                            pokemon={pokemon}
                                            similarPokemon={computedPokemonFamily}
                                            getClickDestination={(speciesId: string) => `/pokemon/${speciesId}/${tab.substring(tab.lastIndexOf("/") + 1)}`}
                                        />}</div>

                                        <nav className="navigation-header">
                                            <ul>
                                                <li>
                                                    <Link to={pokemonBasePath + "/info"} className={"header-tab no-full-border " + (tab.endsWith("/info") ? "selected" : "")}>
                                                        <span>{translator(TranslatorKeys.Stats, currentLanguage)}</span>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to={pokemonBasePath + "/moves"} className={"header-tab no-full-border " + (tab.endsWith("/moves") ? "selected" : "")}>
                                                        <span>{translator(TranslatorKeys.Moves, currentLanguage)}</span>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to={pokemonBasePath + "/counters"} className={"header-tab no-full-border " + (tab.endsWith("/counters") ? "selected" : "")}>
                                                        <span>{translator(TranslatorKeys.Counters, currentLanguage)}</span>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to={pokemonBasePath + "/tables"} className={"header-tab no-full-border " + (tab.endsWith("/tables") ? "selected" : "")}>
                                                        <span>{translator(TranslatorKeys.IVTables, currentLanguage)}</span>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to={pokemonBasePath + "/strings"} className={"header-tab no-full-border " + (tab.endsWith("/strings") ? "selected" : "")}>
                                                        <span>{translator(TranslatorKeys.SearchStrings, currentLanguage)}</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </nav>
                                        
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
                                            level={levelCap}
                                        />}
                                        {tab.endsWith("/moves") && <PokemonMoves pokemon={pokemon} league={league} level={(levelCap - 1) * 2}/>}
                                        {tab.endsWith("/counters") && <PokemonCounters pokemon={pokemon} league={league}/>}
                                        {tab.endsWith("/tables") && <PokemonIVTables pokemon={pokemon} league={league} attackIV={attackIV} setAttackIV={setAttackIV} defenseIV={defenseIV} setDefenseIV={setDefenseIV} hpIV={hpIV} setHPIV={setHPIV}/>}
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