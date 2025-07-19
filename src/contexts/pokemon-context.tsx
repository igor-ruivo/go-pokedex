import { createContext, useContext, useEffect } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { FetchData } from '../hooks/useFetchUrls';
import { useFetchUrls } from '../hooks/useFetchUrls';
import { gamemasterPokemonUrl } from '../utils/Configs';

interface PokemonContextType {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	fetchCompleted: boolean;
	errors: string;
}

const PokemonContext = createContext<PokemonContextType | undefined>(undefined);

const useFetchAllData: () => [Record<string, IGamemasterPokemon>, boolean, string] = () => {
	const [
		gamemasterPokemon,
		fetchGamemasterPokemon,
		gememasterPokemonFetchCompleted,
		errorLoadingGamemasterData,
	]: FetchData<Record<string, IGamemasterPokemon>> = useFetchUrls();

	useEffect(() => {
		const controller = new AbortController();
		void fetchGamemasterPokemon([gamemasterPokemonUrl], 0, {
			signal: controller.signal,
		});
		return () => {
			controller.abort('Request canceled by cleanup.');
		};
	}, [fetchGamemasterPokemon]);

	return [gamemasterPokemon[0], gememasterPokemonFetchCompleted, errorLoadingGamemasterData];
};

export const usePokemon = (): PokemonContextType => {
	const context = useContext(PokemonContext);
	if (!context) {
		throw new Error('usePokemon must be used within a PokemonProvider');
	}
	return context;
};

export const PokemonProvider = (props: React.PropsWithChildren<object>) => {
	const [gamemasterPokemon, fetchCompleted, errors]: [Record<string, IGamemasterPokemon>, boolean, string] =
		useFetchAllData();

	return (
		<PokemonContext.Provider
			value={{
				gamemasterPokemon: gamemasterPokemon,
				fetchCompleted,
				errors,
			}}
		>
			{props.children}
		</PokemonContext.Provider>
	);
};
