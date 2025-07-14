import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { currentBossesUrl, currentEggsUrl, currentRocketsUrl, eventsUrl, seasonUrl, specialBossesUrl, spotlightHoursUrl } from '../utils/Configs';
import { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import { GameLanguage } from './language-context';

export interface ILeekduckSpotlightHour {
    title: Record<GameLanguage, string>;
    date: number;
    dateEnd: number;
    pokemons: Array<IEntry>;
    bonus: Record<GameLanguage, string>;
    imgUrl: string;
    rawUrl: string;
}

export interface ILeekduckSpecialRaidBoss {
    title: Record<GameLanguage, string>;
    date: number;
    dateEnd: number;
    raids: Array<IEntry>;
    rawUrl: string;
}

interface CalendarContextType {
    posts: IPostEntry[];
    season: IPostEntry;
    specialBosses: ILeekduckSpecialRaidBoss[];
    spotlightHours: ILeekduckSpotlightHour[];
    currentBosses: IEntry[];
    currentEggs: IEntry[];
    currentRockets: IRocketGrunt[];
    
    postsFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    specialBossesFetchCompleted: boolean;
    spotlightHoursFetchCompleted: boolean;
    currentBossesFetchCompleted: boolean;
    currentEggsFetchCompleted: boolean;
    currentRocketsFetchCompleted: boolean;

    errorLoadingPosts: string;
    errorLoadingSeason: string;
    errorLoadingSpecialBosses: string;
    errorLoadingSpotlightHours: string;
    errorLoadingCurrentBosses: string;
    errorLoadingCurrentEggs: string;
    errorLoadingCurrentRockets: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [IPostEntry[], IPostEntry, ILeekduckSpecialRaidBoss[], ILeekduckSpotlightHour[], IEntry[], IEntry[], IRocketGrunt[], boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string] = () => {
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<IPostEntry[]> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<IPostEntry> = useFetchUrls();
    const [specialBosses, fetchSpecialBosses, specialBossesFetchCompleted, errorLoadingSpecialBosses]: FetchData<ILeekduckSpecialRaidBoss[]> = useFetchUrls();
    const [spotlightHours, fetchSpotlightHours, spotlightHoursFetchCompleted, errorLoadingSpotlightHours]: FetchData<ILeekduckSpotlightHour[]> = useFetchUrls();
    const [currentBosses, fetchCurrentBosses, currentBossesFetchCompleted, errorLoadingCurrentBosses]: FetchData<IEntry[]> = useFetchUrls();
    const [currentEggs, fetchCurrentEggs, currentEggsFetchCompleted, errorLoadingCurrentEggs]: FetchData<IEntry[]> = useFetchUrls();
    const [currentRockets, fetchCurrentRockets, currentRocketsFetchCompleted, errorLoadingCurrentRockets]: FetchData<IRocketGrunt[]> = useFetchUrls();
    
    useEffect(() => {
        const controller = new AbortController();
        fetchPosts([eventsUrl], 0, {signal: controller.signal});
        fetchSeason([seasonUrl], 0, {signal: controller.signal});
        fetchSpecialBosses([specialBossesUrl], 0, {signal: controller.signal});
        fetchSpotlightHours([spotlightHoursUrl], 0, {signal: controller.signal});
        fetchCurrentBosses([currentBossesUrl], 0, {signal: controller.signal});
        fetchCurrentEggs([currentEggsUrl], 0, {signal: controller.signal});
        fetchCurrentRockets([currentRocketsUrl], 0, {signal: controller.signal});

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchPosts, fetchSeason, fetchSpecialBosses, fetchSpotlightHours, fetchCurrentBosses, fetchCurrentEggs, fetchCurrentRockets]);

    return [posts[0], season[0], specialBosses[0], spotlightHours[0], currentBosses[0], currentEggs[0], currentRockets[0],
    postsFetchCompleted, seasonFetchCompleted, specialBossesFetchCompleted, spotlightHoursFetchCompleted, currentBossesFetchCompleted, currentEggsFetchCompleted, currentRocketsFetchCompleted,
    errorLoadingPosts, errorLoadingSeason, errorLoadingSpecialBosses, errorLoadingSpotlightHours, errorLoadingCurrentBosses, errorLoadingCurrentEggs, errorLoadingCurrentRockets];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [posts, season, specialBosses, spotlightHours, currentBosses, currentEggs, currentRockets,
        postsFetchCompleted, seasonFetchCompleted, specialBossesFetchCompleted, spotlightHoursFetchCompleted, currentBossesFetchCompleted, currentEggsFetchCompleted, currentRocketsFetchCompleted,
        errorLoadingPosts, errorLoadingSeason, errorLoadingSpecialBosses, errorLoadingSpotlightHours, errorLoadingCurrentBosses, errorLoadingCurrentEggs, errorLoadingCurrentRockets]: [IPostEntry[], IPostEntry, ILeekduckSpecialRaidBoss[], ILeekduckSpotlightHour[], IEntry[], IEntry[], IRocketGrunt[], boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            posts,
            season,
            specialBosses,
            spotlightHours,
            currentBosses,
            currentEggs,
            currentRockets,
            postsFetchCompleted,
            seasonFetchCompleted,
            specialBossesFetchCompleted,
            spotlightHoursFetchCompleted,
            currentBossesFetchCompleted,
            currentEggsFetchCompleted,
            currentRocketsFetchCompleted,
            errorLoadingPosts,
            errorLoadingSeason,
            errorLoadingSpecialBosses,
            errorLoadingSpotlightHours,
            errorLoadingCurrentBosses,
            errorLoadingCurrentEggs,
            errorLoadingCurrentRockets
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}