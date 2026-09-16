import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { BEST_BUDDY_LEVEL } from '../utils/pokemon-helper';
import { findTradeableSpeciesData, type TradeableLeagueData, type TradeableSpeciesData } from '../workers/compute.worker';
import {
	buildEvolutionLineFixture,
	buildGamemaster,
	buildMainFixture,
	mockDPSEntry,
	mockPokemon,
	mockType,
	rank,
} from './mass-delete-fixtures';
import { computeTradeableString, DEFAULT_PROTECTION } from './MassDelete';

const leagueData = (overrides: Partial<TradeableLeagueData> = {}): TradeableLeagueData => ({
	patterns: [],
	floorOk: false,
	...overrides,
});

/** A species that's floor-eligible for Great/Ultra but has no tied patterns
 *  to carve out — the common shape for tests that only care about admission,
 *  not the carve-out mechanism itself. */
const floorEligible = (overrides: Partial<TradeableSpeciesData> = {}): TradeableSpeciesData => ({
	great: leagueData({ floorOk: true }),
	ultra: leagueData({ floorOk: true }),
	master: leagueData(),
	...overrides,
});

const call = (
	gamemasterPokemon: Parameters<typeof computeTradeableString>[0],
	overrides: Partial<{
		rankLists: Array<Record<string, { rank: number } | undefined>>;
		raidDPS: Record<string, Record<string, ReturnType<typeof mockDPSEntry>>>;
		raidMetric: 'dps' | 'tdo' | 'edps';
		gl: GameLanguage;
		trashGreat: number;
		trashUltra: number;
		trashMaster: number;
		trashRaid: number;
		tradeableSpeciesData: Parameters<typeof computeTradeableString>[9];
		protect: typeof DEFAULT_PROTECTION;
		whitelist: Set<string>;
		onlyLowIv: boolean;
		cp: number;
	}> = {}
) =>
	computeTradeableString(
		gamemasterPokemon,
		overrides.rankLists ?? [{}, {}, {}],
		overrides.raidDPS ?? {},
		overrides.raidMetric ?? 'dps',
		overrides.gl ?? GameLanguage.en,
		overrides.trashGreat ?? 10,
		overrides.trashUltra ?? 10,
		overrides.trashMaster ?? 10,
		overrides.trashRaid ?? 10,
		overrides.tradeableSpeciesData ?? {},
		overrides.protect ?? DEFAULT_PROTECTION,
		overrides.whitelist ?? new Set<string>(),
		overrides.onlyLowIv ?? false,
		overrides.cp ?? 2500
	);

describe('computeTradeableString — Master League relevance (pure rank, no IV condition on admission)', () => {
	it('a Master-ranked species is included, an unranked one is not', () => {
		const goodmon = mockPokemon({ speciesId: 'goodmon', dex: 601 });
		const badmon = mockPokemon({ speciesId: 'badmon', dex: 602 });
		const gamemasterPokemon = buildGamemaster([goodmon, badmon]);

		const result = call(gamemasterPokemon, { rankLists: [{}, {}, { goodmon: rank(1) }] });

		expect(result).toContain('601');
		expect(result).not.toContain('602');
	});

	it("a later evolution stage's good Master rank rescues every earlier stage too (forward reachability)", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const result = call(gamemasterPokemon, { rankLists: [{}, {}, { venusaur: rank(1) }] });

		expect(result).toContain('1');
		expect(result).toContain('2');
		expect(result).toContain('3');
	});

	it('admission never depends on `tradeableSpeciesData` having an entry for the ranked species — pure rank, always', () => {
		const goodmon = mockPokemon({ speciesId: 'nodata', dex: 609 });
		const gamemasterPokemon = buildGamemaster([goodmon]);

		// Deliberately empty — simulates the data still loading, or the
		// species missing from it for any reason.
		const result = call(gamemasterPokemon, { rankLists: [{}, {}, { nodata: rank(1) }], tradeableSpeciesData: {} });

		expect(result).toContain('609');
	});
});

describe('findTradeableSpeciesData — per-species Great/Ultra/Master analysis', () => {
	it('a species whose tied-top-1 spread needs 5+ everywhere at some level is floor-eligible for that league', () => {
		const mon = mockPokemon({ speciesId: 'highbucketmon', dex: 1, baseStats: { atk: 120, def: 120, hp: 120 } });
		const gamemasterPokemon = buildGamemaster([mon]);

		const data = findTradeableSpeciesData({ gamemasterPokemon });

		expect(data[mon.speciesId].great.floorOk).toBe(true);
		expect(data[mon.speciesId].ultra.floorOk).toBe(true);
	});

	it('a species whose tied-top-1 spread is the classic low-Attack shape at the current level is floor-ineligible', () => {
		const mon = mockPokemon({ speciesId: 'lowattackmon', dex: 2, baseStats: { atk: 250, def: 100, hp: 100 } });
		const gamemasterPokemon = buildGamemaster([mon]);

		const data = findTradeableSpeciesData({ gamemasterPokemon });

		expect(data[mon.speciesId].great.floorOk).toBe(false);
	});

	it('a Shadow form is never in the result at all — never a trade candidate to begin with', () => {
		const shadow = mockPokemon({ speciesId: 'shadowfloor_shadow', dex: 4, isShadow: true });
		const gamemasterPokemon = buildGamemaster([shadow]);

		const data = findTradeableSpeciesData({ gamemasterPokemon });

		expect(data[shadow.speciesId]).toBeUndefined();
	});

	it('the exact hundo is never included in `patterns` for any league — `!4*` already covers it unconditionally', () => {
		const mon = mockPokemon({ speciesId: 'anymon', dex: 5, baseStats: { atk: 150, def: 150, hp: 150 } });
		const gamemasterPokemon = buildGamemaster([mon]);

		const data = findTradeableSpeciesData({ gamemasterPokemon });

		for (const league of ['great', 'ultra', 'master'] as const) {
			expect(data[mon.speciesId][league].patterns.some((p) => p.A === 15 && p.D === 15 && p.S === 15)).toBe(false);
		}
	});

	it('a genuine stat-product tie (15/15/14, from HP flooring) shows up as a Master pattern to carve out', () => {
		// Same base-stat fixture used elsewhere this session to reproduce a
		// real, confirmed HP-floor tie at level 50 for the uncapped cap.
		const tiedmon = mockPokemon({ speciesId: 'tiedmon', dex: 6, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);

		const data = findTradeableSpeciesData({ gamemasterPokemon });

		expect(data[tiedmon.speciesId].master.patterns).toContainEqual({ A: 15, D: 15, S: 14 });
	});

	it('honors a single explicit maxLevel only — never both at once, same rule as findBadIvCarveOuts', () => {
		// Base HP 5 — the same fixture used across this session's other tests,
		// empirically confirmed to floor-tie raw IV 14 and 15 at level 51
		// specifically, with no tie at all at level 50.
		const level51tied = mockPokemon({
			speciesId: 'tradelevel51tied',
			dex: 7,
			baseStats: { atk: 100, def: 132, hp: 5 },
		});
		const gamemasterPokemon = buildGamemaster([level51tied]);

		const atLevel50 = findTradeableSpeciesData({ gamemasterPokemon });
		expect(atLevel50[level51tied.speciesId].master.patterns).toEqual([]);

		const atLevel51 = findTradeableSpeciesData({ gamemasterPokemon, maxLevel: BEST_BUDDY_LEVEL });
		expect(atLevel51[level51tied.speciesId].master.patterns).toContainEqual({ A: 15, D: 15, S: 14 });
	});
});

describe('computeTradeableString — Great/Ultra League relevance (rank + floor-5 admission)', () => {
	it('a Great-ranked species is only included when its own tied-for-best spread needs floor 5+ in every stat', () => {
		const floormon = mockPokemon({ speciesId: 'floormon', dex: 604 });
		const nofloormon = mockPokemon({ speciesId: 'nofloormon', dex: 605 });
		const gamemasterPokemon = buildGamemaster([floormon, nofloormon]);
		const rankLists = [{ floormon: rank(1), nofloormon: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				floormon: floorEligible({ great: leagueData({ floorOk: true }) }),
				nofloormon: floorEligible({ great: leagueData({ floorOk: false }), ultra: leagueData({ floorOk: false }) }),
			},
		});

		expect(result).toContain('604');
		expect(result).not.toContain('605');
	});

	it('an Ultra-ranked species is only included when its own tied-for-best spread needs floor 5+ in every stat', () => {
		const floormon = mockPokemon({ speciesId: 'ufloormon', dex: 606 });
		const nofloormon = mockPokemon({ speciesId: 'unofloormon', dex: 607 });
		const gamemasterPokemon = buildGamemaster([floormon, nofloormon]);
		const rankLists = [{}, { ufloormon: rank(1), unofloormon: rank(1) }, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				ufloormon: floorEligible({ great: leagueData({ floorOk: false }), ultra: leagueData({ floorOk: true }) }),
				unofloormon: floorEligible({ great: leagueData({ floorOk: false }), ultra: leagueData({ floorOk: false }) }),
			},
		});

		expect(result).toContain('606');
		expect(result).not.toContain('607');
	});

	it("a later evolution stage's good rank+floor rescues every earlier stage too (forward reachability)", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const rankLists = [{ venusaur: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: { venusaur: floorEligible() },
		});

		expect(result).toContain('1');
		expect(result).toContain('2');
		expect(result).toContain('3');
	});

	it("an earlier stage that's independently ranked and floor-eligible on ITS OWN spread is kept even when the later, better-ranked stage's own spread fails the floor", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		// bulbasaur clears the cutoff on its own (rank 8), just not as well as
		// venusaur (rank 1) — but it's bulbasaur's OWN spread that's floor-
		// eligible, not venusaur's, and venusaur's own spread here is not.
		const rankLists = [{ bulbasaur: rank(8), venusaur: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			trashGreat: 10,
			tradeableSpeciesData: {
				bulbasaur: floorEligible(),
				venusaur: floorEligible({ great: leagueData({ floorOk: false }), ultra: leagueData({ floorOk: false }) }),
			},
		});

		expect(result).toContain('1');
	});

	it('a floor-eligible species outside the rank cutoff is still excluded — the floor alone never qualifies it', () => {
		const outsidemon = mockPokemon({ speciesId: 'outsidemon', dex: 608 });
		const gamemasterPokemon = buildGamemaster([outsidemon]);
		const rankLists = [{ outsidemon: rank(50) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			trashGreat: 10,
			tradeableSpeciesData: { outsidemon: floorEligible() },
		});

		expect(result).not.toContain('608');
	});

	it('a ranked species with no `tradeableSpeciesData` entry at all is never admitted via Great/Ultra — floor eligibility can never be assumed', () => {
		const nodata = mockPokemon({ speciesId: 'greatnodata', dex: 610 });
		const gamemasterPokemon = buildGamemaster([nodata]);
		const rankLists = [{ greatnodata: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, { rankLists, tradeableSpeciesData: {} });

		expect(result).not.toContain('610');
	});
});

describe('computeTradeableString — stat-product tie carve-outs (Great/Ultra/Master)', () => {
	it('a Master-qualified species gets a protective clause for its own tied-rank-1 Master pattern — !4* alone is not enough', () => {
		const tiedmon = mockPokemon({ speciesId: 'mastertied', dex: 700, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		const rankLists = [{}, {}, { mastertied: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				mastertied: {
					great: leagueData(),
					ultra: leagueData(),
					master: leagueData({ patterns: [{ A: 15, D: 15, S: 14 }] }),
				},
			},
		});

		expect(result).toContain(String(tiedmon.dex));
		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('a Great-qualified species gets a protective clause for its own tied-rank-1 Great pattern', () => {
		const tiedmon = mockPokemon({ speciesId: 'greattied', dex: 701, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		const rankLists = [{ greattied: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				greattied: {
					great: leagueData({ floorOk: true, patterns: [{ A: 15, D: 15, S: 14 }] }),
					ultra: leagueData(),
					master: leagueData(),
				},
			},
		});

		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('a reachable that qualifies via BOTH Master and Great contributes BOTH leagues’ own patterns, independently', () => {
		const tiedmon = mockPokemon({ speciesId: 'bothtied', dex: 702, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		const rankLists = [{ bothtied: rank(1) }, {}, { bothtied: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				bothtied: {
					great: leagueData({ floorOk: true, patterns: [{ A: 13, D: 15, S: 15 }] }),
					ultra: leagueData(),
					master: leagueData({ patterns: [{ A: 15, D: 15, S: 14 }] }),
				},
			},
		});

		expect(result).toContain(`&!${tiedmon.dex},0-2attack,4attack,0-3defense,0-3hp`);
		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('a pattern is scoped to the league that actually admitted that reachable — a species admitted PURELY via Master does NOT carve out a Great pattern it has, since Great never independently cleared its own cutoff for that reachable', () => {
		const tiedmon = mockPokemon({ speciesId: 'masteronlytied', dex: 705, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		// Only Master is ranked — Great has no rank entry at all here, so this
		// reachable never independently qualifies via Great, even though its
		// own Great pattern is populated in the data below.
		const rankLists = [{}, {}, { masteronlytied: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				masteronlytied: {
					great: leagueData({ floorOk: true, patterns: [{ A: 13, D: 15, S: 15 }] }),
					ultra: leagueData(),
					master: leagueData({ patterns: [{ A: 15, D: 15, S: 14 }] }),
				},
			},
		});

		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
		expect(result).not.toContain('0-2attack,4attack');
	});

	it('a species with no tied patterns at all (the common case) gets no carve-out clause — just the plain dex, same as before this mechanism existed', () => {
		const plainmon = mockPokemon({ speciesId: 'plainmon', dex: 703 });
		const gamemasterPokemon = buildGamemaster([plainmon]);
		const rankLists = [{}, {}, { plainmon: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: { plainmon: floorEligible() },
		});

		expect(result).toContain('703');
		expect(result).not.toContain('attack');
		expect(result).not.toContain('defense');
	});

	it('a reachable stage that never actually qualified the species contributes no carve-out pattern, even if it has one available', () => {
		const { gamemasterPokemon, bulbasaur, ivysaur } = buildEvolutionLineFixture();
		// Only bulbasaur is ranked; ivysaur is not ranked anywhere, so it never
		// qualifies bulbasaur through any league — its own tied pattern (even
		// though populated in the data below) must never leak into the output.
		const rankLists = [{}, {}, { bulbasaur: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				bulbasaur: floorEligible(),
				ivysaur: {
					great: leagueData(),
					ultra: leagueData(),
					master: leagueData({ patterns: [{ A: 2, D: 2, S: 2 }] }),
				},
			},
		});

		expect(bulbasaur.dex).toBe(1);
		expect(ivysaur.dex).toBe(2);
		expect(result).not.toContain('0-1attack');
	});
});

// The worked examples from conversation, pinned down permanently. Each name
// below cross-references the plain-English example it formalizes, so a
// future change that breaks one of these breaks the exact scenario that was
// reasoned through, not just an abstract property.
describe('computeTradeableString — worked examples (simple to specific)', () => {
	it('Example 1 — clearly irrelevant everywhere: unranked in every league, no raid relevance, never suggested at all', () => {
		const ratbat = mockPokemon({ speciesId: 'ratbat', dex: 900 });
		const gamemasterPokemon = buildGamemaster([ratbat]);

		const result = call(gamemasterPokemon, { rankLists: [{}, {}, {}] });

		expect(result).not.toContain('900');
	});

	it('Example 2 — good Master rank, uniquely the hundo at the current level: suggested, with no carve-out beyond the global !4*', () => {
		const golemtron = mockPokemon({ speciesId: 'golemtron', dex: 901 });
		const gamemasterPokemon = buildGamemaster([golemtron]);
		const rankLists = [{}, {}, { golemtron: rank(12) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			trashMaster: 12,
			// Empty `patterns` = no tie at the level being checked — nothing
			// beyond the hundo is ever tied for rank-1 there.
			tradeableSpeciesData: { golemtron: { great: leagueData(), ultra: leagueData(), master: leagueData() } },
		});

		expect(result).toContain('901');
		expect(result).not.toContain('attack');
	});

	it('Example 3 — good Master rank, tied at the default level (50): gets carved out because that IS the level being checked, not because of any cross-level union (there is none anymore)', () => {
		const tiedmon = mockPokemon({ speciesId: 'tiedmon900', dex: 902, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		const rankLists = [{}, {}, { tiedmon900: rank(3) }];

		// This is exactly the real, empirically-confirmed shape for these base
		// stats: a genuine level-50-only HP-floor tie (15/15/14), nothing at
		// level 51. `findTradeableSpeciesData` defaults to level 50, so it
		// picks this up — calling it with `maxLevel: BEST_BUDDY_LEVEL` instead
		// would find nothing at all for this species (proven separately below).
		const dataAtLevel50 = findTradeableSpeciesData({ gamemasterPokemon });
		expect(dataAtLevel50[tiedmon.speciesId].master.patterns).toEqual([{ A: 15, D: 15, S: 14 }]);
		const dataAtLevel51 = findTradeableSpeciesData({ gamemasterPokemon, maxLevel: BEST_BUDDY_LEVEL });
		expect(dataAtLevel51[tiedmon.speciesId].master.patterns).toEqual([]);

		const result = call(gamemasterPokemon, {
			rankLists,
			trashMaster: 3,
			tradeableSpeciesData: dataAtLevel50,
		});

		expect(result).toContain(String(tiedmon.dex));
		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('Example 4 — good Great League rank, but the ideal needs an Attack IV of 0 at the current level: never admitted via Great at all (floor-5 can never reach it)', () => {
		const bulkshell = mockPokemon({ speciesId: 'bulkshell', dex: 903 });
		const gamemasterPokemon = buildGamemaster([bulkshell]);
		const rankLists = [{ bulkshell: rank(4) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			trashGreat: 4,
			tradeableSpeciesData: {
				bulkshell: { great: leagueData({ floorOk: false }), ultra: leagueData(), master: leagueData() },
			},
		});

		expect(result).not.toContain('903');
	});

	it('Example 5 — cross-league scoping: Master-ranked (and Master-tied) but completely unranked in Great, despite ALSO having a Great tie: the species is suggested, its Master tie is protected, but its Great tie is NOT (Great never independently admitted it)', () => {
		const duotype = mockPokemon({ speciesId: 'duotype', dex: 904, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([duotype]);
		// No Great rank entry at all — Great plays no role in admission.
		const rankLists = [{}, {}, { duotype: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				duotype: {
					// Populated purely as a mathematical property of its base
					// stats — Great never gets a chance to consult this, since
					// duotype never clears Great's own rank cutoff.
					great: leagueData({ floorOk: true, patterns: [{ A: 13, D: 15, S: 15 }] }),
					ultra: leagueData(),
					master: leagueData({ patterns: [{ A: 15, D: 15, S: 14 }] }),
				},
			},
		});

		expect(result).toContain(String(duotype.dex));
		expect(result).toContain(`&!${duotype.dex},0-3attack,0-3defense,0-2hp,4hp`); // Master tie: protected
		expect(result).not.toContain('0-2attack,4attack'); // Great tie: NOT protected
	});

	it('Master carve-out propagates to every earlier stage of the family, not just the reachable that actually qualified — verified end to end, not just by rank', () => {
		const { gamemasterPokemon, bulbasaur, ivysaur, venusaur } = buildEvolutionLineFixture();
		// Only venusaur is Master-ranked, and only venusaur's own base stats
		// produce the tied pattern — bulbasaur/ivysaur contribute nothing of
		// their own.
		const rankLists = [{}, {}, { venusaur: rank(1) }];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				bulbasaur: { great: leagueData(), ultra: leagueData(), master: leagueData() },
				ivysaur: { great: leagueData(), ultra: leagueData(), master: leagueData() },
				venusaur: { great: leagueData(), ultra: leagueData(), master: leagueData({ patterns: [{ A: 10, D: 15, S: 15 }] }) },
			},
		});

		// Every one of the three dexes independently carries its own copy of
		// venusaur's own bucket pattern (bucket of A=10 is 2, complement
		// {0,1,3,4}; D/S=15 is bucket 4, complement {0,1,2,3}).
		for (const dex of [bulbasaur.dex, ivysaur.dex, venusaur.dex]) {
			expect(result).toContain(`&!${dex},0-1attack,3-4attack,0-3defense,0-3hp`);
		}
	});

	it('Great League: rank and floor-5 are checked on the SAME reachable, and computeTradeableString carves out EVERY pattern that reachable has (however many `findTradeableSpeciesData` found), propagating the result to the whole family', () => {
		const { gamemasterPokemon, bulbasaur, ivysaur, venusaur } = buildEvolutionLineFixture();
		const rankLists = [{ venusaur: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				bulbasaur: { great: leagueData(), ultra: leagueData(), master: leagueData() },
				ivysaur: { great: leagueData(), ultra: leagueData(), master: leagueData() },
				venusaur: {
					// Two distinct hand-picked patterns here purely to prove
					// `computeTradeableString` carves out ALL of a reachable's
					// patterns, not just the first — it doesn't know or care
					// that `findTradeableSpeciesData` only ever returns
					// patterns from a single requested level these days.
					great: leagueData({
						floorOk: true,
						patterns: [
							{ A: 15, D: 15, S: 14 },
							{ A: 13, D: 15, S: 15 },
						],
					}),
					ultra: leagueData(),
					master: leagueData(),
				},
			},
		});

		for (const dex of [bulbasaur.dex, ivysaur.dex, venusaur.dex]) {
			expect(result).toContain(`&!${dex},0-3attack,0-3defense,0-2hp,4hp`);
			expect(result).toContain(`&!${dex},0-2attack,4attack,0-3defense,0-3hp`);
		}
	});

	it('Great League: a reachable that clears the rank cutoff but fails floor-5 at the level being checked never admits the species at all — no dex, no carve-out, nothing', () => {
		const { gamemasterPokemon, venusaur } = buildEvolutionLineFixture();
		const rankLists = [{ venusaur: rank(1) }, {}, {}];

		const result = call(gamemasterPokemon, {
			rankLists,
			tradeableSpeciesData: {
				venusaur: { great: leagueData({ floorOk: false, patterns: [{ A: 0, D: 15, S: 15 }] }), ultra: leagueData(), master: leagueData() },
			},
		});

		expect(result).not.toContain(String(venusaur.dex));
	});
});

describe('computeTradeableString — raid relevance', () => {
	it('a raid-good species is included regardless of Master rank', () => {
		const raidmon = mockPokemon({ speciesId: 'raidmon', dex: 603, types: [mockType('fire')] });
		const gamemasterPokemon = buildGamemaster([raidmon]);
		const raidDPS = { fire: { raidmon: mockDPSEntry({ speciesId: 'raidmon', dpsRank: 1, tdoRank: 1, edpsRank: 1 }) } };

		const result = call(gamemasterPokemon, { raidDPS, raidMetric: 'dps', trashRaid: 5 });

		expect(result).toContain('603');
	});

	it('raid admission never carves out any pattern — raid ranking is not stat-product-sensitive', () => {
		const raidmon = mockPokemon({ speciesId: 'raidtied', dex: 704, types: [mockType('fire')] });
		const gamemasterPokemon = buildGamemaster([raidmon]);
		const raidDPS = { fire: { raidtied: mockDPSEntry({ speciesId: 'raidtied', dpsRank: 1, tdoRank: 1, edpsRank: 1 }) } };

		// Populated Master pattern, but no Master rank at all — raid alone
		// admits it, so no carve-out should appear.
		const result = call(gamemasterPokemon, {
			raidDPS,
			raidMetric: 'dps',
			trashRaid: 5,
			tradeableSpeciesData: {
				raidtied: { great: leagueData(), ultra: leagueData(), master: leagueData({ patterns: [{ A: 1, D: 1, S: 1 }] }) },
			},
		});

		expect(result).toContain('704');
		expect(result).not.toContain('attack');
	});
});

describe('computeTradeableString — hundo always excluded', () => {
	it('the tail always excludes an exact hundo, regardless of onlyLowIv', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon);
		expect(result).toContain('&!4*');
	});
});

describe('computeTradeableString — onlyLowIv toggle', () => {
	it('off: no bucket restriction beyond hundo exclusion and the unconditional flat Shadow exclusion', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { onlyLowIv: false });
		// The `onlyLowIv` toggle's own restriction is 3 separate `&`-joined
		// positive terms (an AND, one per stat) — distinct in shape from the
		// unconditional flat Shadow exclusion (`&!shadow`), which is always
		// present regardless of this toggle and isn't what this test checks.
		expect(result).not.toContain('&0-2attack&0-2defense&0-2hp');
	});

	it('on: adds the AND-joined low-IV restriction across all three stats', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { onlyLowIv: true });
		expect(result).toContain('&0-2attack&0-2defense&0-2hp');
	});
});

describe('computeTradeableString — category pre-filter (Legendary/Mythical/Ultra Beast)', () => {
	// Mythical isn't included here — it's unconditional (see the dedicated
	// describe block below), unlike Legendary and Ultra Beast which are still
	// real, togglable toggles (both are actually tradeable in-game).
	it.each([['legendary', 'legendarymon'] as const, ['ultraBeast', 'beastmon'] as const])(
		'%s on: never a candidate even when Master-relevant; off: evaluated normally',
		(flagKey, speciesId) => {
			const { gamemasterPokemon } = buildMainFixture();
			const rankLists = [{}, {}, { [speciesId]: rank(1) }];

			const on = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, [flagKey]: true } });
			const off = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, [flagKey]: false } });

			const dex = String(gamemasterPokemon[speciesId].dex);
			expect(on).not.toContain(dex);
			expect(off).toContain(dex);
		}
	);
});

describe('computeTradeableString — Shadow/Mythical handling (unconditional, not togglable)', () => {
	it('a Shadow form is never itself a qualifying candidate — the dex is still suggested via its Master-good non-Shadow sibling, with no per-form clause needed (the flat &!shadow tail already excludes it)', () => {
		const { gamemasterPokemon, shadowmon, shadowmonShadow } = buildMainFixture();
		const rankLists = [{}, {}, { shadowmon: rank(1) }];

		// The `protect.shadow` toggle no longer has any effect here — Shadow
		// trading is impossible in-game, so this is unconditional, exactly
		// like `!4*` — both settings must produce identical output.
		const on = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, shadow: true } });
		const off = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, shadow: false } });

		expect(shadowmonShadow.dex).toBe(shadowmon.dex);
		expect(on).toBe(off);
		expect(on).toContain(String(shadowmon.dex));
		expect(on).not.toContain('&!100,!shadow');
		expect(on).toContain('&!shadow');
	});

	it('a Mythical is never a candidate regardless of the toggle — Mythicals can never be traded in-game, same treatment as Shadow', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const rankLists = [{}, {}, { mythicalmon: rank(1) }];

		const on = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, mythical: true } });
		const off = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, mythical: false } });

		const dex = String(gamemasterPokemon.mythicalmon.dex);
		expect(on).toBe(off);
		expect(on).not.toContain(dex);
		expect(on).toContain('&!mythical');
	});
});

describe('computeTradeableString — manual whitelist, shared-dex edge case', () => {
	it('a whitelisted form still gets its own exclusion clause even when a non-whitelisted sibling shares its dex and qualifies', () => {
		const { gamemasterPokemon, formGrass, formFire } = buildMainFixture();
		const rankLists = [{}, {}, { [formGrass.speciesId]: rank(1), [formFire.speciesId]: rank(1) }];

		const result = call(gamemasterPokemon, { rankLists, whitelist: new Set([formGrass.speciesId]) });

		expect(formFire.dex).toBe(formGrass.dex);
		expect(result).toContain(String(formGrass.dex));
		expect(result).toContain('&!555,!grass');
	});
});

describe('computeTradeableString — tail keywords', () => {
	it('favorite/tagged/megaEvolvable are pure tail keywords', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const on = call(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION } });
		const off = call(gamemasterPokemon, {
			protect: { ...DEFAULT_PROTECTION, favorite: false, tagged: false, megaEvolvable: false },
		});

		expect(on).toContain('&!favorite');
		expect(on).toContain('&!#');
		expect(on).toContain('&!megaevolve');
		expect(off).not.toContain('&!favorite');
		expect(off).not.toContain('&!#');
		expect(off).not.toContain('&!megaevolve');
	});
});

describe('computeTradeableString — pt-BR translation', () => {
	it('localizes the tail keywords', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { gl: GameLanguage.ptbr });

		expect(result).toContain('&!favorito');
		expect(result).toContain('&!megaevolui');
	});
});

describe('computeTradeableString — flat Shadow/Mythical exclusion (unconditional, always on)', () => {
	it('plain, unconditional &!shadow and &!mythical clauses are present regardless of any toggle — same treatment as !4*', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon);

		// No purify-to-hundo bucket carve-out needed here the way the other two
		// tabs need it — Shadows and Mythicals can never be traded at all,
		// in-game, purified or not, so a flat exclusion suffices for both.
		// Right next to the exact-hundo guard, same as before.
		expect(result).toContain('&!4*&!shadow&!mythical');
	});

	it('localizes to pt-BR alongside the rest of the tail', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { gl: GameLanguage.ptbr });

		expect(result).toContain('&!4*&!sombroso&!mítico');
	});
});

describe('computeTradeableString — CP cap (upper bound, not a floor)', () => {
	it.each([2000, 3500])('emits the exact CP cutoff in the tail (cp=%i)', (cp) => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { cp });
		expect(result).toContain(`&!cp${cp}-`);
	});

	it('is independent of the onlyLowIv toggle and the hundo exclusion, both still present', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { cp: 2000, onlyLowIv: true });

		expect(result).toContain('&!4*&!shadow&!mythical&!cp2000-');
		expect(result).toContain('&0-2attack&0-2defense&0-2hp');
	});
});

describe('computeTradeableString — whitelisting a Shadow form is a no-op', () => {
	it('whitelisting the Shadow form of a species changes nothing — it was already unconditionally excluded, so only the non-Shadow whitelisted sibling produces a clause', () => {
		// dex 800 has two sibling forms (water, grass) — water is Master-ranked
		// (drives dex 800 into the tradeable set), grass is whitelisted in its
		// non-Shadow form (which still needs its own scoped exclusion, since
		// dex 800 otherwise qualifies via water). Its Shadow sibling is *also*
		// whitelisted here, but that's redundant: Shadow forms are skipped
		// before the whitelist is even consulted (see the flat &!shadow tail),
		// so whitelisting it changes the output not at all.
		const water = mockPokemon({ speciesId: 'tradewater', dex: 800, types: [mockType('water')] });
		const grass = mockPokemon({ speciesId: 'tradegrass', dex: 800, types: [mockType('grass')] });
		const grassShadow = mockPokemon({
			speciesId: 'tradegrass_shadow',
			dex: 800,
			isShadow: true,
			types: [mockType('grass')],
		});
		const gamemasterPokemon = buildGamemaster([water, grass, grassShadow]);

		const withoutShadowWhitelisted = call(gamemasterPokemon, {
			rankLists: [{}, {}, { [water.speciesId]: rank(1) }],
			whitelist: new Set([grass.speciesId]),
		});
		const withShadowWhitelisted = call(gamemasterPokemon, {
			rankLists: [{}, {}, { [water.speciesId]: rank(1) }],
			whitelist: new Set([grass.speciesId, grassShadow.speciesId]),
		});

		expect(withoutShadowWhitelisted).toContain('&!800,!grass');
		expect(withShadowWhitelisted).toBe(withoutShadowWhitelisted);
	});
});
