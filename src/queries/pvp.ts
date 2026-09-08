import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries } from '@tanstack/react-query';

import type { IRankedPokemon } from '../DTOs/IRankedPokemon';
import { pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

export const customCupCPLimit = 1500;

type RankList = Record<string, IRankedPokemon>;

interface PvpData {
	/** Index 0 = Great (1500), 1 = Ultra (2500), 2 = Master. Index 3 (custom) is intentionally absent. */
	rankLists: Array<RankList>;
	pvpFetchCompleted: boolean;
	pvpErrors: string;
}

const EMPTY: RankList = {};

// Order matters: consumers index this array by league.
const PVP_RANKING_URLS = [pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl];

const combine = (results: Array<UseQueryResult<RankList, Error>>): PvpData => ({
	rankLists: results.map((r) => r.data ?? EMPTY),
	pvpFetchCompleted: results.every((r) => r.isSuccess || r.isError),
	pvpErrors: results.map((r) => (r.error ? String(r.error) : '')).join(''),
});

/** PvPoke-style ranking lists, one per PvP league. */
export const usePvp = (): PvpData =>
	useQueries({
		queries: PVP_RANKING_URLS.map((url) => ({
			queryKey: ['pvp-ranking', url] as const,
			queryFn: ({ signal }: { signal: AbortSignal }) => fetchJson<RankList>(url, signal),
		})),
		combine,
	});
