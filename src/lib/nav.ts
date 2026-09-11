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
	trash: '/trash',
	tools: '/tools',
	settings: '/settings',
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
