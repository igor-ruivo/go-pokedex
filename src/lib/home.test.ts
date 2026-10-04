import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import { nowRaidEntries } from './calendar-events';
import {
	catchableRocketEntries,
	copyrightYears,
	distinctSpecies,
	eventHighlights,
	facesThatFit,
	featuredEvents,
	homeRaidEntries,
	orderedEggEntries,
	randomIndexOtherThan,
	speciesWithShiny,
	topAttackers,
	topRanked,
} from './home';

const entry = (speciesId: string): IEntry => ({ speciesId, shiny: false });
const perLanguage = <T>(value: T): Record<GameLanguage, T> =>
	Object.values(GameLanguage).reduce((acc, l) => ({ ...acc, [l]: value }), {} as Record<GameLanguage, T>);
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

describe('speciesWithShiny', () => {
	it('keeps distinct known species, shiny if any entry of them is, and counts the rest', () => {
		const entries = [
			{ speciesId: 'a', shiny: false },
			{ speciesId: 'a', shiny: true },
			{ speciesId: 'unknown', shiny: true },
			{ speciesId: 'b', shiny: false },
			{ speciesId: 'c', shiny: true },
		];
		expect(speciesWithShiny(entries, (id) => id !== 'unknown', 2)).toEqual({
			shown: [
				{ speciesId: 'a', shiny: true },
				{ speciesId: 'b', shiny: false },
			],
			more: 1,
		});
	});
});

describe('topAttackers', () => {
	it('orders by the metric’s rank, rank 1 first, and leaves the unranked for last', () => {
		type Row = { speciesId: string; r?: number };
		const list: Record<string, Row> = {
			x: { speciesId: 'x', r: 3 },
			y: { speciesId: 'y', r: 1 },
			z: { speciesId: 'z' },
			w: { speciesId: 'w', r: 2 },
		};
		expect(topAttackers(list, (e) => e.r, 3).map((e) => e.speciesId)).toEqual(['y', 'w', 'x']);
		expect(topAttackers(list, (e) => e.r, 4).map((e) => e.speciesId)).toEqual(['y', 'w', 'x', 'z']);
	});
});

describe('randomIndexOtherThan', () => {
	it('never returns the excluded index when there is another one', () => {
		for (let i = 0; i < 200; i++) expect(randomIndexOtherThan(5, 2, Math.random)).not.toBe(2);
	});

	it('stays in range, and returns 0 for a list of one', () => {
		expect(randomIndexOtherThan(1, 0)).toBe(0);
		expect(randomIndexOtherThan(3, undefined, () => 0.999)).toBe(2);
	});
});

describe('homeRaidEntries', () => {
	const e = (speciesId: string, kind: string) => ({ speciesId, kind, shiny: false });
	const shadow = (id: string) => id.startsWith('s_');

	it('counts every kind that is not tier 3 or 1 (Mega, special…) among the higher tiers', () => {
		const list = [e('a', '1'), e('b', '3'), e('x', 'special'), e('d', 'mega'), e('c', '5')];
		expect(homeRaidEntries(list, shadow).map((v) => v.speciesId)).toEqual(['x', 'd', 'c', 'b', 'a']);
	});

	it('puts the higher tiers first, then tier 3, then tier 1', () => {
		const list = [e('a', '1'), e('b', '3'), e('c', '5'), e('d', 'mega')];
		expect(homeRaidEntries(list, shadow).map((x) => x.speciesId)).toEqual(['c', 'd', 'b', 'a']);
	});

	it('never shows a Shadow of tier 3 or 1, but a Shadow of the higher tiers always stays', () => {
		const list = [e('s_x', '3'), e('s_y', '1'), e('s_z', '5'), e('p', '3')];
		expect(homeRaidEntries(list, shadow).map((x) => x.speciesId)).toEqual(['s_z', 'p']);
	});
});

describe('catchableRocketEntries', () => {
	const grunt = (trainerId: string, catchableTiers: Array<number>, shinyPokemon?: Array<string>) => ({
		trainerId,
		tier1: [`${trainerId}-1`],
		tier2: [`${trainerId}-2`],
		tier3: [`${trainerId}-3`],
		catchableTiers,
		shinyPokemon,
	});

	it('lists only the catchable tiers, the leaders’ first', () => {
		const result = catchableRocketEntries([grunt('Grunt', [0]), grunt('Leader Cliff', [2]), grunt('Giovanni', [1, 2])]);
		expect(result.map((x) => x.speciesId)).toEqual(['Leader Cliff-3', 'Giovanni-2', 'Giovanni-3', 'Grunt-1']);
	});

	it('carries the shiny flag', () => {
		expect(catchableRocketEntries([grunt('Arlo', [0], ['Arlo-1'])])).toEqual([{ speciesId: 'Arlo-1', shiny: true }]);
	});
});

describe('orderedEggEntries', () => {
	it('puts 10 km first, then 12, 7, 5, 2, 1', () => {
		const list = ['1', '5', '12', '2', '10', '7'].map((kind) => ({ kind }));
		expect(orderedEggEntries(list).map((x) => x.kind)).toEqual(['10', '12', '7', '5', '2', '1']);
	});
});

describe('copyrightYears', () => {
	it('runs from 2023 to the current year, and never ends before 2026', () => {
		expect(copyrightYears(new Date('2026-10-04'))).toBe('2023–2026');
		expect(copyrightYears(new Date('2028-01-01'))).toBe('2023–2028');
		expect(copyrightYears(new Date('2025-01-01'))).toBe('2023–2026');
	});
});

describe('facesThatFit', () => {
	it('shows everything that fits, with no "+N"', () => {
		expect(facesThatFit(7, 5, 2, 9)).toEqual({ faces: 7, more: 0 });
		expect(facesThatFit(9, 5, 2, 9)).toEqual({ faces: 9, more: 0 });
	});

	it('keeps the last cell for the "+N" when they do not fit', () => {
		expect(facesThatFit(30, 5, 2, 9)).toEqual({ faces: 9, more: 21 });
		expect(facesThatFit(12, 4, 2, 9)).toEqual({ faces: 7, more: 5 });
		expect(facesThatFit(12, 3, 2, 9)).toEqual({ faces: 5, more: 7 });
		expect(facesThatFit(12, 2, 2, 9)).toEqual({ faces: 3, more: 9 });
	});

	it('caps at nine faces even when the room is wider, and counts the rest', () => {
		expect(facesThatFit(10, 8, 2, 9)).toEqual({ faces: 9, more: 1 });
	});

	it('copes with a width that fits no column at all', () => {
		expect(facesThatFit(5, 0, 2, 9)).toEqual({ faces: 1, more: 4 });
	});
});

describe('nowRaidEntries', () => {
	const raid = (speciesId: string, kind: string): IEntry => ({ speciesId, kind, shiny: false });
	const NOW = 1000;
	const special = (id: string, start: number, end: number, raids: Array<IEntry>) => ({
		title: everyLanguage(id),
		date: start,
		dateEnd: end,
		raids,
		rawUrl: id,
	});

	it('lists the rotation, then the raids of every event that is on now, each boss once', () => {
		const posts = [
			post('live', 900, 2000, { raids: [raid('b', '5'), raid('a', '3')] }),
			post('later', 1500, 2500, { raids: [raid('z', '5')] }),
			post('ended', 100, 500, { raids: [raid('y', '5')] }),
		];
		const result = nowRaidEntries({
			posts,
			specialBosses: [],
			currentBosses: [raid('a', '3'), raid('c', '1')],
			language: gl,
			now: NOW,
		});
		expect(result.map((e) => e.speciesId)).toEqual(['a', 'c', 'b']);
	});

	it('includes the bosses of a special window that is on now', () => {
		const result = nowRaidEntries({
			posts: [],
			specialBosses: [special('s1', 900, 2000, [raid('m', 'mega')]), special('s2', 1500, 2000, [raid('n', 'mega')])],
			currentBosses: [],
			language: gl,
			now: NOW,
		});
		expect(result.map((e) => e.speciesId)).toEqual(['m']);
	});
});
