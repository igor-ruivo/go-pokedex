import { describe, expect, it } from 'vitest';

import { buildGamemaster, mockPokemon } from '../routes/mass-delete-fixtures';
import { type RelevanceSets, sortByCalendarRelevance } from './relevance';

const relevanceSets = (overrides: Partial<RelevanceSets> = {}): RelevanceSets => ({
	great: new Set(),
	ultra: new Set(),
	master: new Set(),
	raid: new Set(),
	greatRank: new Map(),
	ultraRank: new Map(),
	masterRank: new Map(),
	raidRank: new Map(),
	ready: true,
	...overrides,
});

describe('sortByCalendarRelevance — badge count first', () => {
	it('more league/raid badges wins regardless of any rank tiebreak', () => {
		const oneBadge = mockPokemon({ speciesId: 'onebadge', dex: 1 });
		const twoBadges = mockPokemon({ speciesId: 'twobadges', dex: 900 }); // higher dex, would lose a pure dex sort
		const gm = buildGamemaster([oneBadge, twoBadges]);
		const sets = relevanceSets({
			raid: new Set(['onebadge']),
			raidRank: new Map([['onebadge', 1]]), // best possible raid rank
			great: new Set(['twobadges']),
			master: new Set(['twobadges']),
			greatRank: new Map([['twobadges', 50]]),
			masterRank: new Map([['twobadges', 50]]),
		});

		const result = sortByCalendarRelevance([oneBadge, twoBadges], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['twobadges', 'onebadge']);
	});
});

describe('sortByCalendarRelevance — tiebreak priority: raid > master > ultra > great > family line', () => {
	it('same badge count (1 each), both raid-relevant: the better raid rank wins', () => {
		const better = mockPokemon({ speciesId: 'better', dex: 900 });
		const worse = mockPokemon({ speciesId: 'worse', dex: 1 });
		const gm = buildGamemaster([better, worse]);
		const sets = relevanceSets({
			raid: new Set(['better', 'worse']),
			raidRank: new Map([
				['better', 3],
				['worse', 40],
			]),
		});

		const result = sortByCalendarRelevance([worse, better], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['better', 'worse']);
	});

	it('same badge count (1 each), one raid-relevant vs one only great-relevant: the raid one wins — raid is checked before great in the priority chain', () => {
		const raidMon = mockPokemon({ speciesId: 'raidmon', dex: 900 });
		const greatMon = mockPokemon({ speciesId: 'greatmon', dex: 1 });
		const gm = buildGamemaster([raidMon, greatMon]);
		const sets = relevanceSets({
			raid: new Set(['raidmon']),
			raidRank: new Map([['raidmon', 5]]),
			great: new Set(['greatmon']),
			greatRank: new Map([['greatmon', 1]]), // even the very best Great League rank...
		});

		const result = sortByCalendarRelevance([greatMon, raidMon], (p) => p.speciesId, gm, sets);
		// ...still loses to any raid-relevant mon, because raid is compared first.
		expect(result.map((p) => p.speciesId)).toEqual(['raidmon', 'greatmon']);
	});

	it('tied on raid (neither is raid-relevant): falls through to Master rank', () => {
		const better = mockPokemon({ speciesId: 'better', dex: 900 });
		const worse = mockPokemon({ speciesId: 'worse', dex: 1 });
		const gm = buildGamemaster([better, worse]);
		const sets = relevanceSets({
			master: new Set(['better', 'worse']),
			masterRank: new Map([
				['better', 10],
				['worse', 90],
			]),
		});

		const result = sortByCalendarRelevance([worse, better], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['better', 'worse']);
	});

	it('tied on raid and Master: falls through to Ultra rank', () => {
		const better = mockPokemon({ speciesId: 'better', dex: 900 });
		const worse = mockPokemon({ speciesId: 'worse', dex: 1 });
		const gm = buildGamemaster([better, worse]);
		const sets = relevanceSets({
			ultra: new Set(['better', 'worse']),
			ultraRank: new Map([
				['better', 4],
				['worse', 45],
			]),
		});

		const result = sortByCalendarRelevance([worse, better], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['better', 'worse']);
	});

	it('tied on raid, Master, and Ultra: falls through to Great rank', () => {
		const better = mockPokemon({ speciesId: 'better', dex: 900 });
		const worse = mockPokemon({ speciesId: 'worse', dex: 1 });
		const gm = buildGamemaster([better, worse]);
		const sets = relevanceSets({
			great: new Set(['better', 'worse']),
			greatRank: new Map([
				['better', 2],
				['worse', 48],
			]),
		});

		const result = sortByCalendarRelevance([worse, better], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['better', 'worse']);
	});

	it('tied on all four ranks (both zero-badge, unrelated species): falls back to sortByFamilyLine (dex order)', () => {
		const lowDex = mockPokemon({ speciesId: 'lowdex', dex: 1 });
		const highDex = mockPokemon({ speciesId: 'highdex', dex: 900 });
		const gm = buildGamemaster([lowDex, highDex]);
		const sets = relevanceSets();

		const result = sortByCalendarRelevance([highDex, lowDex], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['lowdex', 'highdex']);
	});
});

describe('sortByCalendarRelevance — rank tiebreak respects family reachability', () => {
	it('a base-stage mon inherits its EVOLVED form’s better raid rank for the tiebreak, same reachability sweep as the badge count itself', () => {
		// Base stage, badge-count-wise relevant only because its evolution is —
		// mirrors `leagueBadgesFor`'s own family-reachable design.
		const base = mockPokemon({
			speciesId: 'base',
			dex: 900,
			family: { id: 'f-base', evolutions: ['evolved'] },
		});
		const evolved = mockPokemon({
			speciesId: 'evolved',
			dex: 901,
			family: { id: 'f-base', parent: 'base' },
		});
		const unrelatedButBetterRaid = mockPokemon({ speciesId: 'unrelated', dex: 1 });
		const gm = buildGamemaster([base, evolved, unrelatedButBetterRaid]);
		const sets = relevanceSets({
			raid: new Set(['evolved', 'unrelated']),
			raidRank: new Map([
				['evolved', 5], // base's own reachable family includes this
				['unrelated', 6],
			]),
		});

		const result = sortByCalendarRelevance([unrelatedButBetterRaid, base], (p) => p.speciesId, gm, sets);
		// `base` picks up rank 5 (via `evolved`, reachable from it), beating
		// `unrelated`'s own direct rank 6, even though `base` itself never
		// appears in the raid set/rank map at all.
		expect(result.map((p) => p.speciesId)).toEqual(['base', 'unrelated']);
	});
});
