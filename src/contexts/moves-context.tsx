import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { cacheTtlInMillis, gameMasterUrl } from '../utils/Configs';
import { mapGameMaster } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IGameMasterMove } from '../DTOs/IGameMasterMove';

interface MovesContextType {
    moves: Dictionary<IGameMasterMove>;
    movesFetchCompleted: boolean;
    movesErrors: string
}

const MovesContext = createContext<MovesContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IGameMasterMove>, boolean, string] = () => {
    const [moves, fetchMoves, fetchMovesCompleted, errorLoadingMovesData]: FetchData<Dictionary<IGameMasterMove>> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchMoves([gameMasterUrl], cacheTtlInMillis, {signal: controller.signal}, mapGameMaster);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchMoves]);

    return [moves[0], fetchMovesCompleted, errorLoadingMovesData];
}

export const useMoves = (): MovesContextType => {
    const context = useContext(MovesContext);
    if (!context) {
        throw new Error("useMoves must be used within a MovesProvider");
    }
    return context;
};

export const MovesProvider = (props: React.PropsWithChildren<{}>) => {
    const [moves, movesFetchCompleted, movesErrors]: [Dictionary<IGameMasterMove>, boolean, string] = useFetchAllData();

    return (
        <MovesContext.Provider value={{
            moves: moves,
            movesFetchCompleted,
            movesErrors }}
        >
            {props.children}
        </MovesContext.Provider>
    );
}