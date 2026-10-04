import type { BestIvs, TeamBuilderData } from '../DTOs/ITeamBuilder';

/**
 * CP cap of every league the app knows, by league id. Starts with the three permanent leagues; the rotating / custom cups
 * are added as `leagues.json` loads (see `registerLeagueCaps`, called by `useLeagueDefinitions`). A plain mutable record
 * so the code that only has a league id (the Teams view) can look the cap up wherever it is.
 */
export const LEAGUE_CP: Record<string, number> = { great: 1500, ultra: 2500, master: 10000 };

export const registerLeagueCaps = (leagues: ReadonlyArray<{ id: string; cpCap: number }>): void => {
	for (const league of leagues) LEAGUE_CP[league.id] = league.cpCap;
};

/**
 * Where `TeamBuilderData.ivs` keeps the rank-1 spreads for a CP cap: the permanent leagues' ids for their three caps (a
 * cup at the same cap shares them), `cap-<n>` for any other cap. The same rule as dex-server's `ivsKeyForCap`.
 */
export const ivsKeyForCap = (cpCap: number): string =>
	cpCap === 1500 ? 'great' : cpCap === 2500 ? 'ultra' : cpCap === 10000 ? 'master' : `cap-${cpCap}`;

/** A species' rank-1 spread (`[level, atk, def, hp]`) at a CP cap, if dex-server shipped one. */
export const bestIvsFor = (
	builder: Pick<TeamBuilderData, 'ivs'> | undefined,
	speciesId: string,
	cpCap: number
): BestIvs | undefined => builder?.ivs[speciesId]?.[ivsKeyForCap(cpCap)];
