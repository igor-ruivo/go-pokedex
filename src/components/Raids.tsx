import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { IEntry, IPostEntry, sortEntries, sortPosts } from "../DTOs/INews";
import { inCamelCase, localeStringSmallestOptions } from "../utils/Misc";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import { usePokemon } from "../contexts/pokemon-context";
import PokemonMiniature from "./PokemonMiniature";
import translator, { TranslatorKeys } from "../utils/Translator";
import { Language, useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import Section from "./Template/Section";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";

const Raids = () => {
    const {currentLanguage, currentGameLanguage} = useLanguage();

    const { bossesPerTier, leekPosts, posts, leekPostsFetchCompleted, postsFetchCompleted, leekPostsErrors, postsErrors, bossesFetchCompleted } = useCalendar();
    const {gamemasterPokemon, errors, fetchCompleted} = usePokemon();

    const reducedLeekPosts = useMemo(() => leekPostsFetchCompleted ? leekPosts.filter(p => (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : []
    , [leekPostsFetchCompleted, leekPosts]);
    const reducedRaids = useMemo(() => postsFetchCompleted ? posts.flat().filter(p => p && (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : []
    , [postsFetchCompleted, posts]);

    const getDateKey = useCallback((obj: IPostEntry) => {const d = new Date(obj?.date ?? 0); return `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}`}, []);

    const additionalBosses = useMemo(() => Object.entries([...reducedLeekPosts, ...reducedRaids]
        .reduce((acc: { [key: string]: IPostEntry }, obj) => {
            const key = getDateKey(obj);
            if (acc[key]) {
                const mergedRaids = [...(acc[key].raids ?? []), ...(obj.raids ?? [])];
                acc[key].raids = mergedRaids.filter((raid, index, self) =>
                    index === self.findIndex((r) => r.speciesId === raid.speciesId)
                );
            } else {
                acc[key] = {
                    title: obj.title,
                    imgUrl: obj.imgUrl,
                    date: obj.date,
                    dateEnd: obj.dateEnd,
                    raids: obj.raids
                };
            }
            return acc;
        }, {}))
        .map(([key, value]) => ({
            title: value.title,
            imgUrl: value.imgUrl,
            date: value.date,
            dateEnd: value.dateEnd,
            raids: value.raids
        } as IPostEntry)), [reducedLeekPosts, reducedRaids, getDateKey]);

    const remainingBosses = useMemo(() => additionalBosses
        .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf())
        .sort(sortPosts), [additionalBosses]);

    const generateTodayBosses = useCallback((entries: IPostEntry[]) => {
        if (!bossesFetchCompleted || !leekPostsFetchCompleted || !postsFetchCompleted) {
            return [];
        }

        const seenIds = new Set<string>([...(bossesPerTier.raids ?? []).map(e => e.speciesId)]);
        const response = [...(bossesPerTier.raids ?? [])];

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
    }, [bossesFetchCompleted, leekPostsFetchCompleted, postsFetchCompleted, bossesPerTier, gamemasterPokemon]);

    const raidEventDates = useMemo(() => [{ label: translator(TranslatorKeys.Current, currentLanguage), value: "current" }, ...remainingBosses.map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)]
    , [currentLanguage, getDateKey, remainingBosses]);

    
    const [currentBossDate, setCurrentBossDate] = useState(raidEventDates.some(f => f.value === (readSessionValue(ConfigKeys.ExpandedRaidDate) ?? "current")) ? (readSessionValue(ConfigKeys.ExpandedRaidDate) ?? "current") : "current");

    const bossesAvailable = useMemo(() => (currentBossDate === "current" ? generateTodayBosses(additionalBosses) : additionalBosses.find(a => getDateKey(a) === currentBossDate)!.raids as IEntry[]).sort((a, b) => sortEntries(a, b, gamemasterPokemon))
    , [currentBossDate, additionalBosses, generateTodayBosses, getDateKey, gamemasterPokemon]);

    const raidEventEggs = useMemo(() => [...(bossesAvailable.some(a => a.kind === "1") ? [{ label: translator(TranslatorKeys.Tier, currentLanguage) + " 1", value: "0" }] : []), ...(bossesAvailable.some(a => a.kind === "3") ? [{ label: translator(TranslatorKeys.Tier, currentLanguage) + " 3", value: "1" }] : []), ...(bossesAvailable.some(a => a.kind === "5" || a.kind === "mega") ? [{ label: translator(TranslatorKeys.SpecialBosses, currentLanguage), value: "2" }] : []), { label: translator(TranslatorKeys.AllTiers, currentLanguage), value: "3" }]
    , [bossesAvailable, currentLanguage]);
    const firstRelevantEntryTierForDate = useMemo(() => raidEventEggs.filter(k => k.value === "3")[0]?.value ?? (raidEventEggs[0]?.value ?? ""), [raidEventEggs]);
    const [currentTier, setCurrentTier] = useState(readSessionValue(ConfigKeys.ExpandedRaidTier) === null ? firstRelevantEntryTierForDate : raidEventEggs.some(f => f.value === readSessionValue(ConfigKeys.ExpandedRaidTier)) ? readSessionValue(ConfigKeys.ExpandedRaidTier) : firstRelevantEntryTierForDate);

    useEffect(() => {
        if (!raidEventEggs.some(e => e.value === currentTier)) {
            setCurrentTier(firstRelevantEntryTierForDate);
            writeSessionValue(ConfigKeys.ExpandedRaidTier, firstRelevantEntryTierForDate);
        }
    }, [raidEventEggs, currentTier, setCurrentTier, firstRelevantEntryTierForDate]);
    
    const getCountdownForBoss = useCallback((speciesId: string) => [...reducedLeekPosts, ...reducedRaids].sort(sortPosts).find(d => d.date <= new Date().valueOf() && (d.raids ?? []).some(f => f.speciesId === speciesId))?.dateEnd
    , [reducedLeekPosts, reducedRaids]);

    const eggIdxToKind = useCallback((idx: string) => {
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
    }, []);

    const getMega = useCallback((speciesId: string) => {
        const original = gamemasterPokemon[speciesId];
        return Object.values(gamemasterPokemon).find(p => p.dex === original.dex && !p.aliasId && p.isMega);
    }, [gamemasterPokemon]);

    return <LoadingRenderer errors={postsErrors + leekPostsErrors + errors} completed={postsFetchCompleted && leekPostsFetchCompleted && fetchCompleted}>
        <div className='boss-header-filters with-margin-top'>
            <div className='raid-date-element'>
                <Select
                    className={`navbar-dropdown-family`}
                    isSearchable={false}
                    value={raidEventDates.find(o => o.value === currentBossDate)}
                    options={raidEventDates}
                    onChange={e => {setCurrentBossDate((e as any).value); writeSessionValue(ConfigKeys.ExpandedRaidDate, (e as any).value)}}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img alt='calendar' className='invert-dark-mode' src={`${process.env.PUBLIC_URL}/images/calendar.png`} style={{ width: "auto" }} height={16} width={16} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                />
            </div>
            <div>
                <Select
                    className={`navbar-dropdown-family`}
                    isSearchable={false}
                    value={raidEventEggs.find(o => o.value === currentTier)}
                    options={raidEventEggs}
                    onChange={e => {setCurrentTier((e as any).value); 
                        writeSessionValue(ConfigKeys.ExpandedRaidTier, (e as any).value);}}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img alt='egg' className="with-img-dropShadow" src={`${process.env.PUBLIC_URL}/images/raid-eggs/${data.value}.png`} style={{ width: "auto" }} height={22} width={22} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                />
            </div>
        </div>
        <div className='with-xl-gap with-margin-top'>
            {raidEventEggs.sort((i1, i2) => i2.value.localeCompare(i1.value)).filter(egg => egg.value !== "3" && (egg.value === currentTier || currentTier === "3")).map(egg => bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && (egg.value === "2" || !gamemasterPokemon[e.speciesId].isShadow)).length > 0 &&
                <Section special={egg.value === "2"} key={egg.value} title={`${currentLanguage !== Language.English ? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage) : ''} ${raidEventEggs.find(o => o.value === egg.value)?.label} ${currentLanguage === Language.English ? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage) : ''}`}>
                    <div className='with-flex with-margin-top contained'>
                        <div className='row-container'>
                            {bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && (egg.value === "2" || !gamemasterPokemon[e.speciesId].isShadow)).length > 0 &&
                                <div className='in-row round-border'>
                                    <div className='in-column'>
                                        <div className='in-row wrapped contained'>
                                            {bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && (egg.value === "2" || !gamemasterPokemon[e.speciesId].isShadow)).sort((p1: IEntry, p2: IEntry) => {
                                                if (currentBossDate !== "current") {
                                                    return 0;
                                                }

                                                if (getCountdownForBoss(p1.speciesId) && !getCountdownForBoss(p2.speciesId)) {
                                                    return -1;
                                                }
                                                
                                                if (getCountdownForBoss(p2.speciesId) && !getCountdownForBoss(p1.speciesId)) {
                                                    return 1;
                                                }

                                                return 0;
                                            }).map(e =>
                                                <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                    <div className={`mini-card-wrapper`}>
                                                        <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={currentBossDate === "current" ? getCountdownForBoss(e.speciesId) : undefined} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </Section>
                )
            }

            {raidEventEggs.sort((i1, i2) => i2.value.localeCompare(i1.value)).filter(egg => egg.value !== "3" && (egg.value === currentTier || currentTier === "3")).map(egg => bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && egg.value !== "2" && gamemasterPokemon[e.speciesId].isShadow).length > 0 &&
                <Section key={egg.value} title={`${currentLanguage !== Language.English ? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage) : ''} ${raidEventEggs.find(o => o.value === egg.value)?.label} ${currentLanguage === Language.English ? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage) : ''} ${gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)}`} darker>
                    <div className='with-flex with-margin-top contained'>
                        <div className='row-container'>
                            {bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && egg.value !== "2" && gamemasterPokemon[e.speciesId].isShadow).length > 0 &&
                                <div className='in-row round-border'>
                                    <div className='in-column'>
                                        <div className='in-row wrapped contained'>
                                            {bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && egg.value !== "2" && !getCountdownForBoss(e.speciesId) && gamemasterPokemon[e.speciesId].isShadow).map(e =>
                                                <div className="mini-card-wrapper-padding dynamic-size" key={e.speciesId}>
                                                    <div className={`mini-card-wrapper`}>
                                                        <PokemonMiniature pokemon={e.speciesId.includes("mega") ? getMega(e.speciesId) ?? gamemasterPokemon[e.speciesId] : gamemasterPokemon[e.speciesId]} cpStringOverride="" withCountdown={getCountdownForBoss(e.speciesId)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className='in-row wrapped contained'>
                                            {bossesAvailable.filter(e => eggIdxToKind(egg.value).includes(e.kind ?? "") && egg.value !== "2" && getCountdownForBoss(e.speciesId) && gamemasterPokemon[e.speciesId].isShadow).map(e =>
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
                </Section>)
            }
        </div>
    </LoadingRenderer>;
}

export default Raids;