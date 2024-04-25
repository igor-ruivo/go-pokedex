import { useEffect, useState } from "react";
import Select from "react-select";
import { IEntry, IPostEntry, sortEntries, sortPosts } from "../DTOs/INews";
import { inCamelCase, localeStringSmallestOptions } from "../utils/Misc";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import { usePokemon } from "../contexts/pokemon-context";
import PokemonMiniature from "./PokemonMiniature";

const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const Raids = () => {
    const [currentBossDate, setCurrentBossDate] = useState("current");

    const { shadowRaids, bossesPerTier, leekPosts, posts, leekPostsFetchCompleted, postsFetchCompleted, leekPostsErrors, postsErrors, bossesFetchCompleted, shadowRaidsFetchCompleted } = useCalendar();
    const {gamemasterPokemon, errors, fetchCompleted} = usePokemon();

    const reducedLeekPosts = leekPostsFetchCompleted ? leekPosts.filter(p => (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : [];
    const reducedRaids = postsFetchCompleted ? posts.flat().filter(p => p && (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : [];

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

    const remainingBosses = additionalBosses
        .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf())
        .sort(sortPosts);

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

    const raidEventDates = [{ label: "Current", value: "current" }, ...remainingBosses.map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)];
    const bossesAvailable = (currentBossDate === "current" ? generateTodayBosses(additionalBosses) : additionalBosses.find(a => getDateKey(a) === currentBossDate)!.raids as IEntry[]).sort((a, b) => sortEntries(a, b, gamemasterPokemon));//generateFilteredBosses(additionalBosses);

    const raidEventEggs = [...(bossesAvailable.some(a => a.kind === "1") ? [{ label: "Tier 1", value: "0" }] : []), ...(bossesAvailable.some(a => a.kind === "3") ? [{ label: "Tier 3", value: "1" }] : []), ...(bossesAvailable.some(a => a.kind === "5" || a.kind === "mega") ? [{ label: "Special", value: "2" }] : [])];
    const firstRelevantEntryTierForDate = raidEventEggs.filter(k => k.value === "2")[0]?.value ?? (raidEventEggs[0]?.value ?? "");
    const [currentTier, setCurrentTier] = useState(firstRelevantEntryTierForDate);

    useEffect(() => {
        if (!raidEventEggs.some(e => e.value === currentTier)) {
            setCurrentTier(firstRelevantEntryTierForDate);
        }
    });
    
    const getCountdownForBoss = (speciesId: string) => additionalBosses.sort(sortPosts).find(d => d.date <= new Date().valueOf() && (d.raids ?? []).some(f => f.speciesId === speciesId))?.dateEnd;

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

    const getMega = (speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }

    return <LoadingRenderer errors={postsErrors + leekPostsErrors + errors} completed={postsFetchCompleted && leekPostsFetchCompleted && fetchCompleted}>
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
        <div className='with-xl-gap with-margin-top'>
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
                                                    <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                        <div className={`mini-card-wrapper`}>
                                                            <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className='in-row wrapped'>
                                                {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && getCountdownForBoss(e.speciesId) && (currentTier === "2" || !gamemasterPokemon[e.speciesId].isShadow)).map(e =>
                                                    <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                        <div className={`mini-card-wrapper`}>
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
                                                    <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                        <div className={`mini-card-wrapper`}>
                                                            <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className='in-row wrapped'>
                                                {bossesAvailable.filter(e => eggIdxToKind(currentTier).includes(e.kind ?? "") && currentTier !== "2" && getCountdownForBoss(e.speciesId) && gamemasterPokemon[e.speciesId].isShadow).map(e =>
                                                    <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                        <div className={`mini-card-wrapper`}>
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
    </LoadingRenderer>;
}

export default Raids;