import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import { distinctSpecies, eventHighlights, featuredEvents, topRanked } from './home';

const entry = (speciesId: string): IEntry => ({ speciesId, shiny: false });
const perLanguage = <T>(value: T): Record<GameLanguage, T> =>
	Object.values(GameLanguage).reduce(
		(acc, l) => ({ ...acc, [l]: value }),
		{} as Record<GameLanguage, T>
	);
const everyLanguage = (value: string) => perLanguage(value);

const post = (id: string, start: number, end: number, extra: Partial<IPostEntry> = {}): IPostEntry => ({
	id,
	url: everyLanguage(`https://x/${id}`),
	title: everyLanguage(id),
	subtitle: everyLanguage(''),
	startDate: start,
	endDate: end,
	dateRanges: [{ start, end }],
	imageUrl: '',
	wild: [],
	raids: [],
	eggs: [],
	researches: [],
	incenses: [],
	lures: [],
	bonuses: perLanguage<Array<string>>([]),
	availableLocales: Object.values(GameLanguage),
	source: 'pokemongo',
	...extra,
});

const NOW = 1000;
const gl = GameLanguage.en;
const ids = (posts: Array<IPostEntry>) => posts.map((p) => p.id);

describe('eventHighlights', () => {
	const known = (id: string) => id !== 'unknown';

	it('lists the kinds an event brings, in the order raids, spawns, research, eggs', () => {
		const result = eventHighlights(
			post('e', 0, 1, {
				eggs: [entry('a')],
				wild: [entry('b')],
				researches: [entry('c')],
				raids: [entry('d')],
			}),
			known
		);
		expect(result.map((h) => h.kind)).toEqual(['raids', 'wild', 'researches', 'eggs']);
	});

	it('leaves out kinds with nothing in them, and species the game master does not know', () => {
		const result = eventHighlights(post('e', 0, 1, { wild: [entry('unknown')], raids: [entry('a')] }), known);
		expect(result).toEqual([{ kind: 'raids', ids: ['a'], more: 0 }]);
	});

	it('shows distinct species only, a few at a time, and counts the rest', () => {
		const wild = ['a', 'b', 'a', 'c', 'd', 'e'].map(entry);
		expect(eventHighlights(post('e', 0, 1, { wild }), known, 3)).toEqual([
			{ kind: 'wild', ids: ['a', 'b', 'c'], more: 2 },
		]);
	});

	it('is empty for an event that brings nothing', () => {
		expect(eventHighlights(post('e', 0, 1), known)).toEqual([]);
	});
});

describe('featuredEvents', () => {
	it('puts live events first, the one ending soonest first, and then the coming ones by start', () => {
		const list = [
			post('later', 2000, 3000),
			post('live-long', 500, 9000),
			post('soon', 1500, 2500),
			post('live-short', 900, 1200),
		];
		expect(ids(featuredEvents(list, NOW, gl, 10))).toEqual(['live-short', 'live-long', 'soon', 'later']);
	});

	it('leaves out events that ended, the skipped one, and those without a page in the language', () => {
		const list = [
			post('ended', 0, 900),
			post('skipped', 900, 2000),
			post('no-locale', 900, 2000, { availableLocales: [GameLanguage.de] }),
			post('ok', 900, 2000),
		];
		expect(ids(featuredEvents(list, NOW, gl, 10, 'skipped'))).toEqual(['ok']);
	});

	it('keeps an event that ends exactly now', () => {
		expect(ids(featuredEvents([post('edge', 0, NOW)], NOW, gl, 10))).toEqual(['edge']);
	});

	it('prefers the one with a picture when two start together', () => {
		const list = [post('plain', 2000, 3000), post('pic', 2000, 3000, { imageUrl: 'x.png' })];
		expect(ids(featuredEvents(list, NOW, gl, 10))).toEqual(['pic', 'plain']);
	});

	it('leaves out an event with no title at all, and respects the limit', () => {
		const untitled = post('untitled', 900, 2000, { title: everyLanguage('') });
		const list = [untitled, post('a', 900, 2000), post('b', 900, 2100), post('c', 900, 2200)];
		expect(ids(featuredEvents(list, NOW, gl, 2))).toEqual(['a', 'b']);
	});
});

describe('topRanked', () => {
	it('returns the best-ranked species first', () => {
		const list = { c: { rank: 3 }, a: { rank: 1 }, b: { rank: 2 }, d: { rank: 4 } };
		expect(topRanked(list, 3)).toEqual(['a', 'b', 'c']);
		expect(topRanked({}, 3)).toEqual([]);
	});
});

describe('distinctSpecies', () => {
	it('keeps the first few distinct known species', () => {
		const entries = ['a', 'a', 'unknown', 'b', 'c'].map(entry);
		expect(distinctSpecies(entries, (id) => id !== 'unknown', 2)).toEqual(['a', 'b']);
	});
});
