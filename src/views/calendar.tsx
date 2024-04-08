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
import { useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import PokemonHeader from '../components/PokemonHeader';
import useResize from '../hooks/useResize';
import PokemonMiniature from '../components/PokemonMiniature';


const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const inUpperCase = (str: string) => str?.substring(0, 1)?.toUpperCase() + str?.substring(1);

const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
}

const smallOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
}

const idxToPlace = (idx: number) => {
    switch(idx) {
        case 0:
            return "Cities";
        case 1:
            return "Forests";
        case 2:
            return "Mountains";
        case 3:
            return "Beaches & Water";
        case 4:
            return "Northen Hemisphere";
        case 5:
            return "Southern Hemisphere";
    }
}

const idxToRes = (idx: number) => {
    switch(idx) {
        case 0:
            return "city";
        case 1:
            return "forest";
        case 2:
            return "mountain";
        case 3:
            return "water";
        case 4:
            return "north";
        case 5:
            return "south";
    }
}

const computeCount = (d: number, h: number, m: number, s: number) => {
    if (!d && !h && !m && !s) {
        return "Expired";
    }

    return d > 0 ? `${d} day${d > 1 ? "s" : ""} left` : `${h}h : ${m}m : ${s}s`;
}

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

const Calendar = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { bossesPerTier, posts, season, leekPosts, seasonFetchCompleted, seasonErrors, bossesFetchCompleted, postsFetchCompleted, leekPostsFetchCompleted, leekPostsErrors, bossesErrors, postsErrors } = useCalendar();
    const { pathname } = useLocation();
    const {x} = useResize();
    
    const {days, hours, minutes, seconds} = useCountdown(season?.dateEnd ?? 0);

    const {currentGameLanguage, currentLanguage} = useLanguage();
    const [currentPlace, setCurrentPlace] = useState("0");
    const [currentEvent, setCurrentEvent] = useState("");

    const getMega = (speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const reducedLeekPosts = leekPosts.filter(p => (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date());

    const reducedRaids = posts.flat().filter(p => p && (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date());

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

        const seenIds = new Set<string>((bossesPerTier.raids ?? []).map(e => e.speciesId));
        const response = [...(bossesPerTier.raids ?? [])];

        const now = new Date();
        /*const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const left = new Date(currentYear, currentMonth, currentDay, 0, 0);
        const right = new Date(currentYear, currentMonth, currentDay, 0, 0);
        right.setDate(right.getDate() + 1);*/

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const dateEntryStart = new Date(entry.date);
            const dateEntryEnd = new Date(entry.dateEnd ?? 0);

            if (!(now >= dateEntryStart && now < dateEntryEnd)) {
                continue;
            }
            
            for (let j = 0; j < (entry.raids ?? []).length; j++) {
                if (!entry.raids) {
                    break;
                }

                const p = entry.raids[j];
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

    const additionalBosses = Object.entries([...reducedLeekPosts, ...reducedRaids]
    .reduce((acc: { [key: string]: IPostEntry }, obj) => {
        const key = getDateKey(obj);
        // If the key already exists in the accumulator, merge 'entries'
        if (acc[key]) {
          acc[key].raids = [...(acc[key].raids ?? []), ...(obj.raids ?? [])];
        } else {
          // Otherwise, initialize it with the current object (ignoring 'kind' or keeping it arbitrarily)
          acc[key] = { title: obj.title, imgUrl: obj.imgUrl, date: obj.date, dateEnd: obj.dateEnd, raids: obj.raids };
        }
        return acc;
      }, {}))
      .map(([key, value]) => ({
        title: value.title, //TODO: Review this.
        imgUrl: value.imgUrl, //TODO: Review this.
        date: value.date,
        dateEnd: value.dateEnd,
        raids: value.raids
      } as IPostEntry));

    const bossesAvailableToday = generateTodayBosses(additionalBosses);
    
    const sortPosts = (e1: IPostEntry, e2: IPostEntry) => {
        if (e1.date.valueOf() === e2.date.valueOf()) {
            return (e1.dateEnd?.valueOf() ?? 0) - (e2.dateEnd?.valueOf() ?? 0);
        }

        return e1.date.valueOf() - e2.date.valueOf();
    }

    const remainingBosses = additionalBosses
    .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf() /*&& !e.entries.every(c => bossesAvailableToday.map(n => n.speciesId).includes(c.speciesId))*/)
    .sort(sortPosts);

    return (
        <main className="pokedex-layout">
            <nav className="navigation-header normal-text">
                <ul>
                    <li>
                        <Link to={pokemonBasePath + "/events"} className={"header-tab no-full-border " + (tab.endsWith("/events") ? "selected" : "")}>
                            <span>Events</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/bosses"} className={"header-tab no-full-border " + (tab.endsWith("/bosses") ? "selected" : "")}>
                            <span>Bosses</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/spawns"} className={"header-tab no-full-border " + (tab.endsWith("/spawns") ? "selected" : "")}>
                            <span>Spawns</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/rockets"} className={"header-tab disabled no-full-border " + (tab.endsWith("/rockets") ? "selected" : "")}>
                            <span>Rockets</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/eggs"} className={"header-tab disabled no-full-border " + (tab.endsWith("/eggs") ? "selected" : "")}>
                            <span>Eggs</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokemon hardcoded-height">
                <LoadingRenderer errors={errors + bossesErrors + postsErrors + seasonErrors + leekPostsErrors} completed={fetchCompleted && bossesFetchCompleted && postsFetchCompleted && seasonFetchCompleted && leekPostsFetchCompleted}>
                <div className="calendar-content">
                    <div className='content'>
                    <PokemonHeader
                        pokemonName={tab.endsWith("/bosses") ? "Current Bosses" : tab.endsWith("/spawns") ? "Current Spawns" : "Events"}
                        type1={undefined}
                        type2={undefined}
                        defaultTextColor
                    />
                        <div className="pokemon with-small-margin-top with-xl-gap">
                            {tab.endsWith("/bosses") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted && <div className='item default-padding'><strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>At the moment:</strong><div className='with-flex with-margin-top contained'>{bossesAvailableToday.map(e => 
                                    <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                        <div className={`card-wrapper ${e.kind === "mega" || e.kind?.includes("5") || e.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                            <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride={computeString(e.kind, gamemasterPokemon[e.speciesId].isShadow) ?? ""} withCountdown={additionalBosses.sort(sortPosts).find(d => d.date <= new Date().valueOf() && (d.raids ?? []).some(f => f.speciesId === e.speciesId))?.dateEnd} />
                                        </div>
                                    </div>)}
                                </div>
                            </div>}
                            {tab.endsWith("/bosses") && leekPostsFetchCompleted && postsFetchCompleted &&
                            remainingBosses
                            .map(e => <div key={getDateKey(e)}><div className='item default-padding'>
                                <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>
                                    {inUpperCase(new Date(e.date).toLocaleString(undefined, smallOptions))} - {inUpperCase(new Date(e.dateEnd ?? 0).toLocaleString(undefined, smallOptions))}
                                </strong>
                                <div className='with-flex contained'>
                                {(e.raids ?? []).sort(sortEntries).map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                    <div className={`card-wrapper ${p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} cpStringOverride={computeString(p.kind, gamemasterPokemon[p.speciesId].isShadow)}/>
                                    </div>
                                </div>)}
                                </div></div>
                            </div>)}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) < new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} collection={e.wild ?? []} post={e} sortEntries={sortEntries}/>)}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && <div className='item default-padding'>
                                <div>
                                <div><strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>Current Season <span className="computeCount">({computeCount(days, hours, minutes, seconds)})</span></strong></div>
                                <div className="raid-container">
                                    <div className="overflowing">
                                        <div className="img-family">
                                            {[(season.wild ?? []).filter(e => e.kind === "0"), (season.wild ?? []).filter(e => e.kind === "1"), (season.wild ?? []).filter(e => e.kind === "2"), (season.wild ?? []).filter(e => e.kind === "3"), (season.wild ?? []).filter(e => e.kind === "4"), (season.wild ?? []).filter(e => e.kind === "5")]
                                            .map((t, i) => (
                                                <div className="clickable" key={i} onClick={() => setCurrentPlace(String(i))}>
                                                    <strong className={`move-detail ${String(i) === currentPlace ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentPlace ? "extra-padding-right" : ""}`}>
                                                        <div className="img-padding"><img className="invert-light-mode" height={26} width={26} alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`}/></div>
                                                        {String(i) === currentPlace && idxToPlace(i)}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div></div>
                                <div className='with-flex contained'>
                                    {(season.wild ?? []).filter(r => r.kind === currentPlace).sort(sortEntries).map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                        <div className={`card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                                </div>
                            </div>}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) > new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} collection={e.wild ?? []} post={e} sortEntries={sortEntries}/>)}
                            {tab.endsWith("/events") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted && seasonFetchCompleted &&
                            <div className='with-small-margin-top with-xl-gap aligned'>{
                            [...posts.flat(), season].filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.eggs?.length ?? 0) > 0 || (p.researches?.length ?? 0) > 0) && new Date(p.dateEnd ?? 0) >= new Date()).sort(sortPosts).map(event =>
                                <div className="with-dynamic-max-width" key={event.subtitle + "-" + event.title}>
                                <div className={`column item ${new Date(event.date ?? 0) < new Date() ? "ongoing-event" : ""}`}>
                                    <div className='column'>
                                        <div className='event-panel-container clickable' onClick={() => setCurrentEvent(c => c === (event.subtitle + "-" + event.title) ? "" : (event.subtitle + "-" + event.title))}>
                                            <span className='images-container'>
                                                <span className='restricted-img-size'>
                                                    <img className="img-with-rounded-corners" src={event.imgUrl} width="100%" height="100%"/>
                                                </span>
                                            </span>
                                            <div className='event-text-container justified'>
                                                <strong className='ellipsed'>{posts.flat().some(pf => pf.title === event.title) ? (event.subtitle ?? event.title) : event.title}</strong>
                                                <div className='with-padding-left with-small-gap event-dates'>
                                                <span className='event-special-font'><strong>From:</strong> <span>{inUpperCase(new Date(event.date).toLocaleString(undefined, options))}</span></span>
                                                <span className='event-special-font'><strong>To:</strong> <span>{inUpperCase(new Date(event.dateEnd ?? 0).toLocaleString(undefined, options))}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                    </div>
                                    {currentEvent === event.subtitle + "-" + event.title && <div>
                                        <EventDetail eventKey='event.subtitle + "-" + event.title' post={event} sortEntries={sortEntries}/>
                                    </div>}
                                </div>
                                
                                
                                {false && x <= 565 && currentEvent !== event.subtitle + "-" + event.title && //perks-container-mobile perks-container-row aligned justified 
                                <div className='event-buffs-placeholder'>
                                    {event.bonuses && <div className="event-buff-panel">
                                        <summary>
                                            <img width="14" height="14" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/bonus.png`}/>
                                        </summary>
                                    </div>}
                                    {(event.wild?.length ?? 0) > 0 && <div className="event-buff-panel">
                                        <summary>
                                            <img width="14" height="14" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/wild.webp`}/>
                                        </summary>
                                    </div>}
                                    {(event.raids?.length ?? 0) > 0 && <div className="event-buff-panel">
                                        <summary>
                                            <img width="14" height="14" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/raid.webp`}/>
                                        </summary>
                                    </div>}
                                    {(event.researches?.length ?? 0) > 0 && <div className="event-buff-panel">
                                        <summary>
                                            <img width="14" height="14" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/research.png`}/>
                                        </summary>
                                    </div>}
                                    {(event.eggs?.length ?? 0) > 0 && <div className="event-buff-panel">
                                        <summary>
                                            <img width="14" height="14" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/egg.png`}/>
                                        </summary>
                                    </div>}
                                </div>}
                                </div>
                                
                                )}</div>}
                    </div>
                    </div>
                </div>
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Calendar;

interface IEventDetail {
    eventKey: string;
    post: IPostEntry;
    sortEntries: (e1: IEntry, e2: IEntry) => number;
}

const EventDetail = ({eventKey, post, sortEntries}: IEventDetail) => {
    const [currTab, setCurrTab] = useState(post.bonuses ? "bonuses" : (post.wild?.length ?? 0) > 0 ? "spawns" : (post.raids?.length ?? 0) > 0 ? "raids" : (post.researches?.length ?? 0) > 0 ? "researches" : "eggs");
    const [currentPlace, setCurrentPlace] = useState("0");

    return <div>
        <div className='divider'/>
        <nav className="navigation-header normal-text">
            <ul>
                {post.bonuses && <li>
                    <div onClick={() => setCurrTab("bonuses")} className={"header-tab no-full-border " + (currTab === "bonuses" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/bonus.png`}/><span>Bonuses</span>
                    </div>
                </li>}
                {(post.wild?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("spawns")} className={"header-tab no-full-border " + (currTab === "spawns" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/wild.webp`}/><span>Spawns</span>
                    </div>
                </li>}
                {(post.raids?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("raids")} className={"header-tab no-full-border " + (currTab === "raids" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/raid.webp`}/><span>Raids</span>
                    </div>
                </li>}
                {(post.researches?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("researches")} className={"header-tab no-full-border " + (currTab === "researches" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/research.png`}/><span>Researches</span>
                    </div>
                </li>}
                {(post.eggs?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("eggs")} className={"header-tab no-full-border disabled" + (currTab === "eggs" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/egg.png`}/><span>Eggs</span>
                    </div>
                </li>}
            </ul>
        </nav>
        {post.isSeason && currTab === "spawns" && <div className="raid-container">
            <div className="overflowing">
                <div className="img-family">
                    {[(post.wild ?? []).filter(e => e.kind === "0"), (post.wild ?? []).filter(e => e.kind === "1"), (post.wild ?? []).filter(e => e.kind === "2"), (post.wild ?? []).filter(e => e.kind === "3"), (post.wild ?? []).filter(e => e.kind === "4"), (post.wild ?? []).filter(e => e.kind === "5")]
                    .map((t, i) => (
                        <div className="clickable" key={i} onClick={() => setCurrentPlace(String(i))}>
                            <strong className={`move-detail ${String(i) === currentPlace ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentPlace ? "extra-padding-right" : ""}`}>
                                <div className="season-img-padding"><img className="invert-light-mode" height="100%" width="100%" alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`}/></div>
                                {String(i) === currentPlace && idxToPlace(i)}
                            </strong>
                        </div>
                    ))}
                </div>
            </div>
        </div>}
        {currTab === "spawns" && <PostEntry collection={post.wild ?? []} withoutTitle={true} post={post} sortEntries={sortEntries} kindFilter={post.isSeason ? currentPlace : undefined}/>}
        {currTab === "raids" && <PostEntry collection={post.raids ?? []} withRaidCPStringOverride={true} withoutTitle={true} post={post} sortEntries={sortEntries}/>}
        {currTab === "researches" && <PostEntry collection={post.researches ?? []} withoutTitle={true} post={post} sortEntries={sortEntries}/>}
        {currTab === "eggs" && <PostEntry collection={post.eggs ?? []} withoutTitle={true} post={post} sortEntries={sortEntries}/>}
        {currTab === "bonuses" && post.bonuses && <div className='default-padding bonus-container less-contained'>
            {post.bonuses.split("\n").filter(b => b).map(b => <ul key={b} className='ul-with-adorner'>{b}</ul>)}
        </div>}
    </div>;
}

interface IPost {
    post: IPostEntry;
    collection: IEntry[];
    sortEntries: (e1: IEntry, e2: IEntry) => number;
    kindFilter?: string;
    withoutTitle?: boolean;
    withRaidCPStringOverride?: boolean;
}

const PostEntry = ({post, collection, sortEntries, kindFilter, withoutTitle, withRaidCPStringOverride}: IPost) => {
    const {gamemasterPokemon} = usePokemon();
    const {days, hours, minutes, seconds} = useCountdown(post.dateEnd ?? 0);

    

    const now = new Date();
    const postIsNow = now > new Date(post.date) && now < new Date(post.dateEnd ?? 0);

    return <div><div className='item default-padding'>
        {!withoutTitle && postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>At the moment <span className="computeCount">({computeCount(days, hours, minutes, seconds)})</span></strong>}
        {!withoutTitle && !postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>{inUpperCase(new Date(post.date).toLocaleString(undefined, smallOptions)) + " - " + inUpperCase(new Date(post.dateEnd ?? 0).toLocaleString(undefined, smallOptions))}</strong>}
        <div className='with-flex contained'>
        {collection.filter(k => !kindFilter || kindFilter === k.kind).sort(sortEntries).map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
            <div className={`card-wrapper ${!post.isSeason && (p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6")) ? "with-golden-border" : ""}`}>
                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} cpStringOverride={withRaidCPStringOverride ? computeString(p.kind, gamemasterPokemon[p.speciesId].isShadow) : undefined} />
            </div>
        </div>)}
        </div></div>
    </div>
    
}