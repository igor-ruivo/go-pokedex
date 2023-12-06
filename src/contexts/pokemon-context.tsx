import { createContext, useContext, useEffect } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { gamemasterPokemonUrl } from '../utils/Configs';
import { mapGamemasterPokemonData } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';

interface PokemonContextType {
    gamemasterPokemon: Dictionary<IGamemasterPokemon>;
    fetchCompleted: boolean;
    errors: string
}

const PokemonContext = createContext<PokemonContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IGamemasterPokemon>, boolean, string] = () => {
    const [gamemasterPokemon, fetchGamemasterPokemon, gememasterPokemonFetchCompleted, errorLoadingGamemasterData]: FetchData<Dictionary<IGamemasterPokemon>> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchGamemasterPokemon([gamemasterPokemonUrl], true, {signal: controller.signal}, mapGamemasterPokemonData);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, []);

    return [gamemasterPokemon[0], gememasterPokemonFetchCompleted, errorLoadingGamemasterData];
}

export const usePokemon = (): PokemonContextType => {
    const context = useContext(PokemonContext);
    if (!context) {
        throw new Error("usePokemon must be used within a PokemonProvider");
    }
    return context;
};

export const PokemonProvider = (props: React.PropsWithChildren<{}>) => {
    const [gamemasterPokemon, fetchCompleted, errors]: [Dictionary<IGamemasterPokemon>, boolean, string] = useFetchAllData();

    return (
        <PokemonContext.Provider value={{
            gamemasterPokemon: gamemasterPokemon,
            fetchCompleted,
            errors }}
        >
            {props.children}
        </PokemonContext.Provider>
    );
}