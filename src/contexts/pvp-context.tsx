import { createContext, useContext, useEffect } from 'react';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { movesUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsRetroUrl, pvpokeRankingsUrl } from '../utils/Configs';
import { mapMoves, mapRankedPokemon } from '../utils/conversions';
import { IMove } from '../DTOs/IMove';
import Dictionary from '../utils/Dictionary';
import { usePokemon } from './pokemon-context';

interface PvpContextType {
    rankLists: Dictionary<IRankedPokemon>[];
    moves: Dictionary<IMove>;
    pvpFetchCompleted: boolean;
    pvpErrors: string
}

const PvpContext = createContext<PvpContextType | undefined>(undefined);

const useFetchAllData: () => [IRankedPokemon[][], IMove[], boolean, string] = () => {
    const {gamemasterPokemon, fetchCompleted, errors} = usePokemon();
    const [rankLists, fetchRankLists, rankListsFetchCompleted, errorLoadingRankListsData]: FetchData<IRankedPokemon[]> = useFetchUrls();
    const [moves, fetchMoves, fetchMovesCompleted, errorLoadingMovesData]: FetchData<IMove[]> = useFetchUrls();

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();
        fetchRankLists([pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl, pvpokeRankingsRetroUrl], true, {signal: controller.signal}, (data: any, request: any) => mapRankedPokemon(data, request, gamemasterPokemon));
        fetchMoves([movesUrl], true, {signal: controller.signal}, mapMoves);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted]);

    return [rankLists, moves[0], fetchCompleted && rankListsFetchCompleted && fetchMovesCompleted, errors + errorLoadingRankListsData + errorLoadingMovesData];
}

export const usePvp = (): PvpContextType => {
    const context = useContext(PvpContext);
    if (!context) {
        throw new Error("usePvp must be used within a PvpProvider");
    }
    return context;
};

export const PvpProvider = (props: React.PropsWithChildren<{}>) => {
    const [rankLists, moves, pvpFetchCompleted, pvpErrors]: [IRankedPokemon[][], IMove[], boolean, string] = useFetchAllData();

    return (
        <PvpContext.Provider value={{
            rankLists: rankLists?.map(r => r.reduce((acc: Dictionary<IRankedPokemon>, obj: IRankedPokemon) => {
                acc[obj.speciesId] = obj;
                return acc;
            }, {})),

            moves: moves?.reduce((acc: Dictionary<IMove>, obj: IMove) => {
                acc[obj.moveId] = obj;
                return acc;
            }, {}),

            pvpFetchCompleted,
            pvpErrors }}
        >
            {props.children}
        </PvpContext.Provider>
    );
}