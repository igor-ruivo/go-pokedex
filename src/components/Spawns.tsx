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

const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const Spawns = () => {
    const { gamemasterPokemon, errors, fetchCompleted } = usePokemon();
    const {currentLanguage} = useLanguage();
    const { posts, postsFetchCompleted, postsErrors, season, seasonFetchCompleted, seasonErrors } = useCalendar();
    const currPosts = useMemo(() => postsFetchCompleted ? posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) < new Date()) : []
    , [postsFetchCompleted, posts]);
    const [currentBossDate, setCurrentBossDate] = useState(currPosts.length > 0 ? "current" : "season");
    const [currentPlace, setCurrentPlace] = useState("0");

    const raidEventDates = useMemo(() => [...(currPosts.length > 0 ? [{ label: translator(TranslatorKeys.Current, currentLanguage), value: "current" }] : []), { label: translator(TranslatorKeys.Season, currentLanguage), value: "season" }, ...posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) > new Date()).sort(sortPosts).map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)]
    , [currPosts, currentLanguage, posts]);

    const selectedPosts = useMemo(() => currentBossDate === "season" ? [season] : currentBossDate === "current" ? currPosts : posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === currentBossDate)
    , [currentBossDate, season, currPosts, posts]);

    useEffect(() => {
        if (postsFetchCompleted && seasonFetchCompleted && currPosts.length > 0) {
            setCurrentBossDate("current");
        }
    }, [currPosts, setCurrentBossDate, postsFetchCompleted, seasonFetchCompleted]);

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

    return <LoadingRenderer errors={postsErrors + errors + seasonErrors} completed={postsFetchCompleted && seasonFetchCompleted && fetchCompleted && !!season}>
        <div className='boss-header-filters with-margin-top'>
            <div className='raid-date-element'>
                <Select
                    className={`navbar-dropdown-family`}
                    isSearchable={false}
                    value={raidEventDates.find(o => o.value === currentBossDate)}
                    options={raidEventDates}
                    onChange={e => setCurrentBossDate((e as any).value)}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img className='invert-dark-mode' src={`${process.env.PUBLIC_URL}/images/calendar.png`} alt='calendar' style={{ width: "auto" }} height={16} width={16} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                />
            </div>
        </div>
        <div className='with-dynamic-max-width auto-margin-sides'>
            <div className='item default-padding with-margin-top'>
                <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                    <strong>{translator(TranslatorKeys.FeaturedSpawns, currentLanguage)}</strong>
                </div>
                {currentBossDate === "season" &&
                    <div className="raid-container">
                        <div className="overflowing">
                            <div className="img-family">
                                {[(season?.wild ?? []).filter(e => e.kind === "0"), (season?.wild ?? []).filter(e => e.kind === "1"), (season?.wild ?? []).filter(e => e.kind === "2"), (season?.wild ?? []).filter(e => e.kind === "3"), (season?.wild ?? []).filter(e => e.kind === "4"), (season?.wild ?? []).filter(e => e.kind === "5")]
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
                    </div>}
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
                                    </div>)))}
                </div>
            </div>
        </div>
    </LoadingRenderer>;
}

export default Spawns;