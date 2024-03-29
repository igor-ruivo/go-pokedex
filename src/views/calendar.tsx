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

    const computeString = (kind: string | undefined, isShadow: boolean) => {
        if (!kind) {
            return undefined;
        }

        if (kind.toLocaleLowerCase().includes("mega")) {
            return "Mega Raid";
        }
/*
        if (kind.toLocaleLowerCase().includes("shadow")) {
            return "Shadow Raid";
        }*/

        return `Tier ${kind}${isShadow && !kind.toLocaleLowerCase().includes("shadow") ? " Shadow" : ""}`;
    }

    const getMega = (speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        weekday: 'short',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
    }

    const inUpperCase = (str: string) => str?.substring(0, 1)?.toUpperCase() + str?.substring(1);

    const reducedLeekPosts = Object.entries(leekPosts
        .reduce((acc: { [key: string]: IPostEntry }, obj) => {
            const key = getDateKey(obj);
            // If the key already exists in the accumulator, merge 'entries'
            if (acc[key]) {
              acc[key].entries = [...acc[key].entries, ...obj.entries];
            } else {
              // Otherwise, initialize it with the current object (ignoring 'kind' or keeping it arbitrarily)
              acc[key] = { date: obj.date, dateEnd: obj.dateEnd, entries: obj.entries };
            }
            return acc;
          }, {}))
          .map(([key, value]) => ({
            date: value.date,
            dateEnd: value.dateEnd,
            entries: value.entries
          } as IPostEntry))
        .filter(p => p.entries.length > 0 && new Date(p.dateEnd ?? 0) >= new Date());

    const reducedRaids = posts.filter(p => p["raids"]?.entries.length > 0 && new Date(p["raids"]?.dateEnd ?? 0) >= new Date());

    const sortEntries = (e1: IEntry, e2: IEntry) => {
        if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
            return 1;
        }

        if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
            return -1;
        }

        if (e1.kind === e2.kind) {
            return gamemasterPokemon[e1.speciesId].dex - gamemasterPokemon[e2.speciesId].dex;
        }

        if (!e1.kind) {
            return -1;
        }

        if (!e2.kind) {
            return 1;
        }

        return e1.kind.localeCompare(e2.kind);
    }

    const generateTodayBosses = (entries: IPostEntry[]) => {
        if (!bossesFetchCompleted || !leekPostsFetchCompleted || !postsFetchCompleted) {
            return [];
        }

        const seenIds = new Set<string>(bossesPerTier.entries.map(e => e.speciesId));
        const response = [...bossesPerTier.entries];

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const left = new Date(currentYear, currentMonth, currentDay, 0, 0);
        const right = new Date(currentYear, currentMonth, currentDay, 0, 0);
        right.setDate(right.getDate() + 1);

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const dateEntryStart = new Date(entry.date);
            const dateEntryEnd = new Date(entry.dateEnd ?? 0);

            if (dateEntryStart > right || dateEntryEnd < left) {
                continue;
            }
            
            for (let j = 0; j < entry.entries.length; j++) {
                const p = entry.entries[j];
                if (seenIds.has(p.speciesId)) {
                    continue;
                }

                seenIds.add(p.speciesId);

                response.push({
                    speciesId: p.speciesId,
                    shiny: p.shiny,
                    kind: p.kind
                });
            }
        }

        return response.sort(sortEntries);
    }

    const additionalBosses = [...reducedLeekPosts, ...reducedRaids.map(r => r["raids"])];

    const bossesAvailableToday = generateTodayBosses(additionalBosses);
    
    const sortPosts = (e1: IPostEntry, e2: IPostEntry) => {
        if (e1.date.valueOf() === e2.date.valueOf()) {
            return (e1.dateEnd?.valueOf() ?? 0) - (e2.dateEnd?.valueOf() ?? 0);
        }

        return e1.date.valueOf() - e2.date.valueOf();
    }

    const remainingBosses = additionalBosses
    .filter(e => e.entries.length > 0 && !e.entries.every(c => bossesAvailableToday.map(n => n.speciesId).includes(c.speciesId)))
    .sort(sortPosts);

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
                            {tab.endsWith("/bosses") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted && <div className='item default-padding'><h1 className='centered-text'>
                                    Today
                                </h1><div className='with-flex'>{bossesAvailableToday.map(e => 
                                    <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                        <div className={`card-wrapper ${e.kind === "mega" || e.kind?.includes("5") || e.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                            <PokemonCard pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} listType={ListType.POKEDEX} shinyBadge={e.shiny} cpStringOverride={computeString(e.kind, gamemasterPokemon[e.speciesId].isShadow)} withCountdown={additionalBosses.sort(sortPosts).find(d => d.date < new Date().valueOf() && d.entries.some(f => f.speciesId === e.speciesId))?.dateEnd ? new Date(additionalBosses.sort(sortPosts).find(d => d.entries.some(f => f.speciesId === e.speciesId))?.dateEnd ?? 0).valueOf() : undefined} />
                                        </div>
                                    </div>)}
                                </div>
                            </div>}
                            {tab.endsWith("/bosses") && leekPostsFetchCompleted && postsFetchCompleted &&
                            remainingBosses
                            .map(e => <div className='item default-padding' key={getDateKey(e)}>
                                <h4 className='centered-text'>
                                    {inUpperCase(new Date(e.date).toLocaleString(undefined, options))} - {inUpperCase(new Date(e.dateEnd ?? 0).toLocaleString(undefined, options))}
                                </h4>
                                <div className='with-flex'>
                                {e.entries.sort(sortEntries).map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                    <div className={`card-wrapper ${p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                        <PokemonCard pokemon={gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} cpStringOverride={computeString(p.kind, gamemasterPokemon[p.speciesId].isShadow)}/>
                                    </div>
                                </div>)}
                                </div>
                            </div>)}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.map(p => p["wild"]).filter(p => p && p.entries.length > 0 && new Date(p.dateEnd ?? 0) >= new Date()).sort(sortPosts).map(e => <div className='item default-padding' key={getDateKey(e)}>
                                <h4 className='centered-text'>
                                    {inUpperCase(new Date(e.date).toLocaleString(undefined, options))} - {inUpperCase(new Date(e.dateEnd ?? 0).toLocaleString(undefined, options))}
                                </h4>
                                <div className='with-flex'>
                                {e.entries.map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                    <div className={`card-wrapper ${p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                        <PokemonCard pokemon={gamemasterPokemon[p.speciesId]} listType={ListType.POKEDEX} />
                                    </div>
                                </div>)}
                                </div>
                            </div>)}{tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && <div className='item default-padding'>
                                <h4 className='centered-text'>
                                    {inUpperCase(new Date(season.date).toLocaleString(undefined, options))} - {inUpperCase(new Date(season.dateEnd ?? 0).toLocaleString(undefined, options))}
                                </h4>
                                <div className='with-flex'>
                                    {season.entries.map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                        <div className={`card-wrapper ${p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6") ? "with-golden-border" : ""}`}>
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