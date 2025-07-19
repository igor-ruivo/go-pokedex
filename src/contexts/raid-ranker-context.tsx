import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect } from 'react';

import { PokemonTypes } from '../DTOs/PokemonTypes';
import type { FetchData } from '../hooks/useFetchUrls';
import { useFetchUrls } from '../hooks/useFetchUrls';
import { dpsUrl } from '../utils/Configs';

export type DPSEntry = {
	dps: number;
	fastMove: string;
	fastMoveDmg: number;
	chargedMove: string;
	chargedMoveDmg: number;
	speciesId: string;
	rank: number;
};

interface RaidRankerContextType {
	raidDPS: Record<string, Record<string, DPSEntry>>;
	raidDPSFetchCompleted: boolean;
	raidDPSErrors: string;
}

const RaidRankerContext = createContext<RaidRankerContextType | undefined>(undefined);

const useFetchAllData: () => [Array<Record<string, DPSEntry>>, boolean, string] = () => {
	const [moves, fetchMoves, fetchMovesCompleted, errorLoadingMovesData]: FetchData<Record<string, DPSEntry>> =
		useFetchUrls();

	useEffect(() => {
		const controller = new AbortController();
		void fetchMoves(
			[
				...Object.values(PokemonTypes)
					.filter((v) => typeof v === 'string')
					.map((type) => (typeof type === 'string' ? dpsUrl(type.toLocaleLowerCase()) : 'default')),
				dpsUrl('default'),
			],
			0
		);
		return () => {
			controller.abort('Request canceled by cleanup.');
		};
	}, [fetchMoves]);

	return [moves, fetchMovesCompleted, errorLoadingMovesData];
};

export const useRaidRanker = (): RaidRankerContextType => {
	const context = useContext(RaidRankerContext);
	if (!context) {
		throw new Error('useRaidRanker must be used within a RaidRankerProvider');
	}
	return context;
};

export const RaidRankerProvider = (props: PropsWithChildren<object>) => {
	const [raidDPSArray, raidDPSFetchCompleted, raidDPSErrors]: [Array<Record<string, DPSEntry>>, boolean, string] =
		useFetchAllData();

	const raidDPS: Record<string, Record<string, DPSEntry>> = {};
	[...Object.values(PokemonTypes).filter((v) => typeof v === 'string'), '']
		.map((type) => (typeof type === 'string' ? type.toLocaleLowerCase() : 'default'))
		.forEach((type, index) => {
			raidDPS[type] = raidDPSArray[index];
		});

	return (
		<RaidRankerContext.Provider
			value={{
				raidDPS,
				raidDPSFetchCompleted,
				raidDPSErrors,
			}}
		>
			{props.children}
		</RaidRankerContext.Provider>
	);
};
