import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const POKEDEX_LEAGUES = ['pokedex', 'great', 'ultra', 'master', 'raid'] as const;
export type PokedexLeague = (typeof POKEDEX_LEAGUES)[number];

export const POKEMON_TABS = ['info', 'moves', 'counters', 'tables', 'strings'] as const;
export type PokemonTab = (typeof POKEMON_TABS)[number];

export const CALENDAR_TABS = ['events', 'bosses', 'spawns', 'rockets', 'eggs'] as const;
export type CalendarTab = (typeof CALENDAR_TABS)[number];

export type CurrentView =
	| { kind: 'pokedex'; league: PokedexLeague }
	| { kind: 'pokemon'; speciesId: string; tab: PokemonTab }
	| { kind: 'calendar'; tab: CalendarTab }
	| { kind: 'trash' }
	| { kind: 'unknown' };

const oneOf = <T extends string>(options: ReadonlyArray<T>, value: string): value is T =>
	(options as ReadonlyArray<string>).includes(value);

/**
 * Turns a router pathname into a typed description of the current screen. Pure so
 * it can be unit-tested and reused outside of React.
 */
export const parseView = (pathname: string): CurrentView => {
	const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);

	if (segments.length === 0) {
		return { kind: 'pokedex', league: 'pokedex' };
	}

	const [head, second, third] = segments;

	if (head === 'pokemon' && second) {
		const tab = third ?? 'info';
		return { kind: 'pokemon', speciesId: second, tab: oneOf(POKEMON_TABS, tab) ? tab : 'info' };
	}

	if (head === 'calendar') {
		const tab = second ?? 'events';
		return { kind: 'calendar', tab: oneOf(CALENDAR_TABS, tab) ? tab : 'events' };
	}

	if (head === 'trash-pokemon') {
		return { kind: 'trash' };
	}

	if (oneOf(POKEDEX_LEAGUES, head)) {
		return { kind: 'pokedex', league: head };
	}

	return { kind: 'unknown' };
};

export const useCurrentView = (): CurrentView => {
	const { pathname } = useLocation();
	return useMemo(() => parseView(pathname), [pathname]);
};

/** Single source of truth for building in-app URLs. */
export const routes = {
	pokedex: (league: PokedexLeague = 'pokedex'): string => (league === 'pokedex' ? '/' : `/${league}`),
	pokemon: (speciesId: string, tab: PokemonTab = 'info'): string => `/pokemon/${speciesId}/${tab}`,
	calendar: (tab: CalendarTab = 'events'): string => `/calendar/${tab}`,
	trash: (): string => '/trash-pokemon',
};
