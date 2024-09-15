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
import { IEntry, IPostEntry, IRocketGrunt, sortEntries, sortPosts } from '../DTOs/INews';
import { useEffect, useState } from 'react';
import useCountdown from '../hooks/useCountdown';
import PokemonHeader from '../components/PokemonHeader';
import useResize from '../hooks/useResize';
import PokemonMiniature from '../components/PokemonMiniature';
import ListEntry from '../components/ListEntry';
import React from 'react';
import Select from "react-select";
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';
import { inCamelCase, localeStringSmallOptions, localeStringSmallestOptions } from '../utils/Misc';
import PostEntry from '../components/PostEntry';


const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const idxToPlace = (idx: number) => {
    switch (idx) {
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
    switch (idx) {
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
    switch (idx) {
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
    switch (idx) {
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

const Calendar = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { leekEggs, shadowRaids, shadowRaidsErrors, shadowRaidsFetchCompleted, leekRockets, leekRocketsErrors, leekRocketsFetchCompleted, leekEggsErrors, leekEggsFetchCompleted, bossesPerTier, posts, season, leekPosts, seasonFetchCompleted, seasonErrors, bossesFetchCompleted, postsFetchCompleted, leekPostsFetchCompleted, leekPostsErrors, bossesErrors, postsErrors } = useCalendar();
    const { pathname } = useLocation();
    const { x } = useResize();

    const { days, hours, minutes, seconds } = useCountdown(season?.dateEnd ?? 0);

    const { currentGameLanguage, currentLanguage } = useLanguage();
    const [currentPlace, setCurrentPlace] = useState("0");
    const [currentEvent, setCurrentEvent] = useState("");
    const [currentEgg, setCurrentEgg] = useState("0");
    const [currentBossDate, setCurrentBossDate] = useState("current");
    const [expandedRocket, setExpandedRocket] = useState(readSessionValue(ConfigKeys.ExpandedRocket) ?? "");

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

        return response.sort((a, b) => sortEntries(a, b, gamemasterPokemon));
    }

    const reducedLeekPosts = leekPosts.filter(p => (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date());
    const reducedRaids = posts.flat().filter(p => p && (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date());

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

    const bossesAvailable = (currentBossDate === "current" ? generateTodayBosses(additionalBosses) : additionalBosses.find(a => getDateKey(a) === currentBossDate)!.raids as IEntry[]).sort((a, b) => sortEntries(a, b, gamemasterPokemon));//generateFilteredBosses(additionalBosses);

    const raidEventEggs = [...(bossesAvailable.some(a => a.kind === "1") ? [{ label: "Tier 1", value: "0" }] : []), ...(bossesAvailable.some(a => a.kind === "3") ? [{ label: "Tier 3", value: "1" }] : []), ...(bossesAvailable.some(a => a.kind === "5" || a.kind === "mega") ? [{ label: "Special", value: "2" }] : [])];
    const firstRelevantEntryTierForDate = raidEventEggs[0]?.value ?? "";
    const [currentTier, setCurrentTier] = useState(firstRelevantEntryTierForDate);

    useEffect(() => {
        if (!raidEventEggs.some(e => e.value === currentTier)) {
            setCurrentTier(firstRelevantEntryTierForDate);
        }
    });

    const getMega = (speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }

    const pokemonBasePath = pathname.substring(0, pathname.lastIndexOf("/"));
    const tab = pathname.substring(pathname.lastIndexOf("/"));

    const remainingBosses = additionalBosses
        .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf())
        .sort(sortPosts);

    const renderMove = (m: IRocketGrunt, moveUrl: string, className: string) => {
        const colorVar = m.type ? `type-${m.type.substring(0, 1).toLocaleUpperCase() + m.type.substring(1)}` : undefined;

        return <ListEntry
            mainIcon={
                {
                    imageDescription: "",
                    image: <div className="img-padding guaranteedWidth"><img height={20} width={20} src={moveUrl} /></div>,
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
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>1</span>
                            <div className='in-row'>{m.tier1.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(0) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
                                    <div className={`card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(0) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(0)} />
                                    </div>
                                </div>
                            )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>2</span>
                            <div className='in-row'>{m.tier2.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(1) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
                                    <div className={`card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(1) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(1)} />
                                    </div>
                                </div>
                            )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>3</span>
                            <div className='in-row'>{m.tier3.map(id =>
                                <div key={id} className="card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(2) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
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
        switch (idx) {
            case "0":
                return ["1"];
            case "1":
                return ["3"];
            case "2":
                return ["5", "mega"];
            default:
                return [];
        }
    }

    const raidEventDates = [{ label: "Current", value: "current" }, ...remainingBosses.map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)];

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
                            <div className="pokemon with-small-margin-top with-medium-gap">
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
                                                formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img className='invert-dark-mode' src={`${process.env.PUBLIC_URL}/images/calendar.png`} style={{ width: "auto" }} height={16} width={16} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                                            />
                                        </div>
                                        <div>
                                            <Select
                                                className={`navbar-dropdown-family`}
                                                isSearchable={false}
                                                value={raidEventEggs.find(o => o.value === currentTier)}
                                                options={raidEventEggs}
                                                onChange={e => setCurrentTier((e as any).value)}
                                                formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img src={`${process.env.PUBLIC_URL}/images/raid-eggs/${data.value}.png`} style={{ width: "auto" }} height={26} width={26} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                                            />
                                        </div>
                                    </div>
                                }
                                {tab.endsWith("/bosses") && bossesFetchCompleted && leekPostsFetchCompleted && postsFetchCompleted &&
                                    <div className='with-xl-gap'>
                                        {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && (currentTier === "2" || !gamemasterPokemon[e.speciesId].isShadow)).length > 0 &&
                                            <div className='with-dynamic-max-width auto-margin-sides'>
                                                <div className='item default-padding'>
                                                    <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>
                                                        {`${raidEventEggs.find(o => o.value === currentTier)?.label} Bosses`}
                                                    </strong>
                                                    <div className='with-flex with-margin-top contained'>
                                                        <div className='row-container'>
                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && (currentTier === "2" || !gamemasterPokemon[e.speciesId].isShadow)).length > 0 &&
                                                                <div className='in-row round-border'>
                                                                    <div className='in-column'>
                                                                        <div className='in-row wrapped'>
                                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && !getCountdownForBoss(e.speciesId) && (currentTier === "2" || !gamemasterPokemon[e.speciesId].isShadow)).map(e =>
                                                                                <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                                                    <div className={`card-wrapper`}>
                                                                                        <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className='in-row wrapped'>
                                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && getCountdownForBoss(e.speciesId) && (currentTier === "2" || !gamemasterPokemon[e.speciesId].isShadow)).map(e =>
                                                                                <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                                                    <div className={`card-wrapper`}>
                                                                                        <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                        {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && currentTier !== "2" && gamemasterPokemon[e.speciesId].isShadow).length > 0 &&
                                            <div className='with-dynamic-max-width auto-margin-sides'>
                                                <div className='item default-padding'>
                                                    <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>
                                                        {`${raidEventEggs.find(o => o.value === currentTier)?.label} Shadow Bosses`}
                                                    </strong>
                                                    <div className='with-flex with-margin-top contained'>
                                                        <div className='row-container'>
                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && currentTier !== "2" && gamemasterPokemon[e.speciesId].isShadow).length > 0 &&
                                                                <div className='in-row round-border'>
                                                                    <div className='in-column'>
                                                                        <div className='in-row wrapped'>
                                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && currentTier !== "2" && !getCountdownForBoss(e.speciesId) && gamemasterPokemon[e.speciesId].isShadow).map(e =>
                                                                                <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                                                    <div className={`card-wrapper`}>
                                                                                        <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className='in-row wrapped'>
                                                                            {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && currentTier !== "2" && getCountdownForBoss(e.speciesId) && gamemasterPokemon[e.speciesId].isShadow).map(e =>
                                                                                <div className="card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                                                    <div className={`card-wrapper`}>
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
                                    </div>
                                }
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
                                                                    <div className="img-padding"><img height={26} width={26} style={{ width: "auto" }} alt="type" src={`${process.env.PUBLIC_URL}/images/eggs/${idxToEgg(i)}.png`} /></div>
                                                                    {String(i) === currentEgg && idxToEggName(i)}
                                                                </strong>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div></div>
                                    <div className='with-flex contained'>
                                        {(leekEggs.eggs ?? []).filter(r => !r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                                            <div className={`card-wrapper`}>
                                                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                            </div>
                                        </div>)}
                                    </div>
                                    {(leekEggs.eggs?.length ?? 0) > 0 && leekEggs.eggs!.some(e => e.comment && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'><strong>{leekEggs.eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment}:</strong></div>}
                                    <div className='with-flex contained'>
                                        {(leekEggs.eggs ?? []).filter(r => r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
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
                                {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) < new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} collection={e.wild ?? []} post={e} withItemBorder />)}
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
                                                                    <div className="img-padding"><img className="invert-light-mode" height={26} width={26} alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`} /></div>
                                                                    {String(i) === currentPlace && idxToPlace(i)}
                                                                </strong>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div></div>
                                    <div className='with-flex contained'>
                                        {(season.wild ?? []).filter(r => r.kind === currentPlace).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId} className="card-wrapper-padding dynamic-size">
                                            <div className={`card-wrapper`}>
                                                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                            </div>
                                        </div>)}
                                    </div>
                                </div></div>}
                                {tab.endsWith("/spawns") && postsFetchCompleted && seasonFetchCompleted && posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) > new Date()).sort(sortPosts).map(e => <PostEntry key={getDateKey(e)} withItemBorder collection={e.wild ?? []} post={e} />)}
                                
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

const EventDetail = ({ eventKey, post, sortEntries }: IEventDetail) => {
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
        <div className='divider' />
        <nav className="navigation-header normal-text">
            <ul>
                {post.bonuses && <li>
                    <div onClick={() => setCurrTab("bonuses")} className={"header-tab no-full-border " + (currTab === "bonuses" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/bonus.png`} /><span>Bonuses</span>
                    </div>
                </li>}
                {(post.wild?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("spawns")} className={"header-tab no-full-border " + (currTab === "spawns" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/wild.webp`} /><span>Spawns</span>
                    </div>
                </li>}
                {(post.raids?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("raids")} className={"header-tab no-full-border " + (currTab === "raids" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk raid-img-with-contrast'} src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`} /><span>Raids</span>
                    </div>
                </li>}
                {(post.researches?.length ?? 0) > 0 && <li>
                    <div onClick={() => setCurrTab("researches")} className={"header-tab no-full-border " + (currTab === "researches" ? "selected" : "")}>
                        <img width="16" height="16" className={'active-perk'} src={`${process.env.PUBLIC_URL}/images/research.png`} /><span>Researches</span>
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
                                    <div className="season-img-padding"><img className="invert-light-mode" height="100%" width="100%" alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`} /></div>
                                    {String(i) === currentPlace && idxToPlace(i)}
                                </strong>
                            </div>
                        ))}
                </div>
            </div>
        </div>}
        {currTab === "spawns" && <PostEntry collection={post.wild ?? []} withoutTitle={true} post={post} kindFilter={post.isSeason ? currentPlace : undefined} />}
        {currTab === "raids" && <PostEntry collection={post.raids ?? []} withRaidCPStringOverride={true} withoutTitle={true} post={post} />}
        {currTab === "researches" && <PostEntry collection={post.researches ?? []} withoutTitle={true} post={post}  />}
        {currTab === "bonuses" && post.bonuses && <div className='default-padding bonus-container less-contained'>
            {post.bonuses.split("\n").filter(b => b).map(b => <ul key={b} className='ul-with-adorner'>{b}</ul>)}
        </div>}
    </div>;
}