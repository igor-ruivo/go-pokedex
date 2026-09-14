import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import {
	buildArgs,
	buildEvolutionLineFixture,
	buildGamemaster,
	buildMainFixture,
	buildSmallSpecialDexesFixture,
	mockDPSEntry,
	mockPokemon,
	rank,
} from './mass-delete-fixtures';
import { computeTrashString, DEFAULT_PROTECTION } from './MassDelete';

/**
 * A two-species (one "special", one plain "control") gamemaster, both
 * otherwise bad-for-everything by default — used for the Legendary/
 * Mythical/Ultra Beast candidate-filter tests, where hand-verifying the
 * exact dex-list encoding (positive "501,502" vs negated "!") is the whole
 * point (see the big comment on `computeTrashString`'s `oppositeDexes`).
 */
const buildPairFixture = (specialOverrides: Partial<ReturnType<typeof mockPokemon>> & { speciesId: string }) => {
	const special = mockPokemon({ dex: 501, ...specialOverrides });
	const control = mockPokemon({ speciesId: 'controlmon', dex: 502 });
	return { gamemasterPokemon: buildGamemaster([special, control]), special, control };
};

describe('computeTrashString — forward-only reachability', () => {
	// Bulbasaur's own Master rank is good; Ivysaur/Venusaur have no rank
	// anywhere. Evaluating Bulbasaur as the candidate must see its own good
	// rank (self-inclusion) and be protected. Evaluating Ivysaur as the
	// candidate must NOT see Bulbasaur's rank (it's not forward-reachable
	// from Ivysaur) and must end up deletable — same for Venusaur.
	it('a later evolution stage cannot "borrow" an earlier stage\'s good rank', () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{}, {}, { bulbasaur: rank(1) }],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		// Hand-verified: universe = {1,2,3}. Deletable = {2,3} (Ivysaur,
		// Venusaur). Positive list "2,3" (3 chars) vs negated "!1" (2 chars)
		// — negated wins, so the string starts by excluding ONLY dex 1
		// (Bulbasaur), meaning it matches dexes 2 and 3.
		expect(result.startsWith('!1&')).toBe(true);
		expect(result).not.toContain('!2');
		expect(result).not.toContain('!3');
	});

	it('with no rank data anywhere, every reachable stage is bad (Math.min-on-empty-array degrades safely to Infinity)', () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const args = buildArgs(gamemasterPokemon, { rankLists: [{}, {}, {}] });

		const result = computeTrashString(args);

		// All three dexes deletable, none excluded — the shortest encoding is
		// a bare "!" (negate nothing), which only happens when every dex in
		// the universe is in the deletable set.
		expect(result.startsWith('!&')).toBe(true);
	});
});

describe('computeTrashString — raid metric switching', () => {
	it('a species can be "good for raids" under one metric and not another', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const raidDPS = {
			psychic: {
				shadowmon: mockDPSEntry({ speciesId: 'shadowmon', dpsRank: 3, tdoRank: 20, edpsRank: 3 }),
			},
		};

		const dpsResult = computeTrashString(
			buildArgs(gamemasterPokemon, { raidDPS, raidMetric: 'dps', trashRaid: 5, protect: { ...DEFAULT_PROTECTION } })
		);
		const tdoResult = computeTrashString(
			buildArgs(gamemasterPokemon, { raidDPS, raidMetric: 'tdo', trashRaid: 5, protect: { ...DEFAULT_PROTECTION } })
		);

		// Under DPS (rank 3 <= cutoff 5) shadowmon is raid-good and protected —
		// its dex (100) never needs its own exclusion clause, since it's not
		// on the dex-shared "always bad" path at all... but its Shadow sibling
		// still needs disambiguation. What matters here: dex 100 is NOT
		// treated the same under both metrics.
		expect(dpsResult).not.toBe(tdoResult);
	});

	it("isGoodForRaids credits a base species with its own Mega form's raid rank (includeMega: true)", () => {
		const { gamemasterPokemon, megabase, megaform } = buildMainFixture();
		// megabase itself has no raid rank anywhere, and no PvP rank either —
		// by default it'd be bad-for-everything. Only its Mega form is ranked.
		const raidDPS = {
			fire: {
				[megaform.speciesId]: mockDPSEntry({ speciesId: megaform.speciesId, dpsRank: 1, tdoRank: 1, edpsRank: 1 }),
			},
		};

		const result = computeTrashString(buildArgs(gamemasterPokemon, { raidDPS, raidMetric: 'dps', trashRaid: 5 }));

		// megabase's dex (200) must NOT appear in the deletable set — it's
		// rescued purely through its Mega form's raid rank, which only
		// `isGoodForRaids`'s `includeMega: true` reachable walk can see (the
		// non-raid `isBadForEverything`/`isBadForEverythingIfItHasHighAttack`
		// paths never include Mega forms in their own reachable walk).
		expect(result).not.toContain(String(megabase.dex));
	});
});

describe('computeTrashString — Master League rescue via forward reachability', () => {
	it("a later evolution stage's good Master rank rescues every earlier stage too", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		// Only Venusaur (the last stage) is Master-ranked; nothing is
		// Great/Ultra-ranked anywhere in the family, and there's no raid data.
		// Bulbasaur and Ivysaur both reach Venusaur going forward, so both are
		// rescued by its rank too — meaning NOTHING in this 3-species universe
		// ends up in the deletable set at all. (`String(bulbasaur.dex)` = "1"
		// is deliberately NOT used as a substring check here — it would
		// falsely match inside "cp1500" in the tail; asserting the exact full
		// string, precomputed by hand from the tail-construction rules, avoids
		// that trap.)
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{}, {}, { venusaur: rank(1) }],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		expect(result).toBe('&!4*&!cp1500-&!#&!favorite&!megaevolve');
	});
});

describe('computeTrashString — Great/Ultra rescue via forward reachability (meta-only, no IV consideration)', () => {
	it("a later stage's Great rank rescues every earlier stage too, unconditionally — no Attack IV check exists anymore", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{ venusaur: rank(1) }, {}, {}],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		expect(result).toBe('&!4*&!cp1500-&!#&!favorite&!megaevolve');
	});

	it("a later stage's Ultra rank rescues every earlier stage too, unconditionally", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{}, { venusaur: rank(1) }, {}],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		expect(result).toBe('&!4*&!cp1500-&!#&!favorite&!megaevolve');
	});
});

describe('computeTrashString — raid rescue via a later stage (isGoodForRaids, non-Mega forward reachability)', () => {
	it("a later stage's good raid rank rescues every earlier stage too", () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const raidDPS = {
			grass: { venusaur: mockDPSEntry({ speciesId: 'venusaur', dpsRank: 1, tdoRank: 1, edpsRank: 1 }) },
		};
		const args = buildArgs(gamemasterPokemon, {
			raidDPS,
			raidMetric: 'dps',
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		expect(result).toBe('&!4*&!cp1500-&!#&!favorite&!megaevolve');
	});
});

describe('computeTrashString — multiple good later stages, different leagues each', () => {
	it('Bulbasaur is protected when Ivysaur AND Venusaur are each good in a DIFFERENT league (not just one good stage)', () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		// Ivysaur good in Great, Venusaur good in Ultra — neither alone would
		// necessarily be the one a naive "check only the last stage" bug would
		// find; both must be considered.
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{ ivysaur: rank(1) }, { venusaur: rank(1) }, {}],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
			trashRaid: 10,
		});

		const result = computeTrashString(args);

		// isBadForEverything takes the family's best rank per league — Great's
		// best is Ivysaur's (good), Ultra's best is Venusaur's (good) — so
		// Master is the only bad league, and "all three bad" is false for
		// every reachable candidate in this family. Nothing is deletable.
		expect(result).toBe('&!4*&!cp1500-&!#&!favorite&!megaevolve');
	});
});

describe('computeTrashString — no IV consideration at all (meta-only domain)', () => {
	it('a Great-relevant species is fully protected regardless of what its own IVs would need to be — there is no Attack IV check left', () => {
		const trademon = mockPokemon({ speciesId: 'trademon', dex: 161 });
		const gamemasterPokemon = buildGamemaster([trademon]);
		const args = buildArgs(gamemasterPokemon, {
			rankLists: [{ trademon: rank(1) }, {}, {}],
			trashGreat: 10,
			trashUltra: 10,
			trashMaster: 10,
		});

		const result = computeTrashString(args);

		// Fully protected (alwaysGood) — dex never enters the deletable set at
		// all, so no "161" appears anywhere in the output. Clearing the rank
		// cutoff is the only thing that matters here now.
		expect(result).not.toContain('161');
	});
});

describe('computeTrashString — protection toggles', () => {
	it('favorite/tagged/megaEvolvable are pure tail keywords, independent of any candidate', () => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const on = computeTrashString(buildArgs(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION } }));
		const off = computeTrashString(
			buildArgs(gamemasterPokemon, {
				protect: { ...DEFAULT_PROTECTION, favorite: false, tagged: false, megaEvolvable: false },
			})
		);

		expect(on).toContain('&!favorite');
		expect(on).toContain('&!#');
		expect(on).toContain('&!megaevolve');
		expect(off).not.toContain('&!favorite');
		expect(off).not.toContain('&!#');
		expect(off).not.toContain('&!megaevolve');
	});

	it.each([
		['legendary', 'legendarymon', { isLegendary: true }] as const,
		['mythical', 'mythicalmon', { isMythical: true }] as const,
		['ultraBeast', 'beastmon', { isBeast: true }] as const,
	])(
		'%s: candidate-filter exclusion — on means never a candidate, off means evaluated normally',
		(flagKey, speciesId, overrides) => {
			const { gamemasterPokemon, special, control } = buildPairFixture({ speciesId, ...overrides });
			expect(special.speciesId).toBe(speciesId);

			const on = computeTrashString(
				buildArgs(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION, [flagKey]: true } })
			);
			const off = computeTrashString(
				buildArgs(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION, [flagKey]: false } })
			);

			// On: only the plain control (dex 502) is deletable — shortest
			// encoding is the positive list "502" (never mentions 501).
			expect(on.startsWith(`${control.dex}&`)).toBe(true);
			expect(on).not.toContain(String(special.dex));
			// Off: both are now bad-for-everything — shortest encoding is the
			// bare "!" (negate nothing), proving the special species is no
			// longer excluded from candidacy.
			expect(off.startsWith('!&')).toBe(true);
		}
	);

	it('shadow: in-loop short-circuit (not a `.filter` exclusion) still protects a Shadow form sharing a dex with its bad non-Shadow sibling', () => {
		const { gamemasterPokemon } = buildMainFixture();
		// Both shadowmon and shadowmon_shadow are bad-for-everything by
		// default (no rank data) — dex 100 enters the deletable set via the
		// non-Shadow form regardless of the toggle.
		const on = computeTrashString(buildArgs(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION, shadow: true } }));
		const off = computeTrashString(buildArgs(gamemasterPokemon, { protect: { ...DEFAULT_PROTECTION, shadow: false } }));

		// On: the Shadow form gets its own disambiguating exclusion clause
		// (bare dex 100 as its id, since it's the only non-shadow sibling at
		// that dex) — this is the exact clause `alwaysGood` produces for it.
		expect(on).toContain('&!100,!shadow');
		// Off: evaluated like anything else — no special clause for it.
		expect(off).not.toContain('&!100,!shadow');
		// Meta mode never needs a blanket `&!shadow` tail keyword either way
		// — every Shadow form's protection (when on) is already the specific
		// clause above, making a blanket keyword redundant dead weight.
		expect(on).not.toContain('&!shadow');
		expect(off).not.toContain('&!shadow');
	});
});

describe('computeTrashString — manual whitelist, shared-dex edge case', () => {
	it('a whitelisted form still gets its own clause even when a non-whitelisted sibling shares its dex and is bad', () => {
		const { gamemasterPokemon, formGrass, formFire } = buildMainFixture();
		const result = computeTrashString(buildArgs(gamemasterPokemon, { whitelist: new Set([formGrass.speciesId]) }));

		expect(formFire.dex).toBe(formGrass.dex);
		// formFire (not whitelisted, bad-for-everything by default) pulls
		// dex 555 into the deletable set; formGrass (whitelisted) still needs
		// — and gets — its own disambiguating exclusion.
		expect(result).toContain('&!555,!grass');
	});

	it('whitelisting a species that was never going to be swept anyway adds nothing at all to the output', () => {
		// Alone at its dex, no sibling — and already good on its own merit (a
		// clean Great rank), so its dex was never entering the deletable set
		// regardless of the whitelist. Whitelisting it should be a true no-op:
		// zero characters added, not even its own dex mentioned anywhere.
		const safemon = mockPokemon({ speciesId: 'safemon', dex: 900 });
		const gamemasterPokemon = buildGamemaster([safemon]);
		// `lowAttackMap` proves it doesn't need a low Attack IV either — without
		// this, the default fail-safe (`needsLessThanFiveAttack` -> true when
		// absent) would still land it in `alwaysBadIfHighAtk`, which is NOT the
		// no-op scenario this test is trying to isolate.
		const commonArgs = {
			rankLists: [{ safemon: rank(1) }, {}, {}],
			lowAttackMap: { safemon: { 1500: false } },
			trashGreat: 10,
		};

		const withoutWhitelist = computeTrashString(buildArgs(gamemasterPokemon, commonArgs));
		const withWhitelist = computeTrashString(
			buildArgs(gamemasterPokemon, { ...commonArgs, whitelist: new Set(['safemon']) })
		);

		expect(withoutWhitelist).toBe(withWhitelist);
		expect(withWhitelist).not.toContain('900');
	});
});

describe('computeTrashString — CP threshold', () => {
	it.each([2000, 3500])('emits the exact CP cutoff in the tail (cp=%i)', (cp) => {
		const { gamemasterPokemon } = buildEvolutionLineFixture();
		const result = computeTrashString(buildArgs(gamemasterPokemon, { cp }));
		expect(result).toContain(`&!cp${cp}-`);
	});
});

describe('computeTrashString — pt-BR translation', () => {
	it('localizes both the tail keywords and an in-clause type-name token', () => {
		const { gamemasterPokemon, formGrass } = buildMainFixture();
		const result = computeTrashString(
			buildArgs(gamemasterPokemon, { gl: GameLanguage.ptbr, whitelist: new Set([formGrass.speciesId]) })
		);

		expect(result).toContain('&!pc1500-');
		expect(result).toContain('&!favorito');
		expect(result).toContain('&!megaevolui');
		expect(result).toContain('&!#');
		// "grass" -> "planta", applied to the whitelist's own disambiguation
		// clause — proves `translatePtBrTypeNames` runs over per-species
		// identity clauses too, not just the tail.
		expect(result).toContain('&!555,!planta');
	});
});

describe('computeTrashString — specialDexes/oppositeDexes toggle-gating regression', () => {
	it('with the Legendary toggle on, its dex is force-excluded even from the shortened negated encoding', () => {
		const { gamemasterPokemon } = buildSmallSpecialDexesFixture();
		const result = computeTrashString(
			buildArgs(gamemasterPokemon, { rankLists: [{}, {}, { goodmon: rank(1) }], trashMaster: 10 })
		);

		// Hand-verified: 8 plain dexes (1-8) all deletable, dex 9 (goodmon)
		// good, dex 10 (legendarymon) never a candidate. Positive list
		// "1,2,3,4,5,6,7,8" (15 chars) vs negated "!9&!10" (6 chars) —
		// negated wins, and it excludes BOTH dex 9 (correctly, it's good)
		// AND dex 10 (via `specialDexes`, since it's never even evaluated).
		expect(result.startsWith('!9&!10&')).toBe(true);
	});

	it('regression: with the toggle off, a bad Legendary is NOT re-protected by the shortened encoding', () => {
		const { gamemasterPokemon } = buildSmallSpecialDexesFixture();
		const result = computeTrashString(
			buildArgs(gamemasterPokemon, {
				rankLists: [{}, {}, { goodmon: rank(1) }],
				trashMaster: 10,
				protect: { ...DEFAULT_PROTECTION, legendary: false },
			})
		);

		// Now legendarymon (dex 10) IS evaluated, and with no rank data of
		// its own, it's bad-for-everything too — deletable set is now
		// {1..8,10}. Positive list is now longer (18 chars) than the negated
		// "!9" (2 chars), so negated wins again, but this time it must NOT
		// exclude dex 10 — if `specialDexes` were still unconditional, this
		// would incorrectly come out as "!9&!10" again, silently keeping the
		// toggle from having any effect.
		expect(result.startsWith('!9&')).toBe(true);
		expect(result.startsWith('!9&!10')).toBe(false);
	});
});
