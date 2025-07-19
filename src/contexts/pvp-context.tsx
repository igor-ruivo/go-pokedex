import { createContext, useContext, useEffect } from 'react';

import type { IRankedPokemon } from '../DTOs/IRankedPokemon';
import type { FetchData } from '../hooks/useFetchUrls';
import { useFetchUrls } from '../hooks/useFetchUrls';
import { pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from '../utils/Configs';
import { usePokemon } from './pokemon-context';

interface PvpContextType {
	rankLists: Array<Record<string, IRankedPokemon>>;
	pvpFetchCompleted: boolean;
	pvpErrors: string;
}

const PvpContext = createContext<PvpContextType | undefined>(undefined);

export const customCupCPLimit = 1500;

const useFetchAllData: () => [Array<Record<string, IRankedPokemon>>, boolean, string] = () => {
	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
	const [rankLists, fetchRankLists, rankListsFetchCompleted, errorLoadingRankListsData]: FetchData<
		Record<string, IRankedPokemon>
	> = useFetchUrls();

	useEffect(() => {
		if (!fetchCompleted) {
			return;
		}

		const controller = new AbortController();
		void fetchRankLists([pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl], 0, {
			signal: controller.signal,
		});
		return () => {
			controller.abort('Request canceled by cleanup.');
		};
	}, [fetchCompleted, fetchRankLists, gamemasterPokemon]);

	return [rankLists, fetchCompleted && rankListsFetchCompleted, errors + errorLoadingRankListsData];
};

export const usePvp = (): PvpContextType => {
	const context = useContext(PvpContext);
	if (!context) {
		throw new Error('usePvp must be used within a PvpProvider');
	}
	return context;
};

export const PvpProvider = (props: React.PropsWithChildren<object>) => {
	const [rankLists, pvpFetchCompleted, pvpErrors]: [Array<Record<string, IRankedPokemon>>, boolean, string] =
		useFetchAllData();

	return (
		<PvpContext.Provider
			value={{
				rankLists: rankLists,
				pvpFetchCompleted,
				pvpErrors,
			}}
		>
			{props.children}
		</PvpContext.Provider>
	);
};
