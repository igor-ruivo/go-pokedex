import { createContext, useCallback, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, cacheTtlInMillis, calendarCache, corsProxyUrl, leekBaseUrl, leekEggsUrl, leekNewsUrl, leekRocketsUrl, pokemonGoBaseUrl, pokemonGoNewsUrl, pokemonGoSeasonRelativeUrl, shadowRaidsAPI } from '../utils/Configs';
import { mapLeekEggs, mapLeekNews, mapLeekRockets, mapPosts, mapRaidBosses, mapSeason, mapShadowRaids } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';
import { IPostEntry, IRocketGrunt } from '../DTOs/INews';

interface CalendarContextType {
    bossesPerTier: IPostEntry;
    posts: IPostEntry[][];
    season: IPostEntry;
    leekPosts: IPostEntry[];
    leekEggs: IPostEntry;
    leekRockets: IRocketGrunt[];
    shadowRaids: IPostEntry;
    bossesFetchCompleted: boolean;
    postsFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    leekPostsFetchCompleted: boolean;
    leekEggsFetchCompleted: boolean;
    leekRocketsFetchCompleted: boolean;
    shadowRaidsFetchCompleted: boolean;
    bossesErrors: string;
    postsErrors: string;
    seasonErrors: string;
    leekPostsErrors: string;
    leekEggsErrors: string;
    leekRocketsErrors: string;
    shadowRaidsErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [IPostEntry, IPostEntry[][], IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], IPostEntry, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted, errorLoadingnews]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<IPostEntry[]> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<IPostEntry> = useFetchUrls();
    const [bosses, fetchBosses, bossesFetchCompleted, errorLoadingBosses]: FetchData<IPostEntry> = useFetchUrls();
    const [leekNews, fetchLeekNews, leekNewsFetchCompleted, errorLoadingLeekNews]: FetchData<string> = useFetchUrls();
    const [leekPosts, fetchLeekPosts, leekPostsFetchCompleted, errorLoadingLeekPosts]: FetchData<IPostEntry> = useFetchUrls();
    const [leekEggs, fetchLeekEggs, leekEggsFetchCompleted, errorLoadingLeekEggs]: FetchData<IPostEntry> = useFetchUrls();
    const [leekRockets, fetchLeekRockets, leekRocketsFetchCompleted, errorLoadingLeekRockets]: FetchData<IRocketGrunt[]> = useFetchUrls();
    const [shadowRaids, fetchShadowRaids, shadowRaidsFetchCompleted, errorLoadingShadowRaids]: FetchData<IPostEntry> = useFetchUrls();
    
    const encodeProxyUrl = useCallback((relativeComponent: string) => corsProxyUrl + encodeURIComponent(pokemonGoBaseUrl + relativeComponent), []);

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();

        fetchBosses([bossesUrl], calendarCache, {signal: controller.signal}, (data: any) => mapRaidBosses(data, gamemasterPokemon));
        fetchLeekNews([leekNewsUrl], calendarCache, {signal: controller.signal}/*, (data: any) => mapLeekNews(data, gamemasterPokemon)*/);
        fetchNews([corsProxyUrl + pokemonGoNewsUrl], calendarCache, {signal: controller.signal}, undefined, true/*, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon)*/);
        fetchSeason([encodeProxyUrl(pokemonGoSeasonRelativeUrl)], cacheTtlInMillis, {signal: controller.signal}, (data: any) => mapSeason(data, gamemasterPokemon));
        fetchLeekEggs([leekEggsUrl], calendarCache, {signal: controller.signal}, (data: any) => mapLeekEggs(data, gamemasterPokemon));
        fetchLeekRockets([leekRocketsUrl], calendarCache, {signal: controller.signal}, (data: any) => mapLeekRockets(data, gamemasterPokemon));
        fetchShadowRaids([corsProxyUrl + shadowRaidsAPI], calendarCache, {signal: controller.signal}, (data: any) => mapShadowRaids(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchNews, fetchSeason, fetchCompleted, gamemasterPokemon, encodeProxyUrl, fetchBosses, fetchLeekNews, fetchLeekEggs, fetchLeekRockets, fetchShadowRaids]);

    useEffect(() => {
        if (!fetchCompleted || !newsFetchCompleted) {
            return;
        }

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(news[0], 'text/html');
        const postsEntries = Array.from(htmlDoc.getElementsByClassName("blogList__post")).filter(e => !e.querySelector(".blogList__post__content__title")?.innerHTML.trim().startsWith("Welcome"));

        const controller = new AbortController();

        const urls = postsEntries.map(e => {
            const hrefValue = (e as HTMLAnchorElement).href;
            const relativeComponent = hrefValue.substring(hrefValue.lastIndexOf("/post/") + 1);
            return encodeProxyUrl(relativeComponent);
        });

        fetchPosts(urls, calendarCache, {signal: controller.signal}, (data: any) => mapPosts(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, newsFetchCompleted, fetchPosts, news, gamemasterPokemon, encodeProxyUrl]);

    useEffect(() => {
        if (!fetchCompleted || !leekNewsFetchCompleted) {
            return;
        }

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(leekNews[0], 'text/html');
        const postUrls = Array.from(new Set<string>([...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper raid-battles")).map(e => (e.parentElement as HTMLAnchorElement).href), ...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper elite-raids")).map(e => (e.parentElement as HTMLAnchorElement).href)]));
        
        const controller = new AbortController();

        const urls = postUrls.map(e => {
            const relativeComponent = e.substring(e.lastIndexOf("/events/") + 1);
            return leekBaseUrl + relativeComponent;
        });

        fetchLeekPosts(urls, calendarCache, {signal: controller.signal}, (data: any) => mapLeekNews(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, leekNewsFetchCompleted, fetchLeekPosts, leekNews, gamemasterPokemon]);

    return [bosses[0], posts, season[0], leekPosts, leekEggs[0], leekRockets[0], shadowRaids[0], bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, shadowRaidsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets, errorLoadingShadowRaids];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, posts, season, leekPosts, leekEggs, leekRockets, shadowRaids, bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, shadowRaidsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets, errorLoadingShadowRaids]: [IPostEntry, IPostEntry[][], IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], IPostEntry, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: raidBosses,
            posts: posts,
            season: season,
            leekPosts: leekPosts,
            leekEggs: leekEggs,
            leekRockets: leekRockets,
            shadowRaids: shadowRaids,
            bossesFetchCompleted: bossesFetchCompleted,
            postsFetchCompleted: postsFetchCompleted,
            seasonFetchCompleted: seasonFetchCompleted,
            leekPostsFetchCompleted: leekPostsFetchCompleted,
            leekEggsFetchCompleted: leekEggsFetchCompleted,
            leekRocketsFetchCompleted: leekRocketsFetchCompleted,
            shadowRaidsFetchCompleted: shadowRaidsFetchCompleted,
            bossesErrors: errorLoadingBosses,
            postsErrors: errorLoadingPosts,
            seasonErrors: errorLoadingSeason,
            leekPostsErrors: errorLoadingLeekPosts,
            leekEggsErrors: errorLoadingLeekEggs,
            leekRocketsErrors: errorLoadingLeekRockets,
            shadowRaidsErrors: errorLoadingShadowRaids
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}