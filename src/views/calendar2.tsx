import './pokemon.scss';
import '../components/PokemonImage.css';
import './calendar2.scss';
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
import Select from "react-select";
import Events from '../components/Events';
import Spawns from '../components/Spawns';
import Rockets from '../components/Rockets';
import Eggs from '../components/Eggs';
import Raids from '../components/Raids';

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

const Calendar2 = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { currentLanguage, currentGameLanguage } = useLanguage();
    const { pathname } = useLocation();

    const basePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const imgRes = tab.endsWith("/bosses") ? "raid-no-bg" : tab.endsWith("/spawns") ? "wild-no-bg" : tab.endsWith("/eggs") ? "eggs-no-bg" : tab.endsWith("/rockets") ? "rocket-no-bg" : "calendar-no-bg";

    return (
        <main className="layout">
            <div className="pokemon">
                <div className="pokemon-content">
                    <LoadingRenderer errors={errors} completed={fetchCompleted}>
                        <div className="content">
                            <PokemonHeader
                                pokemonName={tab.endsWith("/bosses") ? "Current Bosses" : tab.endsWith("/spawns") ? "Current Spawns" : tab.endsWith("/eggs") ? "Current Eggs" : tab.endsWith("/rockets") ? "Rocket Lineups" : "Events"}
                                type1={undefined}
                                type2={undefined}
                                defaultTextColor
                            />
                            <div className="pokemon">
                                {fetchCompleted &&
                                    <div className="item with-small-margin-top events-header-image-container">
                                        <img src= {`${process.env.PUBLIC_URL}/images/ai/${imgRes}.png`}/>
                                    </div>
                                }

                                <nav className="navigation-header normal-text">
                                    <ul>
                                        <li>
                                            <Link to={basePath + "/events"} className={"header-tab no-full-border " + (tab.endsWith("/events") ? "selected" : "")}>
                                                <span>Events</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/bosses"} className={"header-tab no-full-border " + (tab.endsWith("/bosses") ? "selected" : "")}>
                                                <span>Bosses</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/spawns"} className={"header-tab no-full-border " + (tab.endsWith("/spawns") ? "selected" : "")}>
                                                <span>Spawns</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/rockets"} className={"header-tab no-full-border " + (tab.endsWith("/rockets") ? "selected" : "")}>
                                                <span>Rocket Lineups</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/eggs"} className={"header-tab no-full-border " + (tab.endsWith("/eggs") ? "selected" : "")}>
                                                <span>Eggs</span>
                                            </Link>
                                        </li>
                                    </ul>
                                </nav>

                                {tab.endsWith("/events") && <Events/>}
                                {tab.endsWith("/bosses") && <Raids/>}
                                {tab.endsWith("/spawns") && <Spawns/>}
                                {tab.endsWith("/rockets") && <Rockets/>}
                                {tab.endsWith("/eggs") && <Eggs/>}
                            </div>
                        </div>
                    </LoadingRenderer>
                </div>
            </div>
        </main>
    );
}

export default Calendar2;