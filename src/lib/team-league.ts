import { isStaticLeague } from '../DTOs/ILeagueDefinition';
import type { TeamLeague } from '../DTOs/ITeamBuilder';

/**
 * The league the Teams page shows: the one asked for (the URL, else the one visited last), if it is one of the permanent
 * leagues or a rotating / custom cup that is active right now (`leagues.json`) — otherwise Great League. A cup's id can only
 * be checked once that file has loaded, so until then the page is `pending` (it waits instead of flashing Great League).
 */
export const resolveTeamLeague = (
	wanted: string | null | undefined,
	leagues: ReadonlyArray<{ id: string }>,
	leaguesLoaded: boolean
): { league: TeamLeague; pending: boolean } => ({
	league: wanted && (isStaticLeague(wanted) || leagues.some((l) => l.id === wanted)) ? wanted : 'great',
	pending: !!wanted && !leaguesLoaded && !isStaticLeague(wanted),
});
