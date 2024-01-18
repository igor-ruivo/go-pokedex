import { createContext, useContext, useEffect } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { gamemasterPokemonUrl } from '../utils/Configs';
import { mapGamemasterPokemonData } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';

interface NewsContextType {
    
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IGamemasterPokemon>, boolean, string] = () => {
    const [gamemasterPokemon, fetchGamemasterPokemon, gememasterPokemonFetchCompleted, errorLoadingGamemasterData]: FetchData<Dictionary<IGamemasterPokemon>> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchGamemasterPokemon([gamemasterPokemonUrl], true, {signal: controller.signal}, mapGamemasterPokemonData);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchGamemasterPokemon]);

    return [gamemasterPokemon[0], gememasterPokemonFetchCompleted, errorLoadingGamemasterData];
}

export const useNews = (): NewsContextType => {
    const context = useContext(NewsContext);
    if (!context) {
        throw new Error("useNews must be used within a NewsProvider");
    }
    return context;
};

export const NewsProvider = (props: React.PropsWithChildren<{}>) => {
    const [gamemasterPokemon, fetchCompleted, errors]: [Dictionary<IGamemasterPokemon>, boolean, string] = useFetchAllData();

    return (
        <NewsContext.Provider value={{
            
        }}
        >
            {props.children}
        </NewsContext.Provider>
    );
}