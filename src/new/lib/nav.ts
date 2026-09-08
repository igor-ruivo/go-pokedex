export const R = {
	pokedex: '/new',
	rankings: (league: string): string => `/new/rankings/${league}`,
	pokemon: (speciesId: string): string => `/new/pokemon/${speciesId}`,
	calendar: (tab = 'events'): string => `/new/calendar/${tab}`,
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

export const CALENDAR_TABS = ['events', 'bosses', 'spawns', 'rockets', 'eggs'] as const;
export type CalendarTab = (typeof CALENDAR_TABS)[number];
