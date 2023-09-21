import { createContext, useContext, useEffect } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { gamemasterPokemonUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from '../utils/Resources';
import { mapGamemasterPokemonData, mapRankedPokemon } from '../utils/conversions';

interface PokemonContextType {
    gamemasterPokemon: IGamemasterPokemon[];
    rankLists: IRankedPokemon[][];
    fetchCompleted: boolean;
    errors: string
}

const PokemonContext = createContext<PokemonContextType | undefined>(undefined);

const useFetchAllData: () => [IGamemasterPokemon[], IRankedPokemon[][], boolean, string] = () => {
    const [gamemasterPokemon, fetchGamemasterPokemon, gememasterPokemonFetchCompleted, errorLoadingGamemasterData]: FetchData<IGamemasterPokemon[]> = useFetchUrls();
    const [rankLists, fetchRankLists, rankListsFetchCompleted, errorLoadingRankListsData]: FetchData<IRankedPokemon[]> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchGamemasterPokemon([gamemasterPokemonUrl], true, {signal: controller.signal}, mapGamemasterPokemonData);
        fetchRankLists([pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl], true, {signal: controller.signal}, mapRankedPokemon);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, []);

    return [gamemasterPokemon[0], rankLists, gememasterPokemonFetchCompleted && rankListsFetchCompleted, errorLoadingGamemasterData + errorLoadingRankListsData];
}

export const usePokemon = (): PokemonContextType => {
    const context = useContext(PokemonContext);
    if (!context) {
        throw new Error("usePokemon must be used within a PokemonProvider");
    }
    return context;
};

export const PokemonProvider = (props: React.PropsWithChildren<{}>) => {
    const [gamemasterPokemon, rankLists, fetchCompleted, errors]: [IGamemasterPokemon[], IRankedPokemon[][], boolean, string] = useFetchAllData();

    return (
        <PokemonContext.Provider value={{ gamemasterPokemon, rankLists, fetchCompleted, errors }}>
            {props.children}
        </PokemonContext.Provider>
    );
}