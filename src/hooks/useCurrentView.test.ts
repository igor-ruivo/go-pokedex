import { describe, expect, it } from 'vitest';

import { parseView } from './useCurrentView';

describe('parseView', () => {
	it('treats the root as the plain Pokédex', () => {
		expect(parseView('/')).toEqual({ kind: 'pokedex', league: 'pokedex' });
		expect(parseView('')).toEqual({ kind: 'pokedex', league: 'pokedex' });
	});

	it('reads league grids', () => {
		expect(parseView('/great')).toEqual({ kind: 'pokedex', league: 'great' });
		expect(parseView('/ultra')).toEqual({ kind: 'pokedex', league: 'ultra' });
		expect(parseView('/master')).toEqual({ kind: 'pokedex', league: 'master' });
		expect(parseView('/raid')).toEqual({ kind: 'pokedex', league: 'raid' });
	});

	it('reads pokemon pages, defaulting the tab to info', () => {
		expect(parseView('/pokemon/pikachu')).toEqual({ kind: 'pokemon', speciesId: 'pikachu', tab: 'info' });
		expect(parseView('/pokemon/charizard/moves')).toEqual({
			kind: 'pokemon',
			speciesId: 'charizard',
			tab: 'moves',
		});
	});

	it('falls back to info for an unknown pokemon tab', () => {
		expect(parseView('/pokemon/pikachu/bogus')).toEqual({ kind: 'pokemon', speciesId: 'pikachu', tab: 'info' });
	});

	it('decodes species ids', () => {
		expect(parseView('/pokemon/nidoran%E2%99%80/info')).toMatchObject({ speciesId: 'nidoran♀' });
	});

	it('reads calendar pages, defaulting the tab to events', () => {
		expect(parseView('/calendar')).toEqual({ kind: 'calendar', tab: 'events' });
		expect(parseView('/calendar/bosses')).toEqual({ kind: 'calendar', tab: 'bosses' });
		expect(parseView('/calendar/nonsense')).toEqual({ kind: 'calendar', tab: 'events' });
	});

	it('reads the trash page', () => {
		expect(parseView('/trash-pokemon')).toEqual({ kind: 'trash' });
	});

	it('reports anything else as unknown', () => {
		expect(parseView('/definitely-not-a-route')).toEqual({ kind: 'unknown' });
		expect(parseView('/a/b/c')).toEqual({ kind: 'unknown' });
	});
});
