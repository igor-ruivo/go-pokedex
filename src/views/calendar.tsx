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
import { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import { useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import PokemonHeader from '../components/PokemonHeader';
import useResize from '../hooks/useResize';
import PokemonMiniature from '../components/PokemonMiniature';
import ListEntry from '../components/ListEntry';
import React from 'react';
import Select from "react-select";
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';


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

const smallestOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
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

const idxToEgg = (idx: number) => {
    switch(idx) {
        case 0:
            return "2km";
        case 1:
            return "5km";
        case 2:
            return "7km";
        case 3:
            return "10km";
        case 4:
            return "12km";
    }
}

const idxToEggName = (idx: number) => {
    switch(idx) {
        case 0:
            return "2 km";
        case 1:
            return "5 km";
        case 2:
            return "7 km";
        case 3:
            return "10 km";
        case 4:
            return "12 km";
    }
}

const idxToKind = (idx: number) => {
    switch (idx) {
        case 0:
            return 2;
        case 1:
            return 5;
        case 2:
            return 7;
        case 3:
            return 10;
        case 4:
            return 12;
    }
}

const computeCount = (d: number, h: number, m: number, s: number) => {
    if (!d && !h && !m && !s) {
        return "Expired";
    }

    return d > 0 ? `${d} day${d > 1 ? "s" : ""} left` : `${h}h:${m}m:${s}s`;
}

const computeString = (kind: string | undefined, isShadow: boolean) => {
    if (!kind) {
        return undefined;
    }

    if (kind.toLocaleLowerCase().includes("mega")) {
        return "Mega Raid";
    }

    return `Tier ${kind}${isShadow && !kind.toLocaleLowerCase().includes("shadow") ? " Shadow" : ""}`;
}

const Calendar = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { leekEggs, shadowRaids, shadowRaidsErrors, shadowRaidsFetchCompleted, leekRockets, leekRocketsErrors, leekRocketsFetchCompleted, leekEggsErrors, leekEggsFetchCompleted, bossesPerTier, posts, season, leekPosts, seasonFetchCompleted, seasonErrors, bossesFetchCompleted, postsFetchCompleted, leekPostsFetchCompleted, leekPostsErrors, bossesErrors, postsErrors } = useCalendar();
    const { pathname } = useLocation();
    const {x} = useResize();
    
    const {days, hours, minutes, seconds} = useCountdown(season?.dateEnd ?? 0);

    const {currentGameLanguage, currentLanguage} = useLanguage();
    const [currentPlace, setCurrentPlace] = useState("0");
    const [currentEvent, setCurrentEvent] = useState("");
    const [currentEgg, setCurrentEgg] = useState("0");
    const [currentTier, setCurrentTier] = useState("2");
    const [currentBossDate, setCurrentBossDate] = useState("current");
    const [expandedRocket, setExpandedRocket] = useState(readSessionValue(ConfigKeys.ExpandedRocket) ?? "");

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
        if (!bossesFetchCompleted || !leekPostsFetchCompleted || !postsFetchCompleted || !shadowRaidsFetchCompleted) {
            return [];
        }

        const seenIds = new Set<string>([...(bossesPerTier.raids ?? []).map(e => e.speciesId), ...(shadowRaids.raids ?? []).map(e => e.speciesId)]);
        const response = [...(bossesPerTier.raids ?? []), ...(shadowRaids.raids ?? [])];

        const now = new Date();

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
        title: value.title,
        imgUrl: value.imgUrl,
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
    .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf())
    .sort(sortPosts);

    const renderMove = (m: IRocketGrunt, moveUrl: string, className: string) => {
        const colorVar = m.type ? `type-${m.type.substring(0, 1).toLocaleUpperCase() + m.type.substring(1)}` : undefined;

        return <ListEntry
            mainIcon={
                {
                    imageDescription: "",
                    image: <div className="img-padding guaranteedWidth"><img height={20} width={20} src={moveUrl}/></div>,
                    imageSideText: m.phrase,
                    withBackground: true
                }
            }
            expandable
            expanded={expandedRocket === m.trainerId}
            setExpanded={() => {
                setExpandedRocket(p => {
                    const newVal = p === m.trainerId ? "" : m.trainerId;
                    writeSessionValue(ConfigKeys.ExpandedRocket, newVal);
                    return newVal;
                });
            }}
            expandedContent={
                <div className='row-container'>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? {border: `3px solid var(--${colorVar})` } : {border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>1</span>
                            <div className='in-row'>{m.tier1.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(0) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`}/>}
                                    <div className={`card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(0) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(0)} />
                                    </div>
                                </div>
                        )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? {border: `3px solid var(--${colorVar})` } : {border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>2</span>
                            <div className='in-row'>{m.tier2.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(1) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`}/>}
                                    <div className={`card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(1) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(1)} />
                                    </div>
                                </div>
                        )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? {border: `3px solid var(--${colorVar})` } : {border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>3</span>
                            <div className='in-row'>{m.tier3.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(2) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`}/>}
                                    <div className={`card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(2) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(2)} />
                                    </div>
                                </div>
                        )}</div></div>
                    </div>
                </div>
            }
            backgroundColorClassName={className}
            slimmer
            slim
            soft
            defaultBackgroundStyle="normal-entry"
        />
    }

    const getCountdownForBoss = (speciesId: string) => {
        return additionalBosses.sort(sortPosts).find(d => d.date <= new Date().valueOf() && (d.raids ?? []).some(f => f.speciesId === speciesId))?.dateEnd;
    }

    const eggIdxToKind = (idx: string) => {
        switch(idx) {
            case "0":
                return "1";
            case "1":
                return "3";
            case "3":
                return "mega";
            default:
            return "5";
        }
    }

    const raidEventDates = [{label: "Current Bosses", value: "current"}, ...remainingBosses.map(e => ({label: inUpperCase(new Date(e.date).toLocaleString(undefined, smallestOptions)), value: getDateKey(e)}) as any)];
    const raidEventEggs = [{label: "Tier 1", value: "0"}, {label: "Tier 3", value: "1"}, {label: "Tier 5", value: "2"}, {label: "Mega", value: "3"}];

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
                        <Link to={pokemonBasePath + "/rockets"} className={"header-tab no-full-border " + (tab.endsWith("/rockets") ? "selected" : "")}>
                            <span>Rockets</span>
                        </Link>
                    </li>
                    <li>
                        <Link to={pokemonBasePath + "/eggs"} className={"header-tab no-full-border " + (tab.endsWith("/eggs") ? "selected" : "")}>
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
                        pokemonName={tab.endsWith("/bosses") ? "Current Bosses" : tab.endsWith("/spawns") ? "Current Spawns" : tab.endsWith("/eggs") ? "Current Eggs" : tab.endsWith("/rockets") ? "Rocket Lineups" : "Events"}
                        type1={undefined}
                        type2={undefined}
                        defaultTextColor
                    />
                        <div className="pokemon with-small-margin-top with-xl-gap">
                            {
                                tab.endsWith("/bosses") && 
                                <div className='boss-header-filters'>
                                    <div className='raid-date-element'>
                                        <Select
                                            className={`navbar-dropdown-family`}
                                            isSearchable={false}
                                            value={raidEventDates.find(o => o.value === currentBossDate)}
                                            options={raidEventDates}
                                            onChange={e => setCurrentBossDate((e as any).value)}
                                            formatOptionLabel={(data, _) => <div className="hint-container mini-margin-left normal-text"><span className="cp-container">{data.label}</span></div>}
                                        />
                                    </div>
                                    <div className='raid-date-element'>
                                        <Select
                                            className={`navbar-dropdown-family`}
                                            isSearchable={false}
                                            value={raidEventEggs.find(o => o.value === currentTier)}
                                            options={raidEventEggs}
                                            onChange={e => setCurrentTier((e as any).value)}
                                            formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img src={`${process.env.PUBLIC_URL}/images/raid-eggs/${data.value}.png`} style={{width: "auto"}} height={26} width={26}/></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                                        />
                                    </div>
                                </div>
                            }
                            {tab.endsWith("/bosses") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted && 
                            <div className='with-dynamic-max-width auto-margin-sides'><div className='item default-padding'><strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>At the moment:</strong><div className='with-flex with-margin-top contained'>
                                <div className='row-container'>
                                    {bossesAvailableToday.filter(e => e.kind === eggIdxToKind(currentTier) /*&& !gamemasterPokemon[e.speciesId].isShadow*/).length > 0 && <div className='in-row round-border'>
                                        
                                            <div className='in-column'>
                                                <div className='in-row wrapped'>
                                                    {bossesAvailableToday.filter(e => e.kind === eggIdxToKind(currentTier) && !getCountdownForBoss(e.speciesId) /*&& !gamemasterPokemon[e.speciesId].isShadow*/).map(e => 
                                                        <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                            <div className={`card-wrapper ${e.kind === "mega" || e.kind?.includes("5") || e.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                                                <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                            </div>
                                                        </div>
                                                    
                                                    )}
                                                </div>
                                                <div className='in-row wrapped'>
                                                    {bossesAvailableToday.filter(e => e.kind === eggIdxToKind(currentTier) && getCountdownForBoss(e.speciesId) /*&& !gamemasterPokemon[e.speciesId].isShadow*/).map(e => 
                                                        <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                            <div className={`card-wrapper ${e.kind === "mega" || e.kind?.includes("5") || e.kind?.includes("6") ? "with-golden-border" : ""}`}>
                                                                <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                    </div>}
                                </div>
                            </div>
                            </div>
                            </div>}
                            {tab.endsWith("/bosses") && leekPostsFetchCompleted && postsFetchCompleted &&
                            remainingBosses
                            .map(e => <div className='with-dynamic-max-width auto-margin-sides' key={getDateKey(e)}><div className='item default-padding'>
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
                            {tab.endsWith("/eggs") && postsFetchCompleted && seasonFetchCompleted && leekEggsFetchCompleted && <div className='with-dynamic-max-width auto-margin-sides'><div className='item default-padding'>
                                <div>
                                <div><strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>Current Eggs:</strong></div>
                                <div className="raid-container">
                                    <div className="overflowing">
                                        <div className="img-family">
                                            {[(leekEggs.eggs ?? []).filter(e => e.kind === "2"), (leekEggs.eggs ?? []).filter(e => e.kind === "5"), (leekEggs.eggs ?? []).filter(e => e.kind === "7"), (leekEggs.eggs ?? []).filter(e => e.kind === "10"), (leekEggs.eggs ?? []).filter(e => e.kind === "12")]
                                            .map((t, i) => (
                                                <div className="clickable" key={i} onClick={() => setCurrentEgg(String(i))}>
                                                    <strong className={`move-detail ${String(i) === currentEgg ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentEgg ? "extra-padding-right" : ""}`}>
                                                        <div className="img-padding"><img height={26} width={26} style={{width: "auto"}} alt="type" src={`${process.env.PUBLIC_URL}/images/eggs/${idxToEgg(i)}.png`}/></div>
                                                        {String(i) === currentEgg && idxToEggName(i)}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div></div>
                                <div className='with-flex contained'>
                                    {(leekEggs.eggs ?? []).filter(r => !r.comment && r.kind === String(idxToKind(+currentEgg))).sort(sortEntries).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                                        <div className={`card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                                </div>
                                {(leekEggs.eggs?.length ?? 0) > 0 && leekEggs.eggs!.some(e => e.comment && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'><strong>{leekEggs.eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment}:</strong></div>}
                                <div className='with-flex contained'>
                                    {(leekEggs.eggs ?? []).filter(r => r.comment && r.kind === String(idxToKind(+currentEgg))).sort(sortEntries).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                                        <div className={`card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                                </div>
                            </div></div>}
                            {tab.endsWith("/rockets") && leekRocketsFetchCompleted && <div className="moves-display-layout-big normal-text">
                                <div className="menu-item">
                                    <ul className={`calendar-list no-padding`}>
                                        {
                                            leekRockets.slice(0, x > 1002 ? Math.round(leekRockets.length / 2) : leekRockets.length).map(m => {
                                                const className = m.type ? `background-${m.type}` : "normal-entry";
                                                const resName = m.type ? `types/${m.type}.png` : m.trainerId.includes("Sierra") ? "NPC/sierra.webp" : m.trainerId.includes("Cliff") ? "NPC/cliff.webp" : m.trainerId.includes("Giovanni") ? "NPC/giovanni.webp" : m.trainerId.includes("Arlo") ? "NPC/arlo.webp" : m.trainerId.includes("Female") ? "NPC/female-grunt.png" : "NPC/male-grunt.webp";
                                                const url = `${process.env.PUBLIC_URL}/images/${resName}`;
                                                return (
                                                    <React.Fragment key={m.trainerId}>
                                                        {renderMove(m, url, className)}
                                                    </React.Fragment>
                                                )
                                            })
                                        }
                                    </ul>
                                </div>
                                {x > 1002 && <div className="menu-item">
                                    <ul className={`calendar-list no-padding`}>
                                        {
                                            leekRockets.slice(Math.round(leekRockets.length / 2)).map(m => {
                                                const className = m.type ? `background-${m.type}` : "normal-entry";
                                                const resName = m.type ? `types/${m.type}.png` : m.trainerId.includes("Sierra") ? "NPC/sierra.webp" : m.trainerId.includes("Cliff") ? "NPC/cliff.webp" : m.trainerId.includes("Giovanni") ? "NPC/giovanni.webp" : m.trainerId.includes("Arlo") ? "NPC/arlo.webp" : m.trainerId.includes("Female") ? "NPC/female-grunt.png" : "NPC/male-grunt.webp";
                                                const url = `${process.env.PUBLIC_URL}/images/${resName}`;
                                                return (
                                                    <React.Fragment key={m.trainerId}>
                                                        {renderMove(m, url, className)}
                                                    </React.Fragment>
                                                )
                                            })
                                        }
                                    </ul>
                                </div>}
                            </div>}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) < new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} collection={e.wild ?? []} post={e} sortEntries={sortEntries} withItemBorder/>)}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && <div className='with-dynamic-max-width auto-margin-sides'><div className='item default-padding'>
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
                            </div></div>}
                            {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) > new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} withItemBorder collection={e.wild ?? []} post={e} sortEntries={sortEntries}/>)}
                            {tab.endsWith("/events") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted && seasonFetchCompleted &&
                            <div className='with-small-margin-top with-xl-gap aligned'>{
                            [...posts.flat(), season].filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.researches?.length ?? 0) > 0) && new Date(p.dateEnd ?? 0) >= new Date()).sort(sortPosts).map(event =>
                                <div className="with-dynamic-max-width" key={event.subtitle + "-" + event.title}>
                                <div className={`column item ${new Date(event.date ?? 0) < new Date() ? "ongoing-event" : ""}`}>
                                    <div className='column '>
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
                                    {currentEvent === event.subtitle + "-" + event.title && <div className='with-medium-margin-bottom'>
                                        <EventDetail eventKey='event.subtitle + "-" + event.title' post={event} sortEntries={sortEntries}/>
                                    </div>}
                                </div>
                                
                                
                                {false && x <= 565 && currentEvent !== event.subtitle + "-" + event.title &&
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
    const [currTab, setCurrTab] = useState(post.bonuses ? "bonuses" : (post.wild?.length ?? 0) > 0 ? "spawns" : (post.raids?.length ?? 0) > 0 ? "raids" : "researches");
    const [currentPlace, setCurrentPlace] = useState("0");
    const [currentEgg, setCurrentEgg] = useState("0");

    const getCurrentEggCounter = () => {
        switch (currentEgg) {
            case "0":
                return "";
            case "1":
                return "4";
            case "2":
                return "5";
            case "3":
                return "6";
        }
    }

    const getEggDivider = () => {
        switch (currentEgg) {
            case "0":
                return "";
            case "1":
                return "Adventure Sync Rewards:";
            case "2":
                return "Routes Rewards:";
            case "3":
                return "Adventure Sync Rewards:";
        }
    }

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
    withItemBorder?: boolean;
}

const PostEntry = ({post, collection, sortEntries, kindFilter, withoutTitle, withRaidCPStringOverride, withItemBorder}: IPost) => {
    const {gamemasterPokemon} = usePokemon();
    const {days, hours, minutes, seconds} = useCountdown(post.dateEnd ?? 0);

    

    const now = new Date();
    const postIsNow = now > new Date(post.date) && now < new Date(post.dateEnd ?? 0);

    return <div className='with-dynamic-max-width auto-margin-sides'><div className={withItemBorder ? 'item default-padding' : ""}>
        {!withoutTitle && postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>At the moment <span className="computeCount">({computeCount(days, hours, minutes, seconds)})</span></strong>}
        {!withoutTitle && !postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>{inUpperCase(new Date(post.date).toLocaleString(undefined, smallOptions)) + " - " + inUpperCase(new Date(post.dateEnd ?? 0).toLocaleString(undefined, smallOptions))}</strong>}
        <div className='with-flex contained'>
        {collection.filter(k => !kindFilter || kindFilter === k.kind).sort(sortEntries).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
            <div className={`card-wrapper ${!post.isSeason && (p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6")) ? "with-golden-border" : ""}`}>
                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} cpStringOverride={withRaidCPStringOverride ? computeString(p.kind, gamemasterPokemon[p.speciesId].isShadow) : undefined} />
            </div>
        </div>)}
        </div></div>
    </div>
    
}