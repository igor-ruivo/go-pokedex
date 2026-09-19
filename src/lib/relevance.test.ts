import { describe, expect, it } from 'vitest';

import { buildGamemaster, mockPokemon } from '../routes/mass-delete-fixtures';
import { type RelevanceSets, sortByCalendarRelevance } from './relevance';

const relevanceSets = (overrides: Partial<RelevanceSets> = {}): RelevanceSets => ({
	great: new Set(),
	ultra: new Set(),
	master: new Set(),
	raid: new Set(),
	ready: true,
	...overrides,
});

describe('sortByCalendarRelevance — live countdown outranks everything else', () => {
	it('a species with a countdown always wins, even against more/higher-priority badges', () => {
		const counting = mockPokemon({ speciesId: 'counting', dex: 1 });
		const badged = mockPokemon({ speciesId: 'badged', dex: 900 });
		const gm = buildGamemaster([counting, badged]);
		const sets = relevanceSets({ raid: new Set(['badged']), master: new Set(['badged']) });

		const result = sortByCalendarRelevance(
			[badged, counting],
			(p) => p.speciesId,
			gm,
			sets,
			(p) => (p.speciesId === 'counting' ? 60_000 : undefined)
		);
		expect(result.map((p) => p.speciesId)).toEqual(['counting', 'badged']);
	});

	it('both counting down: the one ending SOONER comes first', () => {
		const soon = mockPokemon({ speciesId: 'soon', dex: 900 });
		const later = mockPokemon({ speciesId: 'later', dex: 1 });
		const gm = buildGamemaster([soon, later]);
		const sets = relevanceSets();
		const timeLeftOf = (p: ReturnType<typeof mockPokemon>) => (p.speciesId === 'soon' ? 5_000 : 500_000);

		const result = sortByCalendarRelevance([later, soon], (p) => p.speciesId, gm, sets, timeLeftOf);
		expect(result.map((p) => p.speciesId)).toEqual(['soon', 'later']);
	});
});

describe('sortByCalendarRelevance — badge count first', () => {
	it('more league/raid badges wins regardless of any rank tiebreak', () => {
		const oneBadge = mockPokemon({ speciesId: 'onebadge', dex: 1 });
		const twoBadges = mockPokemon({ speciesId: 'twobadges', dex: 900 }); // higher dex, would lose a pure dex sort
		const gm = buildGamemaster([oneBadge, twoBadges]);
		const sets = relevanceSets({
			raid: new Set(['onebadge']),
			great: new Set(['twobadges']),
			master: new Set(['twobadges']),
		});

		const result = sortByCalendarRelevance([oneBadge, twoBadges], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['twobadges', 'onebadge']);
	});
});

describe('sortByCalendarRelevance — tied badge COUNT: importance of which badge, not any rank number', () => {
	it('same badge count (1 each), one raid-relevant vs one only great-relevant: raid wins — importance is checked by presence, never by rank', () => {
		const raidMon = mockPokemon({ speciesId: 'raidmon', dex: 900 });
		const greatMon = mockPokemon({ speciesId: 'greatmon', dex: 1 });
		const gm = buildGamemaster([raidMon, greatMon]);
		// greatMon's rank would be the best possible in the old rank-based
		// scheme — irrelevant now, since only badge PRESENCE is compared.
		const sets = relevanceSets({ raid: new Set(['raidmon']), great: new Set(['greatmon']) });

		const result = sortByCalendarRelevance([greatMon, raidMon], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['raidmon', 'greatmon']);
	});

	it('tied on Raid presence (neither has one): Master presence decides next', () => {
		const masterMon = mockPokemon({ speciesId: 'mastermon', dex: 900 });
		const ultraMon = mockPokemon({ speciesId: 'ultramon', dex: 1 });
		const gm = buildGamemaster([masterMon, ultraMon]);
		const sets = relevanceSets({ master: new Set(['mastermon']), ultra: new Set(['ultramon']) });

		const result = sortByCalendarRelevance([ultraMon, masterMon], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['mastermon', 'ultramon']);
	});

	it('tied on Raid, Master, and Ultra presence: Great presence decides last', () => {
		const greatMon = mockPokemon({ speciesId: 'greatmon', dex: 900 });
		const noneMon = mockPokemon({ speciesId: 'nonemon', dex: 1 });
		const gm = buildGamemaster([greatMon, noneMon]);
		const sets = relevanceSets({ great: new Set(['greatmon']) });

		const result = sortByCalendarRelevance([noneMon, greatMon], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['greatmon', 'nonemon']);
	});

	it('exact same badges on both sides: falls straight to sortByFamilyLine (dex order) — rank plays no part at all', () => {
		const lowDex = mockPokemon({ speciesId: 'lowdex', dex: 1 });
		const highDex = mockPokemon({ speciesId: 'highdex', dex: 900 });
		const gm = buildGamemaster([lowDex, highDex]);
		const sets = relevanceSets();

		const result = sortByCalendarRelevance([highDex, lowDex], (p) => p.speciesId, gm, sets);
		expect(result.map((p) => p.speciesId)).toEqual(['lowdex', 'highdex']);
	});
});

describe('sortByCalendarRelevance — badge presence respects family reachability', () => {
	it('a base-stage mon inherits its EVOLVED form’s badge for the tiebreak, same reachability sweep the badge count itself uses', () => {
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
		const unrelated = mockPokemon({ speciesId: 'unrelated', dex: 1 });
		const gm = buildGamemaster([base, evolved, unrelated]);
		const sets = relevanceSets({ raid: new Set(['evolved']) });

		const result = sortByCalendarRelevance([unrelated, base], (p) => p.speciesId, gm, sets);
		// `base` picks up the Raid badge via `evolved` (reachable from it),
		// beating `unrelated`'s zero badges, even though `base` itself never
		// appears in the raid set directly.
		expect(result.map((p) => p.speciesId)).toEqual(['base', 'unrelated']);
	});
});
