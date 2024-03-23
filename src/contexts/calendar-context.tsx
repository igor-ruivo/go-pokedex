import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, calendarCache } from '../utils/Configs';
import { mapRaidBosses } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';

interface CalendarContextType {
    bossesPerTier: Dictionary<IRaidBoss[]>;
    bossesFetchCompleted: boolean;
    bossesErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IRaidBoss[]>, boolean, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [Calendar, fetchCalendar, CalendarFetchCompleted, errorLoadingCalendar]: FetchData<Dictionary<IRaidBoss[]>> = useFetchUrls();

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();
        fetchCalendar([bossesUrl], calendarCache, {signal: controller.signal}, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon));
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCalendar, fetchCompleted, gamemasterPokemon]);

    return [Calendar[0], CalendarFetchCompleted, errorLoadingCalendar];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [Calendar, fetchCompleted, errors]: [Dictionary<IRaidBoss[]>, boolean, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: Calendar,
            bossesFetchCompleted: fetchCompleted,
            bossesErrors: errors
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}