import './calendar.scss';
import LoadingRenderer from '../components/LoadingRenderer';
import { usePokemon } from '../contexts/pokemon-context';
import { useLanguage } from '../contexts/language-context';
import { useCalendar } from '../contexts/raid-bosses-context';
import PokemonCard from '../components/PokemonCard';
import { ListType } from './pokedex';
import { calculateCP, levelToLevelIndex } from '../utils/pokemon-helper';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import translator, { TranslatorKeys } from '../utils/Translator';
import { Link, useLocation } from 'react-router-dom';
import { IEntry, IPostEntry } from '../DTOs/INews';

const Calendar = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { bossesPerTier, posts, season, leekPosts, seasonFetchCompleted, seasonErrors, bossesFetchCompleted, postsFetchCompleted, leekPostsFetchCompleted, leekPostsErrors, bossesErrors, postsErrors } = useCalendar();
    const { pathname } = useLocation();
    
    const {currentGameLanguage, currentLanguage} = useLanguage();

    const computeCPString = (speciesId: string) => {
        let pkm = gamemasterPokemon[speciesId];
        const minCP = calculateCP(pkm.atk, 10, pkm.def, 10, pkm.hp, 10, levelToLevelIndex(20));
        const maxCP = calculateCP(pkm.atk, 15, pkm.def, 15, pkm.hp, 15, levelToLevelIndex(20));
        return `${minCP} - ${maxCP} ${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}`;
    }

    const getMega = (speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));
    
    return (
        <main className="layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to={pokemonBasePath + "/bosses"} className={"header-tab " + (tab.endsWith("/bosses") ? "selected" : "")}>
                            <span>Bosses</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/spawns"} className={"header-tab " + (tab.endsWith("/spawns") ? "selected" : "")}>
                            <span>Spawns</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/rockets"} className={"header-tab disabled " + (tab.endsWith("/rockets") ? "selected" : "")}>
                            <span>Rockets</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/eggs"} className={"header-tab disabled " + (tab.endsWith("/eggs") ? "selected" : "")}>
                            <span>Eggs</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokemon">
                <LoadingRenderer errors={errors + bossesErrors + postsErrors + seasonErrors + leekPostsErrors} completed={fetchCompleted && bossesFetchCompleted && postsFetchCompleted && seasonFetchCompleted && leekPostsFetchCompleted}>
                <div className="pokemon-content">
                    <div className="content small-side-padding">
                        <header className="pokemonheader-header without-negative-margins">
                            {tab.endsWith("/bosses") && <h1 className="baseheader-name">{translator(TranslatorKeys.CurrentRaid, currentLanguage)} ({gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)})</h1>}
                            {tab.endsWith("/spawns") && <h1 className="baseheader-name">Wild Encounters</h1>}
                        </header>
                        <div className="pokemon with-normal-gap">
                            {tab.endsWith("/bosses") && bossesFetchCompleted && <div className='item default-padding'><h1>
                                    Today
                                </h1> {Object.entries(bossesPerTier).map(e => 
                                <div className='with-flex' key={e[0]}>
                                    {e[1].map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                        <div className='card-wrapper'>
                                            <PokemonCard pokemon={e[0].includes("mega") ? getMega(p.speciesId) ?? gamemasterPokemon[p.speciesId] : gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} shinyBadge={p.shiny} cpStringOverride={computeCPString(p.speciesId)} />
                                        </div>
                                    </div>)}
                                </div>)}
                            </div>}
                            {tab.endsWith("/bosses") && leekPostsFetchCompleted && Object.entries(leekPosts
                            .reduce((acc: { [key: string]: IPostEntry }, obj) => {
                                const key = obj.date + obj.dateEnd;
                                // If the key already exists in the accumulator, merge 'entries'
                                if (acc[key]) {
                                  acc[key].entries = [...acc[key].entries, ...obj.entries];
                                  // Optionally keep one of the 'kind' values, if it exists
                                  if (!acc[key].kind && obj.kind) {
                                    acc[key].kind = obj.kind;
                                  }
                                } else {
                                  // Otherwise, initialize it with the current object (ignoring 'kind' or keeping it arbitrarily)
                                  acc[key] = { date: obj.date, dateEnd: obj.dateEnd, entries: obj.entries, kind: obj.kind };
                                }
                                return acc;
                              }, {}))
                              .map(([key, value]) => ({
                                date: value.date,
                                dateEnd: value.dateEnd,
                                entries: value.entries,
                                kind: value.kind
                              } as IPostEntry))
                            .filter(p => p.entries.length > 0)
                            .map(e => <div className='item default-padding' key={e.date + e.dateEnd}>
                                <h3>
                                    {e.date} - {e.dateEnd}
                                </h3>
                                <div className='with-flex'>
                                {e.entries.map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                    <div className='card-wrapper'>
                                        <PokemonCard pokemon={gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} />
                                    </div>
                                </div>)}
                                </div>
                            </div>)}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.filter(p => p.entries.length > 0).map(e => <div className='item default-padding' key={e.date}>
                                <h3>
                                    {e.date}
                                </h3>
                                <div className='with-flex'>
                                {e.entries.map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                    <div className='card-wrapper'>
                                        <PokemonCard pokemon={gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} />
                                    </div>
                                </div>)}
                                </div>
                            </div>)}{tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && <div className='item default-padding'>
                                <h1>
                                    {season.date}
                                </h1>
                                <div className='with-flex'>
                                    {season.entries.map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                        <div className='card-wrapper'>
                                            <PokemonCard pokemon={gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} />
                                        </div>
                                    </div>)}
                                </div>
                            </div>}
                        </div>
                    </div>
                </div>
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Calendar;