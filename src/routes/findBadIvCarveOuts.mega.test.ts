import { describe, expect, it } from 'vitest';

import { type BadIvCarveOut, findBadIvCarveOuts } from '../workers/compute.worker';
import {
	buildGamemaster,
	buildMegaReachableFixture,
	buildShadowPurifyMegaFixture,
	buildSpeciesSearchMetadata,
	mockPokemon,
} from './mass-delete-fixtures';

/**
 * Unit tests for "Preserve Megas IVs" (Mass Delete's bad-IV tab): the two
 * independent mechanisms `findBadIvCarveOuts` exposes for it —
 * `includeMegaForNonShadow` (a plain catch's raw IVs, checked against a
 * reachable Mega's own tied-top-1 stat product) and `preserveMegaIvs` (a
 * Shadow's purified IVs, checked against a reachable Mega's own tied-top-1
 * *purified* stat product, reached via purify → evolve → Mega-evolve) — and
 * how `MassDelete.tsx`'s two carve-out queries wire them up differently:
 * `masterCarveOuts` (shared with the meta tab) always leaves
 * `includeMegaForNonShadow` at its default (`true`), while `badIvCarveOuts`
 * (the bad-IV tab's own query) ties BOTH flags to the "Preserve Megas IVs"
 * checkbox.
 *
 * Every expected pattern below was derived by literally re-running this
 * file's exact algorithms (`computeBestIVs`/`computeTiedTop1Patterns`/
 * `computeTiedTop1PurifiedPatterns` from `pokemon-helper.ts`, plus the same
 * `ivBucket`/`matchesDefault`/`isExactHundo`/bucket-dedup rules
 * `findBadIvCarveOuts` itself uses) against each fixture's own base stats, in
 * a throwaway script — not hand-guessed — so these are exact expectations,
 * not just "something non-empty got returned".
 */

describe('findBadIvCarveOuts — Preserve Megas IVs: non-Shadow reachable-Mega path (`includeMegaForNonShadow`)', () => {
	it('off (bad-IV tab, checkbox unchecked — the default): a plain catch gets no carve-out from its reachable Mega at all, at any cap', () => {
		const { gamemasterPokemon, greatBase, ultraBase } = buildMegaReachableFixture();
		const carveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(gamemasterPokemon),
			caps: [1500, 2500, Number.MAX_VALUE],
			includeMegaForNonShadow: false,
		});

		// Both bases have deliberately tiny own stats (10/10/10) — their own
		// raw top-1 never clears the 90%-of-cap pre-filter at 1500/2500, and at
		// the uncapped Master cap it's always the exact hundo (blanket-
		// protected) — so ANY entry here could only have come from the
		// (excluded) Mega path.
		expect(carveOuts.some((c) => c.speciesId === greatBase.speciesId)).toBe(false);
		expect(carveOuts.some((c) => c.speciesId === ultraBase.speciesId)).toBe(false);
	});

	it("on (bad-IV tab, checkbox checked): a plain catch's raw IVs get a carve-out matching its reachable Mega's own tied-top-1 spread, at Great, Ultra, and Master alike", () => {
		const { gamemasterPokemon, greatBase, ultraBase } = buildMegaReachableFixture();
		const carveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(gamemasterPokemon),
			caps: [1500, 2500, Number.MAX_VALUE],
			includeMegaForNonShadow: true,
		});

		// greatMega (100/132/180) — real top-1 at both cap 1500 and the
		// uncapped Master cap is the same genuinely-deviating 15/15/14 tie
		// (bucket 4-4-3, fails the default low-Attack shape and isn't a
		// hundo), recorded under greatBase's own speciesId (the origin
		// candidate, not the reachable Mega itself).
		expect(carveOuts.filter((c) => c.speciesId === greatBase.speciesId && c.cap === 1500)).toEqual([
			expect.objectContaining({ pattern: { A: 15, D: 15, S: 14 } }),
		]);
		expect(carveOuts.filter((c) => c.speciesId === greatBase.speciesId && c.cap === Number.MAX_VALUE)).toEqual([
			expect.objectContaining({ pattern: { A: 15, D: 15, S: 14 } }),
		]);

		// ultraMega (300/100/100) — real top-1 at cap 2500 is the
		// genuinely-deviating 11/15/15 (bucket 3-4-4), recorded under
		// ultraBase's own speciesId.
		expect(carveOuts.filter((c) => c.speciesId === ultraBase.speciesId && c.cap === 2500)).toEqual([
			expect.objectContaining({ pattern: { A: 11, D: 15, S: 15 } }),
		]);
	});

	it("omitting the flag entirely defaults to on — matching the shared `masterCarveOuts` query's own behavior, which never overrides it", () => {
		const { gamemasterPokemon, greatBase } = buildMegaReachableFixture();
		const speciesSearchMetadata = buildSpeciesSearchMetadata(gamemasterPokemon);

		const implicit = findBadIvCarveOuts({ gamemasterPokemon, speciesSearchMetadata, caps: [1500] });
		const explicitOn = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata,
			caps: [1500],
			includeMegaForNonShadow: true,
		});

		expect(implicit.filter((c) => c.speciesId === greatBase.speciesId)).toEqual(
			explicitOn.filter((c) => c.speciesId === greatBase.speciesId)
		);
		expect(implicit.some((c) => c.speciesId === greatBase.speciesId)).toBe(true);
	});
});

describe('findBadIvCarveOuts — Preserve Megas IVs: Shadow-purify-into-Mega path (`preserveMegaIvs`)', () => {
	it('off (bad-IV tab, checkbox unchecked — the default): a Shadow gets no carve-out from its purify-then-Mega-evolve line', () => {
		const { gamemasterPokemon, greatShadow, ultraShadow } = buildShadowPurifyMegaFixture();
		const carveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(gamemasterPokemon),
			caps: [1500, 2500, Number.MAX_VALUE],
			// `includeShadowPurify: false` isolates this test to the Mega-only
			// mechanism specifically — left at its own default (`true`) here,
			// mockPokemon's default 120/120/120 stats DO produce a genuine
			// Shadow-only-line carve-out at the uncapped Master cap (no
			// 90%-of-cap pre-filter applies there — unlike at 1500/2500, where
			// 120/120/120's own maxCP falls short of it), which would
			// contaminate this test's "Mega path off means zero entries"
			// assertion with an unrelated true positive.
			includeShadowPurify: false,
			includeMegaForNonShadow: false,
			preserveMegaIvs: false,
		});

		// Both Shadows have plain, unremarkable own stats (mockPokemon's
		// default 120/120/120) — with `includeShadowPurify: false` their own
		// Shadow-only purified line never even runs, so these must be empty
		// outright, not just Mega-free.
		expect(carveOuts.some((c) => c.speciesId === greatShadow.speciesId)).toBe(false);
		expect(carveOuts.some((c) => c.speciesId === ultraShadow.speciesId)).toBe(false);
	});

	it("on: a Shadow's purified IVs get a carve-out for every distinct bucket its reachable Mega's tied-top-1 purified spread lands in, at Great, Ultra, and Master alike", () => {
		const { gamemasterPokemon, greatShadow, ultraShadow } = buildShadowPurifyMegaFixture();
		const carveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(gamemasterPokemon),
			caps: [1500, 2500, Number.MAX_VALUE],
			// See the "off" test above for why this must stay `false` here too:
			// without it, 120/120/120's own genuine Shadow-only-line carve-out
			// at the uncapped Master cap collides bucket-for-bucket with the
			// Mega's own purified pattern there, and — since the Shadow-only
			// pass is evaluated before the Mega pass — silently wins the
			// dedup, replacing part of the expected Mega-derived pattern set
			// with the Shadow's own unrelated one.
			includeShadowPurify: false,
			includeMegaForNonShadow: false,
			preserveMegaIvs: true,
		});
		const patternsFor = (speciesId: string, cap: number) =>
			carveOuts.filter((c) => c.speciesId === speciesId && c.cap === cap).map((c) => c.pattern);

		// greatMega (100/132/180), purified — 7 distinct buckets tie for the
		// best *purified* stat product at cap 1500, identically reproduced at
		// the uncapped Master cap (verified via `computeTiedTop1PurifiedPatterns`
		// directly, then reduced to one representative pattern per distinct
		// bucket the same way `findBadIvCarveOuts` itself does).
		const greatExpected: Array<BadIvCarveOut['pattern']> = [
			{ A: 13, D: 13, S: 12 },
			{ A: 13, D: 13, S: 15 },
			{ A: 13, D: 15, S: 12 },
			{ A: 13, D: 15, S: 15 },
			{ A: 15, D: 13, S: 12 },
			{ A: 15, D: 13, S: 15 },
			{ A: 15, D: 15, S: 12 },
		];
		expect(patternsFor(greatShadow.speciesId, 1500)).toEqual(expect.arrayContaining(greatExpected));
		expect(patternsFor(greatShadow.speciesId, 1500)).toHaveLength(greatExpected.length);
		expect(patternsFor(greatShadow.speciesId, Number.MAX_VALUE)).toEqual(expect.arrayContaining(greatExpected));
		expect(patternsFor(greatShadow.speciesId, Number.MAX_VALUE)).toHaveLength(greatExpected.length);

		// ultraMega (300/100/100), purified — 4 distinct buckets at cap 2500,
		// but a DIFFERENT, larger 7-bucket set at the uncapped Master cap
		// (purification math, not raw — genuinely different from the
		// non-Shadow path's own numbers for the same base stats).
		expect(patternsFor(ultraShadow.speciesId, 2500)).toEqual(
			expect.arrayContaining([
				{ A: 9, D: 13, S: 13 },
				{ A: 9, D: 13, S: 15 },
				{ A: 9, D: 15, S: 13 },
				{ A: 9, D: 15, S: 15 },
			])
		);
		expect(patternsFor(ultraShadow.speciesId, 2500)).toHaveLength(4);
		expect(patternsFor(ultraShadow.speciesId, Number.MAX_VALUE)).toEqual(
			expect.arrayContaining([
				{ A: 13, D: 13, S: 13 },
				{ A: 13, D: 13, S: 15 },
				{ A: 13, D: 15, S: 13 },
				{ A: 13, D: 15, S: 15 },
				{ A: 15, D: 13, S: 13 },
				{ A: 15, D: 13, S: 15 },
				{ A: 15, D: 15, S: 13 },
			])
		);
		expect(patternsFor(ultraShadow.speciesId, Number.MAX_VALUE)).toHaveLength(7);
	});
});

describe('findBadIvCarveOuts — Preserve Megas IVs: multiple reachable Mega forms from one Shadow are each checked independently', () => {
	it('a Shadow reaching two different Megas (e.g. Mega X and Mega Y) gets carve-outs contributed by BOTH, not just the first one found', () => {
		// Same shape as `buildShadowPurifyMegaFixture`'s own chains (Shadow ->
		// non-Shadow replica -> evolution -> Mega), but with the final stage
		// splitting into two independent Mega forms sharing one dex, exactly
		// like real Mega Charizard X/Y — both attach to the same base
		// (`megaFormsIds`) via the shared `_mega`-prefixed id.
		const mmShadow = mockPokemon({ speciesId: 'mmshadow', dex: 800, isShadow: true });
		const mmBase = mockPokemon({
			speciesId: 'mmbase',
			dex: 800,
			family: { id: 'f-mm', evolutions: ['mmfinal'] },
		});
		const mmFinal = mockPokemon({ speciesId: 'mmfinal', dex: 801, family: { id: 'f-mm', parent: 'mmbase' } });
		// Base stats empirically verified (same throwaway script this file's
		// other fixtures used) to both clear the 90%-of-2500 pre-filter AND
		// land on genuinely non-overlapping bucket sets — Mega X's own bucket
		// set (Attack bucket 2) never collides with Mega Y's (Attack bucket
		// 3-4), so nothing here is a coincidental dedup, both sets survive in
		// full.
		const mmMegaX = mockPokemon({
			speciesId: 'mmfinal_mega_x',
			dex: 801,
			isMega: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const mmMegaY = mockPokemon({
			speciesId: 'mmfinal_mega_y',
			dex: 801,
			isMega: true,
			baseStats: { atk: 250, def: 80, hp: 150 },
		});
		const gamemasterPokemon = buildGamemaster([mmShadow, mmBase, mmFinal, mmMegaX, mmMegaY]);

		const carveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(gamemasterPokemon),
			caps: [2500],
			includeMegaForNonShadow: false,
			preserveMegaIvs: true,
		});
		const patterns = carveOuts
			.filter((c) => c.speciesId === mmShadow.speciesId && c.cap === 2500)
			.map((c) => c.pattern);

		const megaXExpected: Array<BadIvCarveOut['pattern']> = [
			{ A: 9, D: 13, S: 13 },
			{ A: 9, D: 13, S: 15 },
			{ A: 9, D: 15, S: 13 },
			{ A: 9, D: 15, S: 15 },
		];
		const megaYExpected: Array<BadIvCarveOut['pattern']> = [
			{ A: 13, D: 13, S: 13 },
			{ A: 13, D: 13, S: 15 },
			{ A: 13, D: 15, S: 13 },
			{ A: 13, D: 15, S: 15 },
			{ A: 15, D: 13, S: 13 },
			{ A: 15, D: 13, S: 15 },
			{ A: 15, D: 15, S: 13 },
		];
		expect(patterns).toEqual(expect.arrayContaining([...megaXExpected, ...megaYExpected]));
		expect(patterns).toHaveLength(megaXExpected.length + megaYExpected.length);
	});
});

describe('findBadIvCarveOuts — Preserve Megas IVs: the shared `masterCarveOuts`-style call ignores the checkbox entirely', () => {
	it("the non-Shadow reachable-Mega path stays on regardless of `preserveMegaIvs`, when the caller never overrides `includeMegaForNonShadow` (exactly what MassDelete.tsx's `masterCarveOuts` query does)", () => {
		const { gamemasterPokemon, greatBase, ultraBase } = buildMegaReachableFixture();
		const speciesSearchMetadata = buildSpeciesSearchMetadata(gamemasterPokemon);

		const withCheckboxOff = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata,
			caps: [1500, 2500],
			includeShadowPurify: false,
			preserveMegaIvs: false,
		});
		const withCheckboxOn = findBadIvCarveOuts({
			gamemasterPokemon,
			speciesSearchMetadata,
			caps: [1500, 2500],
			includeShadowPurify: false,
			preserveMegaIvs: true,
		});

		for (const carveOuts of [withCheckboxOff, withCheckboxOn]) {
			expect(carveOuts.filter((c) => c.speciesId === greatBase.speciesId && c.cap === 1500)).toEqual([
				expect.objectContaining({ pattern: { A: 15, D: 15, S: 14 } }),
			]);
			expect(carveOuts.filter((c) => c.speciesId === ultraBase.speciesId && c.cap === 2500)).toEqual([
				expect.objectContaining({ pattern: { A: 11, D: 15, S: 15 } }),
			]);
		}
	});
});

describe("findBadIvCarveOuts — Preserve Megas IVs: the bad-IV tab's own query ties BOTH mechanisms to one checkbox", () => {
	// Mirrors `MassDelete.tsx`'s `badIvCarveOuts` query exactly:
	// `includeMegaForNonShadow: preserveMegaIvs` alongside `preserveMegaIvs`
	// itself, so a single boolean gates both the non-Shadow and the
	// Shadow-purify-into-Mega paths together, unlike `masterCarveOuts` above.
	it('checkbox off: neither the non-Shadow nor the Shadow-purify-into-Mega path contributes anything', () => {
		const preserveMegaIvs = false;
		const nonShadow = buildMegaReachableFixture();
		const shadowPurify = buildShadowPurifyMegaFixture();

		const nonShadowCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon: nonShadow.gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(nonShadow.gamemasterPokemon),
			caps: [1500, 2500],
			includeMegaForNonShadow: preserveMegaIvs,
			preserveMegaIvs,
		});
		const shadowCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon: shadowPurify.gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(shadowPurify.gamemasterPokemon),
			caps: [1500, 2500],
			includeMegaForNonShadow: preserveMegaIvs,
			preserveMegaIvs,
		});

		expect(nonShadowCarveOuts.some((c) => c.speciesId === nonShadow.greatBase.speciesId)).toBe(false);
		expect(nonShadowCarveOuts.some((c) => c.speciesId === nonShadow.ultraBase.speciesId)).toBe(false);
		expect(shadowCarveOuts.some((c) => c.speciesId === shadowPurify.greatShadow.speciesId)).toBe(false);
		expect(shadowCarveOuts.some((c) => c.speciesId === shadowPurify.ultraShadow.speciesId)).toBe(false);
	});

	it('checkbox on: BOTH the non-Shadow and the Shadow-purify-into-Mega path contribute', () => {
		const preserveMegaIvs = true;
		const nonShadow = buildMegaReachableFixture();
		const shadowPurify = buildShadowPurifyMegaFixture();

		const nonShadowCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon: nonShadow.gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(nonShadow.gamemasterPokemon),
			caps: [1500, 2500],
			includeMegaForNonShadow: preserveMegaIvs,
			preserveMegaIvs,
		});
		const shadowCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon: shadowPurify.gamemasterPokemon,
			speciesSearchMetadata: buildSpeciesSearchMetadata(shadowPurify.gamemasterPokemon),
			caps: [1500, 2500],
			includeMegaForNonShadow: preserveMegaIvs,
			preserveMegaIvs,
		});

		expect(nonShadowCarveOuts.filter((c) => c.speciesId === nonShadow.greatBase.speciesId && c.cap === 1500)).toEqual([
			expect.objectContaining({ pattern: { A: 15, D: 15, S: 14 } }),
		]);
		expect(nonShadowCarveOuts.filter((c) => c.speciesId === nonShadow.ultraBase.speciesId && c.cap === 2500)).toEqual([
			expect.objectContaining({ pattern: { A: 11, D: 15, S: 15 } }),
		]);
		expect(shadowCarveOuts.some((c) => c.speciesId === shadowPurify.greatShadow.speciesId && c.cap === 1500)).toBe(
			true
		);
		expect(shadowCarveOuts.some((c) => c.speciesId === shadowPurify.ultraShadow.speciesId && c.cap === 2500)).toBe(
			true
		);
	});
});
