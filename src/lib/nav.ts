import type { GameLanguage } from '../contexts/language-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { sentenceCase } from './format';

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

export const RANKING_MODES = ['pokedex', 'great', 'ultra', 'master', 'raid'] as const;
export type RankingMode = (typeof RANKING_MODES)[number];

// League/raid tab labels track the player's in-game language, sourced from
// GameTranslator — "Pokédex" isn't a league/raid concept and stays a plain
// proper noun (near-identical across every locale in practice).
export const modeLabel = (mode: RankingMode, gl: GameLanguage): string => {
	switch (mode) {
		case 'pokedex':
			return 'Pokédex';
		case 'great':
			return gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl);
		case 'ultra':
			return gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl);
		case 'master':
			return gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl);
		case 'raid':
			return sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl));
	}
};

/** Same league identity colours the Pokémon detail page uses for its league tabs. */
export const MODE_COLOR: Record<RankingMode, string> = {
	pokedex: 'var(--text-faint)',
	great: 'var(--lg-great)',
	ultra: 'var(--lg-ultra)',
	master: 'var(--lg-master)',
	raid: 'var(--lg-raid)',
};

export const CALENDAR_TABS = ['events', 'bosses', 'spawns', 'rockets', 'eggs'] as const;
export type CalendarTab = (typeof CALENDAR_TABS)[number];

export const MASS_DELETE_TABS = ['non-meta-relevant', 'non-perfect-ivs', 'tradeable'] as const;
export type MassDeleteTab = (typeof MASS_DELETE_TABS)[number];
