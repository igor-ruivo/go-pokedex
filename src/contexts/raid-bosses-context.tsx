import { createContext, useCallback, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, cacheTtlInMillis, calendarCache, corsProxyUrl, leekBaseUrl, leekEggsUrl, leekNewsUrl, leekRocketsUrl, pokemonGoBaseUrl, pokemonGoNewsUrl, pokemonGoSeasonRelativeUrl, shadowRaidsAPI } from '../utils/Configs';
import { mapLeekEggs, mapLeekNews, mapLeekRockets, mapPosts, mapPostsPT, mapRaidBosses, mapSeason, mapShadowRaids } from '../utils/conversions';
import { usePokemon } from './pokemon-context';
import { IPostEntry, IRocketGrunt } from '../DTOs/INews';

interface CalendarContextType {
    bossesPerTier: IPostEntry;
    posts: IPostEntry[][];
    postsPT: IPostEntry[][];
    season: IPostEntry;
    seasonPT: IPostEntry;
    leekPosts: IPostEntry[];
    leekEggs: IPostEntry;
    leekRockets: IRocketGrunt[];
    shadowRaids: IPostEntry;
    bossesFetchCompleted: boolean;
    postsFetchCompleted: boolean;
    postsPTFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    seasonPTFetchCompleted: boolean;
    leekPostsFetchCompleted: boolean;
    leekEggsFetchCompleted: boolean;
    leekRocketsFetchCompleted: boolean;
    shadowRaidsFetchCompleted: boolean;
    bossesErrors: string;
    postsErrors: string;
    postsPTErrors: string;
    seasonErrors: string;
    seasonPTErrors: string;
    leekPostsErrors: string;
    leekEggsErrors: string;
    leekRocketsErrors: string;
    shadowRaidsErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [IPostEntry, IPostEntry[][], IPostEntry[][], IPostEntry, IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], IPostEntry, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string, string, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<IPostEntry[]> = useFetchUrls();
    const [postsPT, fetchPostsPT, postsPTFetchCompleted, errorLoadingPostsPT]: FetchData<IPostEntry[]> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<IPostEntry> = useFetchUrls();
    const [seasonPT, fetchSeasonPT, seasonPTFetchCompleted, errorLoadingSeasonPT]: FetchData<IPostEntry> = useFetchUrls();
    const [bosses, fetchBosses, bossesFetchCompleted, errorLoadingBosses]: FetchData<IPostEntry> = useFetchUrls();
    const [leekNews, fetchLeekNews, leekNewsFetchCompleted]: FetchData<string> = useFetchUrls();
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
        fetchSeason([encodeProxyUrl(pokemonGoSeasonRelativeUrl)], cacheTtlInMillis, {signal: controller.signal}, (data: any, request: any) => mapSeason(data, gamemasterPokemon, request));
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
        })
        //filter unavailable events
        .filter(x => !x.includes('festival-of-lights-2024'));

        fetchPosts(urls, calendarCache, {signal: controller.signal}, (data: any, request: any) => mapPosts(data, gamemasterPokemon, request));

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
        const postUrls = Array.from(new Set<string>([...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper raid-battles")).map(e => (e.parentElement as HTMLAnchorElement).href), ...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper elite-raids")).map(e => (e.parentElement as HTMLAnchorElement).href), ...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper pokémon-spotlight-hour")).map(e => (e.parentElement as HTMLAnchorElement).href)]));
        
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

    useEffect(() => {
        if (!postsFetchCompleted) {
            return;
        }

        const controller = new AbortController();

        const ptbrUrls = posts.flat().filter(p => p.isRelevant && p.rawUrl).map(p => {
            const decodedUrl = decodeURIComponent(p.rawUrl!.split(corsProxyUrl)[1]);
            const postIndex = decodedUrl.indexOf('/post');

            if (postIndex === -1) {
                return p.rawUrl!;
            }

            const newPath = decodedUrl.substring(0, postIndex) + '/pt_br/' + decodedUrl.substring(postIndex + 1);
            
            // Encode the URL back to its encoded form
            const newEncodedUrl = encodeURIComponent(newPath);
            
            return corsProxyUrl + newEncodedUrl;
        });

        fetchPostsPT(ptbrUrls, calendarCache, {signal: controller.signal}, (data: any, request: any) => mapPostsPT(data, gamemasterPokemon, request));
        fetchSeasonPT([encodeProxyUrl('pt_br/' + pokemonGoSeasonRelativeUrl)], calendarCache, {signal: controller.signal}, (data: any, request: any) => mapSeason(data, gamemasterPokemon, request, true));
        
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [postsFetchCompleted, gamemasterPokemon, posts, fetchPostsPT, fetchSeasonPT, encodeProxyUrl]);

    return [bosses[0], posts, postsPT, season[0], seasonPT[0], leekPosts, leekEggs[0], leekRockets[0], shadowRaids[0], bossesFetchCompleted, postsFetchCompleted, postsPTFetchCompleted, seasonFetchCompleted, seasonPTFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, shadowRaidsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingPostsPT, errorLoadingSeason, errorLoadingSeasonPT, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets, errorLoadingShadowRaids];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, posts, postsPT, season, seasonPT, leekPosts, leekEggs, leekRockets, shadowRaids, bossesFetchCompleted, postsFetchCompleted, postsPTFetchCompleted, seasonFetchCompleted, seasonPTFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, shadowRaidsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingPostsPT, errorLoadingSeason, errorLoadingSeasonPT, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets, errorLoadingShadowRaids]: [IPostEntry, IPostEntry[][], IPostEntry[][], IPostEntry, IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], IPostEntry, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: raidBosses,
            posts: posts,
            postsPT: postsPT,
            season: season,
            seasonPT: seasonPT,
            leekPosts: leekPosts,
            leekEggs: leekEggs,
            leekRockets: leekRockets,
            shadowRaids: shadowRaids,
            bossesFetchCompleted: bossesFetchCompleted,
            postsFetchCompleted: postsFetchCompleted,
            postsPTFetchCompleted: postsPTFetchCompleted,
            seasonFetchCompleted: seasonFetchCompleted,
            seasonPTFetchCompleted: seasonPTFetchCompleted,
            leekPostsFetchCompleted: leekPostsFetchCompleted,
            leekEggsFetchCompleted: leekEggsFetchCompleted,
            leekRocketsFetchCompleted: leekRocketsFetchCompleted,
            shadowRaidsFetchCompleted: shadowRaidsFetchCompleted,
            bossesErrors: errorLoadingBosses,
            postsErrors: errorLoadingPosts,
            postsPTErrors: errorLoadingPostsPT,
            seasonErrors: errorLoadingSeason,
            seasonPTErrors: errorLoadingSeasonPT,
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