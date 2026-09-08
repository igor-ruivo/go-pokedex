import { useQuery } from '@tanstack/react-query';

import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import { movesUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

interface MovesData {
	moves: Record<string, IGameMasterMove>;
	movesFetchCompleted: boolean;
	movesErrors: string;
}

const EMPTY: Record<string, IGameMasterMove> = {};

export const movesQueryKey = ['moves'] as const;

/** The game-master move dictionary keyed by moveId. */
export const useMoves = (): MovesData => {
	const { data, isSuccess, isError, error } = useQuery({
		queryKey: movesQueryKey,
		queryFn: ({ signal }) => fetchJson<Record<string, IGameMasterMove>>(movesUrl, signal),
	});

	return {
		moves: data ?? EMPTY,
		movesFetchCompleted: isSuccess || isError,
		movesErrors: error ? String(error) : '',
	};
};
