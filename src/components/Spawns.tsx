import { IPostEntry, sortPosts } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import Select from "react-select";
import PokemonMiniature from "./PokemonMiniature";
import { useCallback, useEffect, useMemo, useState } from "react";
import { inCamelCase, localeStringSmallestOptions } from "../utils/Misc";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import Section from "./Template/Section";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";

const getDateKey = (obj: IPostEntry) => String(obj?.startDate?.valueOf()) + "-" + String(obj?.endDate?.valueOf());

const Spawns = () => {
    const { gamemasterPokemon, errors, fetchCompleted } = usePokemon();
    const {currentLanguage} = useLanguage();
    const { posts, postsFetchCompleted, errorLoadingPosts, season, seasonFetchCompleted, errorLoadingSeason } = useCalendar();
    const currPosts = useMemo(() => postsFetchCompleted && posts ? posts.filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.endDate ?? 0) >= new Date() && new Date(p.startDate) < new Date()) : []
    , [postsFetchCompleted, posts]);
    const [currentBossDate, setCurrentBossDate] = useState(readSessionValue(ConfigKeys.ExpandedSpawnDate) === null ? (currPosts.length > 0 ? "current" : "season") : ((postsFetchCompleted && posts && posts.some(p => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === readSessionValue(ConfigKeys.ExpandedSpawnDate))) || readSessionValue(ConfigKeys.ExpandedSpawnDate) === "current" || readSessionValue(ConfigKeys.ExpandedSpawnDate) === "session" ? readSessionValue(ConfigKeys.ExpandedSpawnDate) : (currPosts.length > 0 ? "current" : "season")));
    const [currentPlace, setCurrentPlace] = useState(readSessionValue(ConfigKeys.ExpandedArea) ?? "0");

    const raidEventDates = useMemo(() => [...(currPosts.length > 0 ? [{ label: translator(TranslatorKeys.Current, currentLanguage), value: "current" }] : []), { label: translator(TranslatorKeys.Season, currentLanguage), value: "season" }, ...(posts ?? []).filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.endDate ?? 0) >= new Date() && new Date(p.startDate) > new Date()).sort(sortPosts).map(e => ({ label: inCamelCase(new Date(e.startDate).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)]
    , [currPosts, currentLanguage, posts]);

    const selectedPosts = useMemo(() => currentBossDate === "season" && seasonFetchCompleted && season ? [season] : currentBossDate === "current" ? currPosts : (posts ?? []).filter(p => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === currentBossDate)
    , [currentBossDate, season, currPosts, posts, seasonFetchCompleted]);

    useEffect(() => {
        if (postsFetchCompleted && seasonFetchCompleted && currPosts.length > 0) {
            setCurrentBossDate(readSessionValue(ConfigKeys.ExpandedSpawnDate) === null ? (currPosts.length > 0 ? "current" : "season") : ((posts && postsFetchCompleted && posts.some(p => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === readSessionValue(ConfigKeys.ExpandedSpawnDate))) || readSessionValue(ConfigKeys.ExpandedSpawnDate) === "current" || readSessionValue(ConfigKeys.ExpandedSpawnDate) === "session" ? readSessionValue(ConfigKeys.ExpandedSpawnDate) : (currPosts.length > 0 ? "current" : "season")));
        }
    }, [currPosts, setCurrentBossDate, postsFetchCompleted, seasonFetchCompleted, posts]);

    const idxToPlace = useCallback((idx: number) => {
        switch (idx) {
            case 0:
                return translator(TranslatorKeys.Cities, currentLanguage);;
            case 1:
                return translator(TranslatorKeys.Forests, currentLanguage);;
            case 2:
                return translator(TranslatorKeys.Mountains, currentLanguage);;
            case 3:
                return translator(TranslatorKeys.Beaches, currentLanguage);;
            case 4:
                return translator(TranslatorKeys.Northen, currentLanguage);;
            case 5:
                return translator(TranslatorKeys.Southern, currentLanguage);;
        }
    }, [currentLanguage]);

    const idxToRes = useCallback((idx: number) => {
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
    }, []);

    return <LoadingRenderer errors={errorLoadingPosts + errors + errorLoadingSeason} completed={postsFetchCompleted && seasonFetchCompleted && fetchCompleted && !!season}>
        {() => <><div className='boss-header-filters with-margin-top with-margin-bottom'>
            <div className='raid-date-element'>
                <Select
                    className={`navbar-dropdown-family`}
                    isSearchable={false}
                    value={raidEventDates.find(o => o.value === currentBossDate)}
                    options={raidEventDates}
                    onChange={e => {setCurrentBossDate((e as any).value); writeSessionValue(ConfigKeys.ExpandedSpawnDate, (e as any).value)}}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img className='invert-dark-mode' src={`${process.env.PUBLIC_URL}/images/calendar.png`} alt='calendar' style={{ width: "auto" }} height={16} width={16} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                />
            </div>
        </div>
        <Section title={translator(TranslatorKeys.FeaturedSpawns, currentLanguage)}>
            <div>
                {currentBossDate === "season" &&
                    <div className="raid-container">
                        <div className="overflowing">
                            <div className="img-family">
                                {[season.wild.filter(e => e.kind === "0"), season.wild.filter(e => e.kind === "1"), season.wild.filter(e => e.kind === "2"), season.wild.filter(e => e.kind === "3"), season.wild.filter(e => e.kind === "4"), season.wild.filter(e => e.kind === "5")]
                                    .map((t, i) => (
                                        <div className="clickable" key={i} onClick={() => {setCurrentPlace(String(i)); writeSessionValue(ConfigKeys.ExpandedArea, String(i))}}>
                                            <strong className={`small-move-detail ${String(i) === currentPlace ? "soft" : "baby-soft"} smallish-padding normal-text item ${String(i) === currentPlace ? "small-extra-padding-right" : ""}`}>
                                                <div className="img-padding"><img className="invert-light-mode" height={22} width={22} alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`} /></div>
                                                {String(i) === currentPlace && idxToPlace(i)}
                                            </strong>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                }
                <div className={`with-flex contained ${currentBossDate !== "season" ? "with-margin-top" : ""}`}>
                    {selectedPosts
                        .sort(sortPosts)
                        .map(t => (
                            t?.wild!
                                .filter(r => currentBossDate !== "season" || r.kind === currentPlace).map(p =>
                                    <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                        <div className={`mini-card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)))
                    }
                </div>
            </div>
        </Section></>}
    </LoadingRenderer>;
}

export default Spawns;