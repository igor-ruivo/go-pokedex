import { createContext, useCallback, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, cacheTtlInMillis, calendarCache, corsProxyUrl, leekBaseUrl, leekNewsUrl, pokemonGoBaseUrl, pokemonGoNewsUrl, pokemonGoSeasonRelativeUrl } from '../utils/Configs';
import { mapLeekNews, mapPosts, mapRaidBosses, mapSeason } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';
import { IPostEntry } from '../DTOs/INews';

interface CalendarContextType {
    bossesPerTier: IPostEntry;
    posts: IPostEntry[][];
    season: IPostEntry;
    leekPosts: IPostEntry[];
    bossesFetchCompleted: boolean;
    postsFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    leekPostsFetchCompleted: boolean;
    bossesErrors: string;
    postsErrors: string;
    seasonErrors: string;
    leekPostsErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [IPostEntry, IPostEntry[][], IPostEntry, IPostEntry[], boolean, boolean, boolean, boolean, string, string, string, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted, errorLoadingnews]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<IPostEntry[]> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<IPostEntry> = useFetchUrls();
    const [bosses, fetchBosses, bossesFetchCompleted, errorLoadingBosses]: FetchData<IPostEntry> = useFetchUrls();
    const [leekNews, fetchLeekNews, leekNewsFetchCompleted, errorLoadingLeekNews]: FetchData<string> = useFetchUrls();
    const [leekPosts, fetchLeekPosts, leekPostsFetchCompleted, errorLoadingLeekPosts]: FetchData<IPostEntry> = useFetchUrls();
    
    const encodeProxyUrl = useCallback((relativeComponent: string) => corsProxyUrl + encodeURIComponent(pokemonGoBaseUrl + relativeComponent), []);

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();

        fetchBosses([bossesUrl], calendarCache, {signal: controller.signal}, (data: any) => mapRaidBosses(data, gamemasterPokemon));
        fetchLeekNews([leekNewsUrl], calendarCache, {signal: controller.signal}/*, (data: any) => mapLeekNews(data, gamemasterPokemon)*/);
        fetchNews([corsProxyUrl + pokemonGoNewsUrl], calendarCache, {signal: controller.signal, headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
        }}, undefined, true/*, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon)*/);
        fetchSeason([encodeProxyUrl(pokemonGoSeasonRelativeUrl)], cacheTtlInMillis, {signal: controller.signal}, (data: any) => mapSeason(data, gamemasterPokemon));
        
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchNews, fetchSeason, fetchCompleted, gamemasterPokemon, encodeProxyUrl, fetchBosses, fetchLeekNews]);

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
        const postUrls = Array.from(new Set<string>(Array.from(htmlDoc.getElementsByClassName("event-item-wrapper raid-battles")).map(e => (e.parentElement as HTMLAnchorElement).href)));
        
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

    return [bosses[0], posts, season[0], leekPosts, bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, leekPostsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason, errorLoadingLeekPosts];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, posts, season, leekPosts, bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, leekPostsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason, errorLoadingLeekPosts]: [IPostEntry, IPostEntry[][], IPostEntry, IPostEntry[], boolean, boolean, boolean, boolean, string, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: raidBosses,
            posts: posts,
            season: season,
            leekPosts: leekPosts,
            bossesFetchCompleted: bossesFetchCompleted,
            postsFetchCompleted: postsFetchCompleted,
            seasonFetchCompleted: seasonFetchCompleted,
            leekPostsFetchCompleted: leekPostsFetchCompleted,
            bossesErrors: errorLoadingBosses,
            postsErrors: errorLoadingPosts,
            seasonErrors: errorLoadingSeason,
            leekPostsErrors: errorLoadingLeekPosts
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}