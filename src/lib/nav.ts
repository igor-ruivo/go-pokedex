import type { GameLanguage } from '../contexts/language-context';
import type { ILeagueDefinition } from '../DTOs/ILeagueDefinition';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { sentenceCase } from './format';
import { leagueColor, leagueTitle } from './league-visuals';

export const R = {
	pokedex: '/',
	// `type` is only meaningful for the raid mode — a real, shareable/crawlable
	// URL per type (e.g. /rankings/raid/fire), separate from the `?type=`
	// query param the interactive FilterBar keeps using once you're on the
	// page (see Rankings.tsx: the path segment only ever seeds that query
	// param when it's otherwise empty, never fights it).
	rankings: (league: string, type?: string): string => (type ? `/rankings/${league}/${type}` : `/rankings/${league}`),
	pokemon: (speciesId: string, tab?: string): string =>
		tab && tab !== 'ranks' ? `/pokemon/${speciesId}/${tab}` : `/pokemon/${speciesId}`,
	calendar: (tab = 'events'): string => `/calendar/${tab}`,
	moves: '/moves',
	move: (moveId: string): string => `/move/${encodeURIComponent(moveId)}`,
	types: '/types',
	searchStrings: (tab: MassDeleteTab = 'non-meta-relevant'): string => `/search-strings/${tab}`,
	tools: '/tools',
	settings: '/settings',
};

// The always-present modes; any other string is a live league id from
// `leagues.json` (a rotating/custom cup the player has opted into seeing —
// see visible-leagues-context.tsx).
export const STATIC_RANKING_MODES = ['pokedex', 'great', 'ultra', 'master', 'raid'] as const;
export type RankingMode = string;

/** Is `mode` a real, currently-selectable ranking tab — one of the static
 *  ones, or a league id from `leagues` (already filtered to whichever the
 *  player has made visible by the caller). Anything else (a rotated-out or
 *  never-visible cup id lingering in a URL) falls back to 'pokedex'. */
export const isKnownRankingMode = (mode: string, leagues: ReadonlyArray<ILeagueDefinition>): boolean =>
	(STATIC_RANKING_MODES as ReadonlyArray<string>).includes(mode) || leagues.some((l) => l.id === mode);

// Plain English, shown only for the instant before game-translations.json
// resolves (or in the theoretical case a locale is missing one of these —
// see `gameTranslator`'s own doc comment on why it otherwise returns '').
// Callers should still prefer gating a whole page behind the translations
// load (see Rankings.tsx) rather than leaning on this — it exists so a
// static league's chip is never blank even for that one frame, matching
// what a rotating cup's own `leagueTitle` fallback (its stripped PvPoke
// title) already does unconditionally.
const DEFAULT_LEAGUE_TEXT = {
	greatShort: 'Great',
	ultraShort: 'Ultra',
	masterShort: 'Master',
	greatLong: 'Great League',
	ultraLong: 'Ultra League',
	masterLong: 'Master League',
	raid: 'Raids',
} as const;

// League/raid tab labels track the player's in-game language, sourced from
// GameTranslator — "Pokédex" isn't a league/raid concept and stays a plain
// proper noun (near-identical across every locale in practice). A rotating
// cup's title isn't in GameTranslator (it comes straight from PvPoke, whose
// own title is already in-game-accurate), so it's read off `leagues` instead.
export const modeLabel = (mode: RankingMode, gl: GameLanguage, leagues: ReadonlyArray<ILeagueDefinition>): string => {
	switch (mode) {
		case 'pokedex':
			return 'Pokédex';
		case 'great':
			return gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl) || DEFAULT_LEAGUE_TEXT.greatShort;
		case 'ultra':
			return gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl) || DEFAULT_LEAGUE_TEXT.ultraShort;
		case 'master':
			return gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl) || DEFAULT_LEAGUE_TEXT.masterShort;
		case 'raid':
			return sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl) || DEFAULT_LEAGUE_TEXT.raid);
		default: {
			const league = leagues.find((l) => l.id === mode);
			return league ? leagueTitle(league, gl).short : mode;
		}
	}
};

/** The long form of `modeLabel` — "Great League", not just "Great" — for
 *  contexts spelling the league name out in full (the Rankings page title),
 *  rather than the compact chip label every `modeLabel` call site uses. */
export const modeLabelLong = (
	mode: RankingMode,
	gl: GameLanguage,
	leagues: ReadonlyArray<ILeagueDefinition>
): string => {
	switch (mode) {
		case 'pokedex':
			return 'Pokédex';
		case 'great':
			return gameTranslator(GameTranslatorKeys.GreatLeagueLong, gl) || DEFAULT_LEAGUE_TEXT.greatLong;
		case 'ultra':
			return gameTranslator(GameTranslatorKeys.UltraLeagueLong, gl) || DEFAULT_LEAGUE_TEXT.ultraLong;
		case 'master':
			return gameTranslator(GameTranslatorKeys.MasterLeagueLong, gl) || DEFAULT_LEAGUE_TEXT.masterLong;
		case 'raid':
			return sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl) || DEFAULT_LEAGUE_TEXT.raid);
		default: {
			const league = leagues.find((l) => l.id === mode);
			return league ? leagueTitle(league, gl).full : mode;
		}
	}
};

/** Same league identity colours the Pokémon detail page uses for its league tabs. */
export const modeColor = (mode: RankingMode): string => {
	switch (mode) {
		// Red, not a neutral grey — the Pokédex's own brand colour, and it makes
		// this tab read as its own distinct thing rather than "no league",
		// consistent with the icon it already carries everywhere else.
		case 'pokedex':
			return 'var(--neg)';
		case 'great':
			return 'var(--lg-great)';
		case 'ultra':
			return 'var(--lg-ultra)';
		case 'master':
			return 'var(--lg-master)';
		case 'raid':
			return 'var(--lg-raid)';
		default:
			return leagueColor(mode);
	}
};

export const CALENDAR_TABS = ['events', 'bosses', 'spawns', 'rockets', 'eggs'] as const;
export type CalendarTab = (typeof CALENDAR_TABS)[number];

export const MASS_DELETE_TABS = ['non-meta-relevant', 'non-perfect-ivs', 'tradeable'] as const;
export type MassDeleteTab = (typeof MASS_DELETE_TABS)[number];
