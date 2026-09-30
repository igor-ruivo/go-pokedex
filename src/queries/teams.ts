import { useQuery } from '@tanstack/react-query';

import type { TeamBuilderData, TeamRanking } from '../DTOs/ITeamBuilder';
import { teamBuilderUrl, teamRankingUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

/** PvPoke's team-builder inputs (move table, best IVs, meta groups, form data) — see dex-server's `team-builder.json`. */
export const useTeamBuilderData = () =>
	useQuery({
		queryKey: ['team-builder'],
		queryFn: ({ signal }) => fetchJson<TeamBuilderData>(teamBuilderUrl, signal),
	});

/** The best teams per league, rated daily by this repo's "Team Ranking" workflow — see `team-ranking.json`. */
export const useTeamRanking = () =>
	useQuery({
		queryKey: ['team-ranking'],
		queryFn: ({ signal }) => fetchJson<TeamRanking>(teamRankingUrl, signal),
	});
