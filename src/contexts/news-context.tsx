import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl } from '../utils/Configs';
import { mapRaidBosses } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBosses } from '../DTOs/IRaidBosses';
import { usePokemon } from './pokemon-context';

interface NewsContextType {
    
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IRaidBosses>, boolean, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [raidBosses, fetchRaidBosses, raidBossesFetchCompleted, errorLoadingRaidBosses]: FetchData<Dictionary<IRaidBosses>> = useFetchUrls();

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();
        fetchRaidBosses([bossesUrl], false, {signal: controller.signal}, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon));
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchRaidBosses, fetchCompleted]);

    return [raidBosses[0], raidBossesFetchCompleted, errorLoadingRaidBosses];
}

export const useNews = (): NewsContextType => {
    const context = useContext(NewsContext);
    if (!context) {
        throw new Error("useNews must be used within a NewsProvider");
    }
    return context;
};

export const NewsProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, fetchCompleted, errors]: [Dictionary<IRaidBosses>, boolean, string] = useFetchAllData();

    return (
        <NewsContext.Provider value={{
            
        }}
        >
            {props.children}
        </NewsContext.Provider>
    );
}