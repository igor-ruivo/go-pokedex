import { isTeamLeague, type TeamLeague } from '../../DTOs/ITeamBuilder';

/**
 * The last team picked, remembered for the browser tab's session (sessionStorage): leave the Teams page and come
 * back — by the nav, or from another page — and the team you were on is still there. One team per league, plus the
 * league you were last on. Every access is guarded: storage can be missing or blocked (private windows, blocked
 * site data), and the page has to work the same without it.
 */
const KEY = 'go-pokedex:teams:last';

interface Memory {
	league?: TeamLeague;
	/** `encodeTeam` strings, by league. */
	teams: Partial<Record<TeamLeague, string>>;
}

const read = (): Memory => {
	try {
		const raw = window.sessionStorage.getItem(KEY);
		const parsed = raw ? (JSON.parse(raw) as Partial<Memory>) : undefined;
		return {
			...(isTeamLeague(parsed?.league) ? { league: parsed.league } : {}),
			teams: parsed?.teams && typeof parsed.teams === 'object' ? parsed.teams : {},
		};
	} catch {
		return { teams: {} };
	}
};

const write = (memory: Memory) => {
	try {
		window.sessionStorage.setItem(KEY, JSON.stringify(memory));
	} catch {
		// storage unavailable — nothing to remember
	}
};

/** The league last visited on the Teams page, if any. */
export const lastTeamLeague = (): TeamLeague | undefined => read().league;

/** The team last picked in `league` (an `encodeTeam` string), if any. */
export const lastTeamFor = (league: TeamLeague): string | undefined => read().teams[league];

export const rememberTeam = (league: TeamLeague, encoded: string) => {
	const memory = read();
	if (memory.teams[league] === encoded && memory.league === league) return;
	write({ league, teams: { ...memory.teams, [league]: encoded } });
};

/** A team that was deliberately cleared must not come back the next time the page opens. */
export const forgetTeam = (league: TeamLeague) => {
	const memory = read();
	const teams = { ...memory.teams };
	delete teams[league];
	write({ ...memory, league, teams });
};
