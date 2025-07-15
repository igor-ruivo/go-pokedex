import './pokemon.scss';
import '../components/PokemonImage.css';
import './calendar.scss';
import './calendar2.scss';
import { Link, useLocation } from 'react-router-dom';
import { usePokemon } from '../contexts/pokemon-context';
import LoadingRenderer from '../components/LoadingRenderer';
import translator, { TranslatorKeys } from '../utils/Translator';
import { useLanguage } from '../contexts/language-context';
import PokemonHeader from '../components/PokemonHeader';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import Events from '../components/Events';
import Spawns from '../components/Spawns';
import Rockets from '../components/Rockets';
import Eggs from '../components/Eggs';
import Raids from '../components/Raids';
import { useMemo } from 'react';

const Calendar2 = () => {
    const { fetchCompleted, errors } = usePokemon();
    const { currentLanguage, currentGameLanguage } = useLanguage();
    const { pathname } = useLocation();

    const basePath = useMemo(() => pathname.substring(0, pathname.lastIndexOf("/")), [pathname]);
    const tab = useMemo(() => pathname.substring(pathname.lastIndexOf("/")), [pathname]);

    const imgRes = useMemo(() => tab.endsWith("/bosses") ? "raid-no-bg" : tab.endsWith("/spawns") ? "wild-no-bg" : tab.endsWith("/eggs") ? "eggs-no-bg" : tab.endsWith("/rockets") ? "rocket-no-bg" : "calendar-no-bg"
    , [tab]);

    return (
        <main className="layout">
            <div className="pokemon">
                <div className="pokemon-content">
                    <LoadingRenderer errors={errors} completed={fetchCompleted}>
                        {() => <div className="content">
                            <PokemonHeader
                                pokemonName={tab.endsWith("/bosses") ? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage) : tab.endsWith("/spawns") ? translator(TranslatorKeys.Spawns, currentLanguage) : tab.endsWith("/eggs") ? translator(TranslatorKeys.Eggs, currentLanguage) : tab.endsWith("/rockets") ? translator(TranslatorKeys.Rockets, currentLanguage) : translator(TranslatorKeys.Events, currentLanguage)}
                                type1={undefined}
                                type2={undefined}
                                defaultTextColor
                                defaultBannerColor
                                whiteTextColor
                            />
                            <div className="pokemon">
                                {fetchCompleted &&
                                    <div className="item with-small-margin-top events-header-image-container">
                                        <img alt='AI' src= {`${process.env.PUBLIC_URL}/images/ai/${imgRes}.png`}/>
                                    </div>
                                }

                                <nav className="navigation-header normal-text">
                                    <ul>
                                        <li>
                                            <Link to={basePath + "/events"} className={"header-tab no-full-border " + (tab.endsWith("/events") ? "selected" : "")}>
                                                <span>{translator(TranslatorKeys.Events, currentLanguage)}</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/bosses"} className={"header-tab no-full-border " + (tab.endsWith("/bosses") ? "selected" : "")}>
                                                <span>{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/spawns"} className={"header-tab no-full-border " + (tab.endsWith("/spawns") ? "selected" : "")}>
                                                <span>{translator(TranslatorKeys.Spawns, currentLanguage)}</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/rockets"} className={"header-tab no-full-border " + (tab.endsWith("/rockets") ? "selected" : "")}>
                                                <span>{translator(TranslatorKeys.Rockets, currentLanguage)}</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to={basePath + "/eggs"} className={"header-tab no-full-border " + (tab.endsWith("/eggs") ? "selected" : "")}>
                                                <span>{translator(TranslatorKeys.Eggs, currentLanguage)}</span>
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
                        </div>}
                    </LoadingRenderer>
                </div>
            </div>
        </main>
    );
}

export default Calendar2;