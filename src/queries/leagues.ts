import { useQuery } from '@tanstack/react-query';

import type { ILeagueDefinition } from '../DTOs/ILeagueDefinition';
import { isStaticLeague } from '../DTOs/ILeagueDefinition';
import { registerLeagueCaps } from '../lib/league-caps';
import { leaguesUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

interface LeaguesFile {
	leagues: Array<ILeagueDefinition>;
}

const EMPTY: ReadonlyArray<ILeagueDefinition> = [];

/**
 * Every PvP league dex-server currently mirrors from PvPoke's own dropdown —
 * great/ultra/master always first (guaranteed server-side order), followed
 * by whatever rotating/custom cup is presently active. Small payload; like every dex-server file
 * it is read from the page's snapshot (see `dex-snapshot.ts`), so a new cup rotating in shows on the next load.
 */
export const useLeagueDefinitions = (): { leagues: ReadonlyArray<ILeagueDefinition>; fetchCompleted: boolean } => {
	const { data, isSuccess, isError } = useQuery({
		queryKey: ['leagues'],
		queryFn: async () => (await fetchJson<LeaguesFile>(leaguesUrl)).leagues,
		gcTime: Infinity,
	});
	// Anything that only has a league id (the Teams view) looks its CP cap up in this registry.
	if (data) registerLeagueCaps(data);
	return { leagues: data ?? EMPTY, fetchCompleted: isSuccess || isError };
};

/** Every league from `useLeagueDefinitions()` beyond the static great/ultra/master three. */
export const extraLeagues = (leagues: ReadonlyArray<ILeagueDefinition>): ReadonlyArray<ILeagueDefinition> =>
	leagues.filter((l) => !isStaticLeague(l.id));
