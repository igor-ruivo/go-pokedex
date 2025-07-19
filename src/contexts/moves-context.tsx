import { createContext, useContext, useEffect } from 'react';

import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { FetchData } from '../hooks/useFetchUrls';
import { useFetchUrls } from '../hooks/useFetchUrls';
import { movesUrl } from '../utils/Configs';

interface MovesContextType {
	moves: Record<string, IGameMasterMove>;
	movesFetchCompleted: boolean;
	movesErrors: string;
}

const MovesContext = createContext<MovesContextType | undefined>(undefined);

const useFetchAllData: () => [Record<string, IGameMasterMove>, boolean, string] = () => {
	const [moves, fetchMoves, fetchMovesCompleted, errorLoadingMovesData]: FetchData<Record<string, IGameMasterMove>> =
		useFetchUrls();

	useEffect(() => {
		const controller = new AbortController();
		void fetchMoves([movesUrl], 0, { signal: controller.signal });
		return () => {
			controller.abort('Request canceled by cleanup.');
		};
	}, [fetchMoves]);

	return [moves[0], fetchMovesCompleted, errorLoadingMovesData];
};

export const useMoves = (): MovesContextType => {
	const context = useContext(MovesContext);
	if (!context) {
		throw new Error('useMoves must be used within a MovesProvider');
	}
	return context;
};

export const MovesProvider = (props: React.PropsWithChildren<object>) => {
	const [moves, movesFetchCompleted, movesErrors]: [Record<string, IGameMasterMove>, boolean, string] =
		useFetchAllData();

	return (
		<MovesContext.Provider
			value={{
				moves: moves,
				movesFetchCompleted,
				movesErrors,
			}}
		>
			{props.children}
		</MovesContext.Provider>
	);
};
