import { useQuery } from '@tanstack/react-query';

import type { IGblSeason } from '../DTOs/IGblSeason';
import { gblSeasonUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

/** The latest GO Battle League season post (rewards, attack changes, attack availability). Absent until it has loaded, or when it failed to. */
export const useGblSeason = (): { gblSeason: IGblSeason | undefined; gblSeasonFetchCompleted: boolean } => {
	const { data, isSuccess, isError } = useQuery({
		queryKey: ['calendar', 'gbl-season'] as const,
		queryFn: ({ signal }) => fetchJson<IGblSeason>(gblSeasonUrl, signal),
	});
	return { gblSeason: data, gblSeasonFetchCompleted: isSuccess || isError };
};
