export const R = {
	pokedex: '/new',
	rankings: (league: string): string => `/new/rankings/${league}`,
	pokemon: (speciesId: string, tab?: string): string =>
		tab && tab !== 'ranks' ? `/new/pokemon/${speciesId}/${tab}` : `/new/pokemon/${speciesId}`,
	calendar: (tab = 'events'): string => `/new/calendar/${tab}`,
	moves: '/new/moves',
	move: (moveId: string): string => `/new/move/${encodeURIComponent(moveId)}`,
	types: '/new/types',
	trash: '/new/trash',
	tools: '/new/tools',
	settings: '/new/settings',
};

export const RANKING_MODES = ['pokedex', 'great', 'ultra', 'master', 'raid'] as const;
export type RankingMode = (typeof RANKING_MODES)[number];

export const MODE_LABEL: Record<RankingMode, string> = {
	pokedex: 'Pokédex',
	great: 'Great',
	ultra: 'Ultra',
	master: 'Master',
	raid: 'Raid',
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
