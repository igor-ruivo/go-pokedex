import { useQuery } from '@tanstack/react-query';

import type { TeamBuilderData } from '../DTOs/ITeamBuilder';
import { teamBuilderUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

/** PvPoke's team-builder inputs (move table, best IVs, meta groups, form data) — see dex-server's `team-builder.json`. */
export const useTeamBuilderData = () =>
	useQuery({
		queryKey: ['team-builder'],
		queryFn: ({ signal }) => fetchJson<TeamBuilderData>(teamBuilderUrl, signal),
	});
