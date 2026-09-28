import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { IRankedPokemon } from '../DTOs/IRankedPokemon';
import { extraLeagues, useLeagueDefinitions } from '../queries/leagues';
import {
	pvpokeRankingFileUrl,
	pvpokeRankings1500Url,
	pvpokeRankings2500Url,
	pvpokeRankingsUrl,
} from '../utils/Configs';
import { fetchJsonInWorker } from '../utils/fetch-json';

export type RankList = Record<string, IRankedPokemon>;

interface PvpData {
	/** Index 0 = Great (1500), 1 = Ultra (2500), 2 = Master. Index 3 (custom) is intentionally absent. */
	rankLists: Array<RankList>;
	/** Rankings for every rotating/custom cup beyond the static three, keyed by league id (see `leagues.json`). */
	extraRankLists: Record<string, RankList>;
	pvpFetchCompleted: boolean;
	pvpErrors: string;
}

const EMPTY: RankList = {};
const EMPTY_EXTRA: Record<string, RankList> = {};

// Order matters: consumers index this array by league.
const PVP_RANKING_URLS = [pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl];

const combine = (results: Array<UseQueryResult<RankList, Error>>) => ({
	rankLists: results.map((r) => r.data ?? EMPTY),
	fetchCompleted: results.every((r) => r.isSuccess || r.isError),
	errors: results.map((r) => (r.error ? String(r.error) : '')).join(''),
});

/**
 * PvPoke-style ranking lists, one per PvP league — the static great/ultra/
 * master three (positional, unchanged shape so every existing consumer/test
 * keeps working) plus `extraRankLists`, one entry per currently-active
 * rotating/custom cup (see `leagues.json` via `useLeagueDefinitions`).
 */
export const usePvp = (): PvpData => {
	const { leagues } = useLeagueDefinitions();
	const extra = useMemo(() => extraLeagues(leagues), [leagues]);

	const staticResult = useQueries({
		queries: PVP_RANKING_URLS.map((url) => ({
			queryKey: ['pvp-ranking', url] as const,
			queryFn: () => fetchJsonInWorker<RankList>(url),
		})),
		combine,
	});

	const extraResult = useQueries({
		queries: extra.map((l) => ({
			queryKey: ['pvp-ranking', l.rankingFile] as const,
			queryFn: () => fetchJsonInWorker<RankList>(pvpokeRankingFileUrl(l.rankingFile)),
		})),
		combine,
	});

	const extraRankLists = useMemo(() => {
		if (extra.length === 0) return EMPTY_EXTRA;
		const out: Record<string, RankList> = {};
		extra.forEach((l, i) => {
			out[l.id] = extraResult.rankLists[i] ?? EMPTY;
		});
		return out;
	}, [extra, extraResult.rankLists]);

	return {
		rankLists: staticResult.rankLists,
		extraRankLists,
		// Extra leagues haven't loaded their definitions yet is fine to wait on too —
		// otherwise a slow `leagues.json` fetch would let `extra` start empty and
		// this flip "complete" a beat before the extra cups' own rankings arrive.
		pvpFetchCompleted: staticResult.fetchCompleted && extraResult.fetchCompleted,
		pvpErrors: staticResult.errors + extraResult.errors,
	};
};
