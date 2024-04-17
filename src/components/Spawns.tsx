import { IPostEntry, sortPosts } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import Select from "react-select";
import PokemonMiniature from "./PokemonMiniature";
import { useState } from "react";
import { inCamelCase, localeStringSmallestOptions } from "../utils/Misc";

const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const Spawns = () => {
    const { gamemasterPokemon, errors, fetchCompleted } = usePokemon();
    const { posts, postsFetchCompleted, postsErrors, season, seasonFetchCompleted, seasonErrors } = useCalendar();
    const [currentBossDate, setCurrentBossDate] = useState("current");
    const [currentPlace, setCurrentPlace] = useState("0");

    const raidEventDates = [{ label: "Current", value: "current" }, { label: "Season", value: "season" }, ...posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) > new Date()).sort(sortPosts).map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)];

    const selectedPosts = currentBossDate === "season" ? [season] : currentBossDate === "current" ? posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date() && new Date(p.date) < new Date()) : posts.flat().filter(p => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === currentBossDate);

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

    return <LoadingRenderer errors={postsErrors + errors + seasonErrors} completed={postsFetchCompleted && seasonFetchCompleted && fetchCompleted}>
        <div className='boss-header-filters with-margin-top'>
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
        </div>
        <div className='item default-padding with-margin-top'>
            <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                <strong>Wild Spawns</strong>
            </div>
            {currentBossDate === "season" &&
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
                </div>}
            <div className={`with-flex contained ${currentBossDate !== "season" ? "with-margin-top" : ""}`}>
                {selectedPosts
                    .sort(sortPosts)
                    .map(t => (
                        t.wild!
                            .filter(r => currentBossDate !== "season" || r.kind === currentPlace).map(p =>
                                <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                    <div className={`mini-card-wrapper`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                    </div>
                                </div>)))}
            </div>
        </div>
    </LoadingRenderer>;
}

export default Spawns;