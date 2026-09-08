import { useQuery } from '@tanstack/react-query';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { gamemasterPokemonUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

interface PokemonData {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	fetchCompleted: boolean;
	errors: string;
}

const EMPTY: Record<string, IGamemasterPokemon> = {};

export const gamemasterPokemonQueryKey = ['game-master'] as const;

/**
 * The game-master dictionary keyed by speciesId. This is the root dataset every
 * other view depends on.
 */
export const usePokemon = (): PokemonData => {
	const { data, isSuccess, isError, error } = useQuery({
		queryKey: gamemasterPokemonQueryKey,
		queryFn: ({ signal }) => fetchJson<Record<string, IGamemasterPokemon>>(gamemasterPokemonUrl, signal),
	});

	return {
		gamemasterPokemon: data ?? EMPTY,
		fetchCompleted: isSuccess || isError,
		errors: error ? String(error) : '',
	};
};
