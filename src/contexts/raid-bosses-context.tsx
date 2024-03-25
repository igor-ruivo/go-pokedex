import { createContext, useCallback, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, cacheTtlInMillis, calendarCache, corsProxyUrl, pokemonGoBaseUrl, pokemonGoNewsUrl, pokemonGoSeasonRelativeUrl } from '../utils/Configs';
import { mapPosts, mapRaidBosses, mapSeason } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';
import { IPostEntry, ISeason } from '../DTOs/INews';

interface CalendarContextType {
    bossesPerTier: Dictionary<IRaidBoss[]>;
    posts: IPostEntry[];
    season: ISeason;
    bossesFetchCompleted: boolean;
    postsFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    bossesErrors: string;
    postsErrors: string;
    seasonErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IRaidBoss[]>, IPostEntry[], ISeason, boolean, boolean, boolean, string, string, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted, errorLoadingnews]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<IPostEntry> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<ISeason> = useFetchUrls();
    const [bosses, fetchBosses, bossesFetchCompleted, errorLoadingBosses]: FetchData<Dictionary<IRaidBoss[]>> = useFetchUrls();
    
    const encodeProxyUrl = useCallback((relativeComponent: string) => corsProxyUrl + encodeURIComponent(pokemonGoBaseUrl + relativeComponent), []);

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();

        fetchBosses([bossesUrl], calendarCache, {signal: controller.signal}, (data: any) => mapRaidBosses(data, gamemasterPokemon));
        fetchNews([corsProxyUrl + pokemonGoNewsUrl], 0, {signal: controller.signal}/*, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon)*/);
        fetchSeason([encodeProxyUrl(pokemonGoSeasonRelativeUrl)], cacheTtlInMillis, {signal: controller.signal}, (data: any) => mapSeason(data, gamemasterPokemon));
        
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchNews, fetchSeason, fetchCompleted, gamemasterPokemon, encodeProxyUrl, fetchBosses]);

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

        fetchPosts(urls, 0, {signal: controller.signal}, (data: any) => mapPosts(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, newsFetchCompleted, fetchPosts, news, gamemasterPokemon, encodeProxyUrl]);

    return [bosses[0], posts, season[0], bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, posts, season, bossesFetchCompleted, postsFetchCompleted, seasonFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingSeason]: [Dictionary<IRaidBoss[]>, IPostEntry[], ISeason, boolean, boolean, boolean, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: raidBosses,
            posts: posts,
            season: season,
            bossesFetchCompleted: bossesFetchCompleted,
            postsFetchCompleted: postsFetchCompleted,
            seasonFetchCompleted: seasonFetchCompleted,
            bossesErrors: errorLoadingBosses,
            postsErrors: errorLoadingPosts,
            seasonErrors: errorLoadingSeason
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}