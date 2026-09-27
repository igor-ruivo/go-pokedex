/** Mirrors one entry of dex-server's `data/leagues.json` — every PvP format
 *  currently pickable in PvPoke's own dropdown (great/ultra/master always
 *  present, plus whatever rotating/custom cup is presently active). */
export interface ILeagueDefinition {
	id: string;
	title: string;
	cpCap: number;
	icon: string;
	rankingFile: string;
}

export const STATIC_LEAGUE_IDS = ['great', 'ultra', 'master'] as const;
export type StaticLeagueId = (typeof STATIC_LEAGUE_IDS)[number];

export const isStaticLeague = (id: string): id is StaticLeagueId =>
	(STATIC_LEAGUE_IDS as ReadonlyArray<string>).includes(id);
