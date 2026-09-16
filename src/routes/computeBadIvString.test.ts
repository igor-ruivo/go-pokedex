import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { type BadIvCarveOut, findBadIvCarveOuts } from '../workers/compute.worker';
import {
	buildBadIvFixture,
	buildGamemaster,
	buildMainFixture,
	buildMultiStageBadIvFixture,
	buildShadowFamilyFixture,
	mockPokemon,
	mockType,
} from './mass-delete-fixtures';
import { computeBadIvString, DEFAULT_PROTECTION } from './MassDelete';

describe('findBadIvCarveOuts — 90%-of-cap-at-15/15/15/L50 pre-filter', () => {
	it('a species whose hundo max CP never reaches 90% of the cap gets no carve-out at all', () => {
		const { gamemasterPokemon, tinymon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		expect(carveOuts.some((c) => c.speciesId === tinymon.speciesId)).toBe(false);
	});
});

describe('findBadIvCarveOuts — a species whose real optimum deviates from the default shape', () => {
	it('produces a carve-out only for the cap where its top-1 spread actually deviates', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const own = carveOuts.filter((c) => c.speciesId === deviantmon.speciesId);

		// Empirically verified (see fixture comment): fits default at 1500,
		// deviates (11/15/15 — Attack bucket 3, not 0-1) at 2500.
		expect(own).toHaveLength(1);
		expect(own[0].cap).toBe(2500);
		expect(own[0].pattern).toEqual({ A: 11, D: 15, S: 15 });
	});
});

describe('findBadIvCarveOuts — a tied-for-top-1 stat product spanning two different buckets (regression)', () => {
	it('regression: when the exact hundo ties with a 15/15/14 spread, the 15/15/14 tie still gets its own carve-out', () => {
		const { gamemasterPokemon, tiedmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const own = carveOuts.filter((c) => c.speciesId === tiedmon.speciesId && c.cap === 1500);

		// A buggy "only look at computeBestIVs's own index 0" implementation
		// would find nothing here — `computeBestIVs` always lists the exact
		// hundo first among stat-product ties, and the hundo itself needs no
		// carve-out (it's already covered by the universal `!4*` keyword) — so
		// the 15/15/14 tie, which is NOT a hundo and does NOT fit the default
		// low-Attack shape, would silently get zero protection despite being
		// tied for the best possible spread.
		expect(own).toHaveLength(1);
		expect(own[0].pattern).toEqual({ A: 15, D: 15, S: 14 });
	});

	it('computeBadIvString emits a protective clause for the tied 15/15/14 spread specifically', () => {
		const { gamemasterPokemon, tiedmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// 15/15/14 -> buckets 4/4/3 -> complement of bucket 4 is {0,1,2,3} for
		// both attack and defense; complement of bucket 3 (hp) is {0,1,2,4},
		// which splits into two ranges ("0-2" and "4", not contiguous).
		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});
});

describe('findBadIvCarveOuts — level 50 / level 51 (Best Buddy) union, regardless of the player’s toggle', () => {
	it('when a species’ top-1 pattern lands in a DIFFERENT bucket at level 50 vs. level 51, both buckets get their own carve-out', () => {
		const { gamemasterPokemon, overlapmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const ownAt1500 = carveOuts.filter((c) => c.speciesId === overlapmon.speciesId && c.cap === 1500);

		// Empirically verified (see fixture comment): overlapmon's own top-1
		// at cap 1500 is 13/14/14 (bucket 3-3-3) at level 50, but 12/15/15
		// (bucket 3-4-4) at level 51 — neither a hundo nor the default shape.
		// A hypothetical implementation that only ever evaluated one of the
		// two levels would silently drop protection for whichever bucket that
		// level doesn't produce — a real wild catch matching the OTHER
		// bucket would then have no carve-out at all on whichever setting the
		// player hasn't toggled.
		expect(ownAt1500).toHaveLength(2);
		expect(ownAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 13, D: 14, S: 14 } }));
		expect(ownAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 12, D: 15, S: 15 } }));
	});

	it('never reads the Best Buddy setting at all — the input has no such parameter, so both levels are always evaluated unconditionally', () => {
		// `findBadIvCarveOuts` takes only `gamemasterPokemon` and `caps` (see
		// `BadIvCarveOutsInput`) — there is no `maxLevel`/`bestBuddy` knob to
		// thread through, structurally guaranteeing every caller gets the
		// same level-50 ∪ level-51 union regardless of what the player (or a
		// test) has the Best Buddy context set to.
		const { gamemasterPokemon, overlapmon } = buildBadIvFixture();
		const first = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500] });
		const second = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500] });
		const ownFirst = first.filter((c) => c.speciesId === overlapmon.speciesId);
		const ownSecond = second.filter((c) => c.speciesId === overlapmon.speciesId);
		expect(ownSecond).toEqual(ownFirst);
		expect(ownFirst).toHaveLength(2); // both the level-50-only and level-51-only bucket, every time
	});
});

describe('findBadIvCarveOuts — collects every distinct pattern across a reachable family, not just the first', () => {
	it('regression: a 2-stage line with two different deviating patterns produces a carve-out for BOTH', () => {
		const { gamemasterPokemon, stageA } = buildMultiStageBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500] });
		const ownAt1500 = carveOuts.filter((c) => c.speciesId === stageA.speciesId && c.cap === 1500);

		// A buggy "stop at the first unprotected stage" implementation would
		// only find one of these two distinct patterns — this is exactly the
		// Lickitung/Kabuto-shaped bug found and fixed manually earlier this
		// session, now locked in as an automated regression.
		//
		// The second pattern's bucket (`2-4-4`) is empirically shared by BOTH
		// stageA's own level-51 top-1 (`10/15/15`) and stageB's level-50 top-1
		// (`8/15/15`) — since stageA is walked first, its level-51 tie wins the
		// bucket-key dedup and supplies the representative raw IVs here. Either
		// raw spread protects the identical bucket, so this is not a behavior
		// change, just a different (level-51-sourced) witness for it.
		expect(ownAt1500).toHaveLength(2);
		expect(ownAt1500).toContainEqual(
			expect.objectContaining({ pattern: { A: 12, D: 15, S: 13 } }) // stageA's own level-50 optimum
		);
		expect(ownAt1500).toContainEqual(
			expect.objectContaining({ pattern: { A: 10, D: 15, S: 15 } }) // stageA's own level-51 optimum (bucket 2-4-4, same bucket stageB's level-50 optimum would also supply)
		);
	});
});

describe('computeBadIvString — base clause literal', () => {
	it('always starts with the exact hand-authored literal, not a groupAttr-generated bucket string', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const result = computeBadIvString(gamemasterPokemon, [], GameLanguage.en, 1500, DEFAULT_PROTECTION, new Set());

		// Deliberately NOT derived via `groupAttr`/`ivBucket` here — this is a
		// hand-written literal in a different textual convention from the
		// carve-out clauses below it (small-int IV range, not bucket index),
		// so a test "cleaning it up" to match the other convention would be
		// wrong. Pin the exact string.
		expect(result.startsWith('2-4attack,0-2defense,0-2hp')).toBe(true);
	});
});

describe('computeBadIvString — carve-out clause for a deviating species', () => {
	it('emits the negated-bucket clause matching the real top-1 spread, not the default shape', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// deviantmon is alone at its dex -> bare dex as its id -> "!<dex>".
		// Pattern 11/15/15 -> bucket 3/4/4 -> negated buckets {0,1,2,4}/{0,1,2,3}/{0,1,2,3}
		// -> groupAttr ranges "0-2,4" / "0-3" / "0-3".
		expect(result).toContain(`&!${deviantmon.dex},0-2attack,4attack,0-3defense,0-3hp`);
	});
});

describe('computeBadIvString — simplified mode', () => {
	it('off (default): behaves exactly like calling without the parameter at all — bucket-specific clause', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const implicit = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set()
		);
		const explicitOff = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			false
		);

		expect(explicitOff).toBe(implicit);
		expect(explicitOff).toContain(`&!${deviantmon.dex},0-2attack,4attack,0-3defense,0-3hp`);
	});

	it('on: a deviating species gets a bare, unconditional dex exclusion — no bucket complement at all', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		// Immediately followed by `&` (the next clause) or end of string — never
		// a comma, which would mean a bucket (or `!shadow`) qualifier tagged
		// along. (Dex 300 is shared with its Shadow form's own, separately
		// `,!shadow`-scoped clause elsewhere in the string — that legitimate
		// `!300,!shadow` is not what this is checking.)
		expect(result).toMatch(new RegExp(`!${deviantmon.dex}(&|$)`));
		expect(result).not.toMatch(new RegExp(`!${deviantmon.dex},(?!!shadow)`));
	});

	it('on: a Shadow-only purification carve-out still gets its `,!shadow` disambiguator when isolated from any non-Shadow carve-out', () => {
		const { gamemasterPokemon, deviantmon, deviantmonShadow } = buildBadIvFixture();
		const allCarveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		// `computeBadIvString` applies every cap's carve-outs unconditionally —
		// the `cp` argument only feeds the tail keyword, it does not filter
		// `carveOuts` by cap — so isolating "only deviantmonShadow's carve-out,
		// no bare non-Shadow one for dex 300" means filtering the array down
		// ourselves, not just picking a cap via the `cp` parameter.
		const carveOuts = allCarveOuts.filter((c) => c.speciesId !== deviantmon.speciesId);
		expect(carveOuts.some((c) => c.speciesId === deviantmonShadow.speciesId)).toBe(true);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(result).toContain(`&!${deviantmonShadow.dex},!shadow`);
		expect(result).not.toContain(`!${deviantmonShadow.dex},!shadow,1-4attack`);
	});

	it('on: once BOTH deviantmon and deviantmonShadow have their own carve-out for the same dex, canonicalization merges them into one bare dex-only clause', () => {
		const { gamemasterPokemon, deviantmon, deviantmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === deviantmon.speciesId)).toBe(true);
		expect(carveOuts.some((c) => c.speciesId === deviantmonShadow.speciesId)).toBe(true);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		// deviantmon is alone at its dex (no sibling form to disambiguate) and
		// both it and its Shadow form end up unconditionally excluded here —
		// the bare `!300` from deviantmon's own carve-out already covers every
		// Shadow status, so deviantmonShadow's own `,!shadow`-scoped clause is
		// provably redundant and must not appear at all.
		expect(result).toContain(`&!${deviantmon.dex}&`);
		expect(result).not.toContain(`!${deviantmonShadow.dex},!shadow`);
	});

	it('on: two sibling forms sharing a dex, BOTH unconditionally excluded, collapse into one bare "!<dex>" clause — dropping the type disambiguation entirely', () => {
		// Two forms at dex 900 (ice, ground), same deviating stats as
		// deviantmon (300/100/100 — real top-1 at cap 2500 is 11/15/15,
		// verified in `buildBadIvFixture`'s own fixture comment) so BOTH
		// independently need a carve-out, hence a bare exclusion clause each
		// in Simplified mode. With every sibling form at dex 900 covered,
		// canonicalization must fold them into a single "!900" — anything
		// short of that is dead weight, since a bare "!900" alone already
		// protects both forms regardless of type.
		const formIce = mockPokemon({
			speciesId: 'formice',
			dex: 900,
			types: [mockType('ice')],
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const formGround = mockPokemon({
			speciesId: 'formground',
			dex: 900,
			types: [mockType('ground')],
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([formIce, formGround]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [2500] });
		expect(carveOuts.some((c) => c.speciesId === formIce.speciesId)).toBe(true);
		expect(carveOuts.some((c) => c.speciesId === formGround.speciesId)).toBe(true);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(result).toContain('&!900&');
		expect(result).not.toContain('!900,ice');
		expect(result).not.toContain('!900,!ice');
		expect(result).not.toContain('!900,ground');
		expect(result).not.toContain('!900,!ground');
	});

	it('COMPLETE mode, single-form dex (no cross-form merge involved): a bare clause absorbs a Shadow-only clause sharing the identical real bucket pattern', () => {
		// Isolates Case A specifically, in Complete mode, with no Case B in
		// play at all (a single-form dex — nothing to disambiguate) — this is
		// the exact real-world shape found at dex 304/532/610 on live
		// gamemaster data: a species' own non-Shadow carve-out and its
		// Shadow-only purification carve-out happen to land on the identical
		// bucket, making the Shadow-scoped one provably redundant. Built by
		// hand (not `findBadIvCarveOuts`) so the two patterns are guaranteed
		// identical rather than hoping real IV math coincides.
		const deviantmon = mockPokemon({ speciesId: 'deviantmon7', dex: 907, baseStats: { atk: 300, def: 100, hp: 100 } });
		const deviantmonShadow = mockPokemon({
			speciesId: 'deviantmon7_shadow',
			dex: 907,
			isShadow: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([deviantmon, deviantmonShadow]);

		const pattern = { A: 11, D: 15, S: 15 };
		const carveOuts: Array<BadIvCarveOut> = [
			{ speciesId: deviantmon.speciesId, cap: 2500, pattern },
			{ speciesId: deviantmonShadow.speciesId, cap: 2500, pattern },
		];

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		expect(result).toContain('&!907,0-2attack,4attack,0-3defense,0-3hp');
		expect(result).not.toContain('!907,!shadow');
	});

	it('COMPLETE mode, single-form dex: a Shadow-only clause is NOT absorbed when its bucket pattern differs from the bare one — both survive', () => {
		// Same shape as above, but the two patterns genuinely differ (as they
		// realistically almost always do — a Shadow's purification carve-out
		// and its non-Shadow raw carve-out are computed from different
		// criteria). Confirms the negative isn't accidentally swallowed by
		// the positive test's setup.
		const deviantmon = mockPokemon({ speciesId: 'deviantmon8', dex: 908, baseStats: { atk: 300, def: 100, hp: 100 } });
		const deviantmonShadow = mockPokemon({
			speciesId: 'deviantmon8_shadow',
			dex: 908,
			isShadow: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([deviantmon, deviantmonShadow]);

		const carveOuts: Array<BadIvCarveOut> = [
			{ speciesId: deviantmon.speciesId, cap: 2500, pattern: { A: 11, D: 15, S: 15 } },
			{ speciesId: deviantmonShadow.speciesId, cap: 2500, pattern: { A: 0, D: 10, S: 13 } },
		];

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		expect(result).toContain('&!908,0-2attack,4attack,0-3defense,0-3hp');
		expect(result).toContain('!908,!shadow,1-4attack,0-1defense,3-4defense,0-2hp,4hp');
	});

	it('COMPLETE mode: two sibling forms that independently deviate to the IDENTICAL bucket pattern collapse into one dex-only clause that keeps that pattern', () => {
		// Same deviating stats as deviantmon (300/100/100 -> real top-1 at cap
		// 2500 is 11/15/15, per `buildBadIvFixture`'s own fixture comment) on
		// BOTH sibling forms at dex 903 — so both independently need a
		// carve-out at the exact same bucket pattern. This is Complete mode
		// (`simplified` omitted/false) — the bucket restriction is real and
		// non-empty, and the merge must keep it, not silently drop it.
		const formIce = mockPokemon({
			speciesId: 'formice3',
			dex: 903,
			types: [mockType('ice')],
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const formGround = mockPokemon({
			speciesId: 'formground3',
			dex: 903,
			types: [mockType('ground')],
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([formIce, formGround]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [2500] });
		expect(carveOuts.filter((c) => c.speciesId === formIce.speciesId)).toEqual([
			expect.objectContaining({ pattern: { A: 11, D: 15, S: 15 } }),
		]);
		expect(carveOuts.filter((c) => c.speciesId === formGround.speciesId)).toEqual([
			expect.objectContaining({ pattern: { A: 11, D: 15, S: 15 } }),
		]);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// One combined clause, bucket pattern intact — not two separate
		// per-form clauses, and not a bucket-less blanket exclusion either.
		expect(result).toContain('&!903,0-2attack,4attack,0-3defense,0-3hp');
		expect(result).not.toContain('!903,ice');
		expect(result).not.toContain('!903,!ice');
		expect(result).not.toContain('!903,ground');
		expect(result).not.toContain('!903,!ground');
	});

	it('COMPLETE mode: the full Shadow x form cartesian product, ALL needing protection at the IDENTICAL bucket, collapses into ONE clause — both dimensions at once', () => {
		// dex 904 has two sibling forms (fire, ice), each with its own Shadow
		// counterpart — 4 gamemaster entries total. Every one of the 4
		// (fire, fire-Shadow, ice, ice-Shadow) needs protection at the exact
		// same bucket pattern. `carveOuts` is built by hand here rather than
		// via `findBadIvCarveOuts` — coaxing the REAL purification math into
		// coincidentally producing an identical pattern across two sibling
		// forms AND their Shadow purification passes isn't practical to set
		// up via base stats alone, and isn't the point of this test: this is
		// specifically about `computeBadIvString`'s own clause construction +
		// canonicalization pipeline, given that input, not about
		// `findBadIvCarveOuts` itself (that's covered elsewhere).
		const formFire = mockPokemon({ speciesId: 'formfire4', dex: 904, types: [mockType('fire')] });
		const formIce = mockPokemon({ speciesId: 'formice4', dex: 904, types: [mockType('ice')] });
		const formFireShadow = mockPokemon({
			speciesId: 'formfire4_shadow',
			dex: 904,
			isShadow: true,
			types: [mockType('fire')],
		});
		const formIceShadow = mockPokemon({
			speciesId: 'formice4_shadow',
			dex: 904,
			isShadow: true,
			types: [mockType('ice')],
		});
		const gamemasterPokemon = buildGamemaster([formFire, formIce, formFireShadow, formIceShadow]);

		const pattern = { A: 11, D: 15, S: 15 }; // bucket 3-4-4, same shape used throughout this file
		const carveOuts: Array<BadIvCarveOut> = [
			{ speciesId: formFire.speciesId, cap: 2500, pattern },
			{ speciesId: formIce.speciesId, cap: 2500, pattern },
			{ speciesId: formFireShadow.speciesId, cap: 2500, pattern },
			{ speciesId: formIceShadow.speciesId, cap: 2500, pattern },
		];

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// One single clause: no form disambiguator, no Shadow scope, bucket
		// pattern intact — Case A collapses each form's Shadow-only clause
		// into its own bare-per-form one first, THEN Case B folds both
		// now-bare forms together, since they share the identical bucket.
		expect(result).toContain('&!904,0-2attack,4attack,0-3defense,0-3hp');
		expect(result).not.toContain('!904,fire');
		expect(result).not.toContain('!904,!fire');
		expect(result).not.toContain('!904,ice');
		expect(result).not.toContain('!904,!ice');
		expect(result).not.toContain('!904,!shadow');
		expect(result).not.toContain('!904,shadow');
	});

	it('SIMPLIFIED mode: the same full Shadow x form cartesian product collapses into ONE bare clause (bucket-less, since Simplified never carries one)', () => {
		// Same 4-entry universe as above, but through Simplified mode — every
		// combination ends up unconditional (`extra === ''`) rather than
		// sharing a real bucket, so this exercises the SAME two-dimension
		// collapse machinery at the other end of the `extra` spectrum: the
		// original, always-supported "no bucket at all" case.
		const formFire = mockPokemon({ speciesId: 'formfire5', dex: 905, types: [mockType('fire')] });
		const formIce = mockPokemon({ speciesId: 'formice5', dex: 905, types: [mockType('ice')] });
		const formFireShadow = mockPokemon({
			speciesId: 'formfire5_shadow',
			dex: 905,
			isShadow: true,
			types: [mockType('fire')],
		});
		const formIceShadow = mockPokemon({
			speciesId: 'formice5_shadow',
			dex: 905,
			isShadow: true,
			types: [mockType('ice')],
		});
		const gamemasterPokemon = buildGamemaster([formFire, formIce, formFireShadow, formIceShadow]);

		const pattern = { A: 11, D: 15, S: 15 };
		const carveOuts: Array<BadIvCarveOut> = [
			{ speciesId: formFire.speciesId, cap: 2500, pattern },
			{ speciesId: formIce.speciesId, cap: 2500, pattern },
			{ speciesId: formFireShadow.speciesId, cap: 2500, pattern },
			{ speciesId: formIceShadow.speciesId, cap: 2500, pattern },
		];

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(result).toMatch(/!905(&|$)/);
		expect(result).not.toContain('!905,fire');
		expect(result).not.toContain('!905,!fire');
		expect(result).not.toContain('!905,ice');
		expect(result).not.toContain('!905,!ice');
		expect(result).not.toContain('!905,!shadow');
		expect(result).not.toContain('!905,shadow');
	});

	it('the cross-form merge is blocked when one form is covered ONLY for Shadow — its non-Shadow catches are never protected by anything', () => {
		// A bare (shadow-agnostic) clause for a form already covers BOTH
		// Shadow and non-Shadow catches of it — identity matching alone
		// doesn't distinguish Shadow status unless a term explicitly scopes
		// it. So the only way a form's non-Shadow side stays genuinely
		// uncovered is if it has NO bare entry at all, only a Shadow-scoped
		// one — exactly ice's situation here: its own raw (unpurified) top-1
		// already fits the default shape (no carve-out needed for it), but
		// its purified best does not, so ONLY its Shadow-only clause exists.
		// fire's own Shadow+non-Shadow pair still legitimately collapses
		// (Case A, same form, same bucket) — but that alone can't extend to
		// a dex-wide merge, since ice never has a bare entry at any `extra`.
		const formFire = mockPokemon({ speciesId: 'formfire6', dex: 906, types: [mockType('fire')] });
		const formIce = mockPokemon({ speciesId: 'formice6', dex: 906, types: [mockType('ice')] });
		const formFireShadow = mockPokemon({
			speciesId: 'formfire6_shadow',
			dex: 906,
			isShadow: true,
			types: [mockType('fire')],
		});
		const formIceShadow = mockPokemon({
			speciesId: 'formice6_shadow',
			dex: 906,
			isShadow: true,
			types: [mockType('ice')],
		});
		const gamemasterPokemon = buildGamemaster([formFire, formIce, formFireShadow, formIceShadow]);

		const pattern = { A: 11, D: 15, S: 15 };
		const carveOuts: Array<BadIvCarveOut> = [
			{ speciesId: formFire.speciesId, cap: 2500, pattern },
			{ speciesId: formFireShadow.speciesId, cap: 2500, pattern },
			// formIce (non-Shadow): deliberately no entry — its own raw top-1
			// already fits the default shape.
			{ speciesId: formIceShadow.speciesId, cap: 2500, pattern },
		];

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// fire's own pair still legitimately collapses to one bare-per-form
		// clause...
		expect(result).toContain('&!906,!fire,0-2attack,4attack,0-3defense,0-3hp');
		// ...but the dex-wide merge across BOTH forms must NOT happen: ice
		// never has a bare entry at all, so its own non-Shadow catches are
		// never protected by anything — dropping form disambiguation here
		// would wrongly ALSO protect fire's non-Shadow catches merged with
		// nothing, or worse, silently imply ice's non-Shadow side is covered
		// when it isn't.
		expect(result).not.toMatch(/!906,0-2attack/); // no bare-dex(no form)+bucket clause
		expect(result).toContain('!906,!ice,!shadow,0-2attack,4attack,0-3defense,0-3hp');
	});

	it('on: a dex with a sibling form left OUT of the exclusion set is never collapsed — the untouched sibling would be wrongly swept into protection too', () => {
		// Same two forms as above, but only formIce gets a real carve-out this
		// time (a plain, unremarkable species at dex 901 stays perfectly
		// default-shaped, needing none) — collapsing to a bare "!901" would
		// wrongly ALSO protect formGround's every IV spread, when it should
		// stay fully targetable.
		const formIce = mockPokemon({
			speciesId: 'formice2',
			dex: 901,
			types: [mockType('ice')],
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const formGround = mockPokemon({
			speciesId: 'formground2',
			dex: 901,
			types: [mockType('ground')],
			baseStats: { atk: 120, def: 120, hp: 120 },
		});
		const gamemasterPokemon = buildGamemaster([formIce, formGround]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [2500] });
		expect(carveOuts.some((c) => c.speciesId === formIce.speciesId)).toBe(true);
		expect(carveOuts.some((c) => c.speciesId === formGround.speciesId)).toBe(false);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(result).not.toContain('&!901&');
		expect(result).not.toMatch(/!901(&|$)/);
	});

	it('on: produces a strictly shorter string than Complete mode for the same inputs', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const complete = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);
		const simplified = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(simplified.length).toBeLessThan(complete.length);
	});

	it('on: multiple carve-outs for the same species (different caps/patterns) collapse into one deduplicated bare clause', () => {
		const { gamemasterPokemon, stageA } = buildMultiStageBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		// Two distinct patterns exist for stageA at cap 1500 (see the regression
		// test above) — simplified mode must still emit its bare exclusion only
		// once, not once per pattern.
		const occurrences = result.split(`!${stageA.dex}`).length - 1;
		expect(occurrences).toBe(1);
	});
});

describe('computeBadIvString — Legendary/Mythical/Ultra Beast toggle vs. carve-outs (regression)', () => {
	it('with the toggle on, the tail keyword covers it and its own carve-out clause is dead weight — skipped', () => {
		const { gamemasterPokemon, deviantlegendary } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		// The worker itself must still compute it — only the string-builder
		// decides whether to use it.
		expect(carveOuts.some((c) => c.speciesId === deviantlegendary.speciesId && c.cap === 2500)).toBe(true);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set()
		);
		expect(result).not.toContain(`!${deviantlegendary.dex},`);
		expect(result).toContain('&!legendary');
	});

	it('regression: with the toggle off, the per-species carve-out clause must appear — this is the bug fixed this session', () => {
		const { gamemasterPokemon, deviantlegendary } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			{
				...DEFAULT_PROTECTION,
				legendary: false,
			},
			new Set()
		);

		expect(result).not.toContain('&!legendary');
		expect(result).toContain(`&!${deviantlegendary.dex},0-2attack,4attack,0-3defense,0-3hp`);
	});
});

describe('computeBadIvString — Shadow forms: purification-aware carve-outs, plus the plain tail keyword', () => {
	it('a Shadow form CAN appear in findBadIvCarveOuts output — purification (+2/+2/+2, capped) is evaluated, not skipped', () => {
		const shadowbase = mockPokemon({ speciesId: 'shadowbadiv', dex: 306, baseStats: { atk: 300, def: 100, hp: 100 } });
		const shadowform = mockPokemon({
			speciesId: 'shadowbadiv_shadow',
			dex: 306,
			isShadow: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([shadowbase, shadowform]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		// Same stats as `deviantmon`/`deviantmonShadow` — empirically verified
		// (see that fixture's own comment) to need a genuine purification-only
		// carve-out at cap 1500.
		expect(carveOuts.some((c) => c.speciesId === 'shadowbadiv_shadow' && c.cap === 1500)).toBe(true);
	});

	it('the `!shadow` tail keyword still works as an independent, additional protection layer', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		// DEFAULT_PROTECTION.shadow is off by default (unlike every other
		// flag) — see MassDelete.tsx's own comment on why. Explicitly turn it
		// on for the "on" case rather than assuming the default.
		const on = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			{ ...DEFAULT_PROTECTION, shadow: true },
			new Set()
		);
		const off = computeBadIvString(gamemasterPokemon, [], GameLanguage.en, 1500, DEFAULT_PROTECTION, new Set());

		expect(on).toContain('&!shadow');
		expect(off).not.toContain('&!shadow');
	});
});

describe('computeBadIvString — manual whitelist, shared-dex edge case', () => {
	it('an unconditional clause with no stat qualifiers, still resolved correctly when a sibling shares the dex', () => {
		const { gamemasterPokemon, formGrass, formFire } = buildMainFixture();
		expect(formGrass.dex).toBe(formFire.dex);

		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set([formGrass.speciesId])
		);

		// Unique-type disambiguation ("555,grass"), negated, no bucket
		// qualifiers at all — full protection regardless of IVs.
		expect(result).toContain('&!555,!grass');
		expect(result).not.toContain('!555,!fire');
	});

	it('whitelisting a species that ALREADY has a real computed carve-out discards that carve-out entirely, replacing it with the unconditional clause', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		// Sanity: deviantmon genuinely has a real carve-out at 2500 (see the
		// earlier "deviating species" test) — this test only means something if
		// that's true.
		expect(carveOuts.some((c) => c.speciesId === deviantmon.speciesId && c.cap === 2500)).toBe(true);

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set([deviantmon.speciesId])
		);

		// The bucket-qualified carve-out clause (from the earlier test) must be
		// GONE — replaced by the plain unconditional one instead, not added
		// alongside it.
		expect(result).not.toContain(`&!${deviantmon.dex},0-2attack,4attack,0-3defense,0-3hp`);
		expect(result).toContain(`&!${deviantmon.dex}`);
	});
});

describe('computeBadIvString — CP threshold', () => {
	it.each([2000, 3500])('emits the exact CP cutoff in the tail (cp=%i)', (cp) => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const result = computeBadIvString(gamemasterPokemon, [], GameLanguage.en, cp, DEFAULT_PROTECTION, new Set());
		expect(result).toContain(`&!cp${cp}-`);
	});
});

describe('computeBadIvString — pt-BR translation', () => {
	it('localizes the base clause, the tail keywords, and an in-clause type-name token', () => {
		const { gamemasterPokemon, formGrass } = buildMainFixture();
		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.ptbr,
			1500,
			{ ...DEFAULT_PROTECTION, shadow: true },
			new Set([formGrass.speciesId])
		);

		// A/D/S are localized at construction time (before the ptbr pass),
		// so the base clause is already in Portuguese, not double-translated.
		expect(result.startsWith('2-4ataque,0-2defesa,0-2ps')).toBe(true);
		expect(result).toContain('&!pc1500-');
		expect(result).toContain('&!favorito');
		expect(result).toContain('&!megaevolui');
		expect(result).toContain('&!lendário');
		expect(result).toContain('&!mítico');
		expect(result).toContain('&!ultracriatura');
		expect(result).toContain('&!sombroso');
		// "grass" -> "planta" inside the whitelist's own disambiguation clause.
		expect(result).toContain('&!555,!planta');
	});
});

describe('computeBadIvString — Shadow-purify hundo guard (unconditional, always on)', () => {
	it('the guard clause is present regardless of mode, protect flags, or whitelist — same treatment as !4*', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const result = computeBadIvString(gamemasterPokemon, [], GameLanguage.en, 1500, DEFAULT_PROTECTION, new Set());

		// This tab's own base literal already targets any raw Attack bucket
		// >= 2 (`2-4attack,...`) — meaning a Shadow catch with Attack bucket 3
		// (raw 11-14, not yet an exact hundo) would otherwise be swept as
		// "bad", even though purifying it (+2/stat, capped 15) might make it
		// an exact 15/15/15. This unconditional clause protects the whole
		// "Shadow AND Attack/Defense/HP all bucket 3-4" population, in both
		// Complete and Simplified mode alike (it doesn't depend on `carveOuts`
		// at all).
		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('present identically in Simplified mode too — this guard is independent of the `simplified` parameter', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			true
		);

		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('localizes to pt-BR alongside the rest of the tail', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const result = computeBadIvString(gamemasterPokemon, [], GameLanguage.ptbr, 1500, DEFAULT_PROTECTION, new Set());

		expect(result).toContain('&!4*&0-2ataque,0-2defesa,0-2ps,!sombroso');
	});
});

describe('findBadIvCarveOuts — Shadow purification awareness', () => {
	it('a Shadow species gets its own carve-out for the pre-purification raw spread that turns into its true optimum once purified', () => {
		const { gamemasterPokemon, deviantmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const ownAt1500 = carveOuts.filter((c) => c.speciesId === deviantmonShadow.speciesId && c.cap === 1500);

		// Empirically verified: purifying (raw +2, capped 15) makes raw
		// 0/10/13 and 0/10/15 tie for the best *purified* stat product —
		// bucket 0-2-3 and 0-2-4, neither the default shape (Defense bucket 2
		// fails the >=3 requirement). deviantmon itself needs NO cap-1500
		// carve-out at all (its own raw top-1 already fits the default shape)
		// — these are genuinely new, purification-only carve-outs.
		expect(ownAt1500).toHaveLength(2);
		expect(ownAt1500.map((c) => c.pattern)).toContainEqual({ A: 0, D: 10, S: 13 });
		expect(ownAt1500.map((c) => c.pattern)).toContainEqual({ A: 0, D: 10, S: 15 });
	});

	it('a Shadow whose purified-best already fits the default shape needs no carve-out at all — purification alone is enough', () => {
		const { gamemasterPokemon, blendmon, blendmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		// blendmon's own raw top-1 at 1500 deviates (bucket 2-4-4) — it DOES
		// need its own (non-Shadow) carve-out.
		expect(carveOuts.some((c) => c.speciesId === blendmon.speciesId && c.cap === 1500)).toBe(true);
		// But every one of a Shadow's purified-best ties has Attack bucket 1
		// (≤1), landing inside the default shape — no Shadow-specific entry
		// needed at any cap.
		expect(carveOuts.some((c) => c.speciesId === blendmonShadow.speciesId)).toBe(false);
	});

	it('dead-weight avoidance: a Shadow purified-best pattern identical to its non-Shadow sibling’s own raw pattern gets no redundant entry — but a level-51-only purified pattern still gets its own genuine carve-out', () => {
		const { gamemasterPokemon, overlapmon, overlapmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		// overlapmon's own raw top-1 at 1500 deviates at BOTH evaluated
		// levels, to two different buckets: 3-3-3 (level 50, 13/14/14) and
		// 3-4-4 (level 51, 12/15/15) — both are genuinely needed, regardless
		// of which level the player has toggled.
		const ownAt1500 = carveOuts.filter((c) => c.speciesId === overlapmon.speciesId && c.cap === 1500);
		expect(ownAt1500).toHaveLength(2);
		expect(ownAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 13, D: 14, S: 14 } }));
		expect(ownAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 12, D: 15, S: 15 } }));

		// overlapmon never clears the 90%-of-2500 pre-filter at either level
		// (its 15/15/15 max CP is well under 2250), so cap 2500 gets nothing.
		expect(carveOuts.some((c) => c.speciesId === overlapmon.speciesId && c.cap === 2500)).toBe(false);

		// A Shadow's purified-best at level 50 lands in the EXACT same bucket
		// as overlapmon's own level-50 raw top-1 (3-3-3, i.e. raw 11/12/12
		// purified) — already covered by the shadow-agnostic clause the
		// non-Shadow analysis emits, so that specific bucket must NOT get its
		// own redundant Shadow-scoped entry.
		const shadowAt1500 = carveOuts.filter((c) => c.speciesId === overlapmonShadow.speciesId && c.cap === 1500);
		expect(shadowAt1500.some((c) => c.pattern.A === 11 && c.pattern.D === 12 && c.pattern.S === 12)).toBe(false);

		// But a Shadow's purified-best at level 51 lands in FOUR different,
		// genuinely uncovered buckets — real level-51-only protection a
		// level-50-only analysis would have missed entirely.
		expect(shadowAt1500).toHaveLength(4);
		expect(shadowAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 10, D: 13, S: 13 } })); // 2-3-3
		expect(shadowAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 10, D: 13, S: 15 } })); // 2-3-4
		expect(shadowAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 10, D: 15, S: 13 } })); // 2-4-3
		expect(shadowAt1500).toContainEqual(expect.objectContaining({ pattern: { A: 10, D: 15, S: 15 } })); // 2-4-4
	});

	it('a Shadow whose family never clears the 90%-of-cap pre-filter gets no carve-out either — purification cannot change that', () => {
		const { gamemasterPokemon, tinymonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		expect(carveOuts.some((c) => c.speciesId === tinymonShadow.speciesId)).toBe(false);
	});
});

describe('computeBadIvString — Shadow-scoped purification carve-out clauses', () => {
	it('emits a `,!shadow`-scoped clause for a genuine purification-only carve-out, distinct from any non-Shadow clause', () => {
		const { gamemasterPokemon, deviantmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// Bucket 0-2-3 -> complement per field: attack bucket0 -> "1-4attack";
		// defense bucket2 -> "0-1defense,3-4defense"; hp bucket3 -> "0-2hp,4hp".
		expect(result).toContain(`&!${deviantmonShadow.dex},!shadow,1-4attack,0-1defense,3-4defense,0-2hp,4hp`);
	});

	it('does NOT emit a redundant shadow-scoped clause for the bucket the non-Shadow analysis already covers, but DOES emit one for level-51-only purified buckets it doesn’t', () => {
		const { gamemasterPokemon, overlapmon, overlapmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// Bucket 3-3-3 (level 50, raw 11/12/12 purified) is the one genuinely
		// shared between overlapmon's own top-1 and its Shadow's purified-best
		// — its complement (`0-2attack,4attack,0-2defense,4defense,0-2hp,4hp`)
		// must appear only on the plain (shadow-agnostic) clause, never on a
		// `,!shadow`-scoped one.
		expect(result).toContain(`!${overlapmon.dex},0-2attack,4attack,0-2defense,4defense,0-2hp,4hp`);
		// Bucket 3-3-3's own shadow-scoped clause specifically (as opposed to
		// any of the four genuinely-distinct level-51 buckets below, one of
		// which happens to share this bucket's Attack/Defense complement) must
		// never appear.
		expect(result).not.toContain(`!${overlapmonShadow.dex},!shadow,0-2attack,4attack,0-2defense,4defense,0-2hp,4hp`);

		// overlapmon's own level-51-only bucket (3-4-4) also gets its plain
		// clause, same treatment.
		expect(result).toContain(`!${overlapmon.dex},0-2attack,4attack,0-3defense,0-3hp`);

		// But the four buckets a Shadow's purified-best reaches ONLY at level
		// 51 (2-3-3, 2-3-4, 2-4-3, 2-4-4) are genuinely uncovered by the
		// non-Shadow analysis, so each DOES get its own `,!shadow`-scoped
		// clause.
		expect(result).toContain(`!${overlapmonShadow.dex},!shadow,0-1attack,3-4attack,0-2defense,4defense,0-2hp,4hp`);
		expect(result).toContain(`!${overlapmonShadow.dex},!shadow,0-1attack,3-4attack,0-2defense,4defense,0-3hp`);
		expect(result).toContain(`!${overlapmonShadow.dex},!shadow,0-1attack,3-4attack,0-3defense,0-2hp,4hp`);
		expect(result).toContain(`!${overlapmonShadow.dex},!shadow,0-1attack,3-4attack,0-3defense,0-3hp`);
	});

	it('a Shadow-derived carve-out is skipped while its category toggle is still on, same dead-weight avoidance as the regular carve-outs', () => {
		const legendaryShadow = mockPokemon({
			speciesId: 'deviantlegendary_shadow',
			dex: 301,
			isShadow: true,
			isLegendary: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const nonShadow = mockPokemon({
			speciesId: 'deviantlegendary',
			dex: 301,
			isLegendary: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([nonShadow, legendaryShadow]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === legendaryShadow.speciesId)).toBe(true);

		const on = computeBadIvString(gamemasterPokemon, carveOuts, GameLanguage.en, 2500, DEFAULT_PROTECTION, new Set());
		expect(on).not.toContain(`!${legendaryShadow.dex},!shadow`);
		expect(on).toContain('&!legendary');

		const off = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			{ ...DEFAULT_PROTECTION, legendary: false },
			new Set()
		);
		expect(off).toContain(`!${legendaryShadow.dex},!shadow`);
	});

	it('whitelisting the Shadow form specifically replaces its purification carve-out with a plain unconditional clause, leaving the non-Shadow sibling’s own clause untouched', () => {
		const { gamemasterPokemon, deviantmon, deviantmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set([deviantmonShadow.speciesId])
		);

		expect(result).not.toContain(`!${deviantmonShadow.dex},!shadow,1-4attack`);
		// deviantmon's own (non-Shadow, cap-2500) clause is untouched.
		expect(result).toContain(`!${deviantmon.dex},0-2attack,4attack,0-3defense,0-3hp`);
	});
});

describe('findBadIvCarveOuts — real-scale multi-stage Shadow tie explosion (Machop family)', () => {
	it('the non-Shadow line gets zero carve-outs — every stage already fits the default shape or is a clean hundo', () => {
		const { gamemasterPokemon, machop, machoke, machamp } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		for (const id of [machop.speciesId, machoke.speciesId, machamp.speciesId]) {
			expect(carveOuts.some((c) => c.speciesId === id)).toBe(false);
		}
	});

	it('Machop-Shadow gets all 16 entries: the 7-way hundo-tie explosion at both caps, plus Machoke’s own 2-pattern contribution at cap 1500', () => {
		const { gamemasterPokemon, machopShadow } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const own = carveOuts.filter((c) => c.speciesId === machopShadow.speciesId);

		expect(own).toHaveLength(16);
		const at1500 = own.filter((c) => c.cap === 1500);
		const at2500 = own.filter((c) => c.cap === 2500);
		expect(at1500).toHaveLength(9);
		expect(at2500).toHaveLength(7);

		// The 7-way hundo-tie explosion: every {3,4}³ bucket combo except the
		// hundo itself (4-4-4, already covered by `!4*`) — raw 13/14/15 all
		// purify to 15, so any raw bucket 3-or-4 per stat ties for the best
		// purified stat product.
		const hundoTieBuckets = [
			{ A: 13, D: 13, S: 13 },
			{ A: 13, D: 13, S: 15 },
			{ A: 13, D: 15, S: 13 },
			{ A: 13, D: 15, S: 15 },
			{ A: 15, D: 13, S: 13 },
			{ A: 15, D: 13, S: 15 },
			{ A: 15, D: 15, S: 13 },
		];
		for (const pattern of hundoTieBuckets) {
			expect(at1500.map((c) => c.pattern)).toContainEqual(pattern);
			expect(at2500.map((c) => c.pattern)).toContainEqual(pattern);
		}
		// Machoke's own purified-best contribution, only relevant at cap 1500
		// (at cap 2500 Machoke's own ceiling is itself the hundo-tie, already
		// counted above).
		expect(at1500.map((c) => c.pattern)).toContainEqual({ A: 0, D: 13, S: 9 });
		expect(at1500.map((c) => c.pattern)).toContainEqual({ A: 0, D: 15, S: 9 });
	});

	it('Machoke-Shadow gets exactly 9 entries, a genuine subset of Machop-Shadow’s — nothing it discovers is missing from Machop-Shadow’s own set', () => {
		const { gamemasterPokemon, machopShadow, machokeShadow } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const machopOwn = carveOuts.filter((c) => c.speciesId === machopShadow.speciesId);
		const machokeOwn = carveOuts.filter((c) => c.speciesId === machokeShadow.speciesId);

		expect(machokeOwn).toHaveLength(9);
		const bucketKey = (c: { pattern: { A: number; D: number; S: number }; cap: number }) =>
			`${c.pattern.A}-${c.pattern.D}-${c.pattern.S}|${c.cap}`;
		const machopKeys = new Set(machopOwn.map(bucketKey));
		for (const entry of machokeOwn) {
			expect(machopKeys.has(bucketKey(entry))).toBe(true);
		}
	});

	it('Machamp-Shadow gets zero entries — its own purified best already fits the default shape at every cap', () => {
		const { gamemasterPokemon, machampShadow } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		expect(carveOuts.some((c) => c.speciesId === machampShadow.speciesId)).toBe(false);
	});
});

describe('computeBadIvString — Machop-family Shadow tie explosion produces a well-formed, correctly-scoped string', () => {
	it('emits a `,!shadow`-scoped clause for every one of Machop-Shadow’s distinct patterns, none for the non-Shadow line, none for Machamp-Shadow', () => {
		const { gamemasterPokemon, machop, machoke, machamp, machopShadow, machampShadow } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// 16 raw carve-out entries, but the clause text doesn't encode which
		// cap it's for — the same 7 hundo-tie patterns recur at both caps and
		// correctly collapse via `seenClauses` to one clause each: 7 unique
		// hundo-tie clauses + 2 unique Machoke-contributed clauses = 9.
		const shadowClauseCount = (result.match(new RegExp(`!${machopShadow.dex},!shadow`, 'g')) ?? []).length;
		expect(shadowClauseCount).toBe(9);
		// The non-Shadow line has zero carve-outs of its own — dex 900/901
		// only ever appear as part of a `,!shadow`-scoped clause (Machop-
		// Shadow's own dex, reused since Shadow shares its non-Shadow
		// sibling's dex), never as a plain, non-shadow-scoped clause.
		for (const id of [machop, machoke, machamp]) {
			expect(result).not.toMatch(new RegExp(`!${id.dex},(?!!shadow)`));
		}
		// Machamp-Shadow shares its dex with Machamp but has zero entries of
		// its own — no shadow-scoped clause for dex 902 should exist either.
		expect(result).not.toContain(`!${machampShadow.dex},!shadow`);
	});

	it('spot-checks one exact clause from the hundo-tie explosion and one from Machoke’s own contribution', () => {
		const { gamemasterPokemon, machopShadow } = buildShadowFamilyFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
		);

		// Bucket 3-3-3: complement per field is {0,1,2,4} -> "0-2,4".
		expect(result).toContain(`&!${machopShadow.dex},!shadow,0-2attack,4attack,0-2defense,4defense,0-2hp,4hp`);
		// Machoke's own pattern {A:0,D:15,S:9}: bucket 0-4-2 -> complement
		// attack{1,2,3,4}->"1-4", defense{0,1,2,3}->"0-3", hp{0,1,3,4}->"0-1,3-4".
		expect(result).toContain(`&!${machopShadow.dex},!shadow,1-4attack,0-3defense,0-1hp,3-4hp`);
	});
});

describe('computeBadIvString — masterCarveOuts (Master League stat-product tie protection, non-Shadow only)', () => {
	// Same `tiedmon` (100/132/180) fixture used throughout this session —
	// empirically confirmed to floor-tie 15/15/14 with the hundo at level 50
	// specifically, for the uncapped Master cap.
	const buildFixture = () => {
		const tiedmon = mockPokemon({ speciesId: 'badivtiedmon', dex: 950, baseStats: { atk: 100, def: 132, hp: 180 } });
		const gamemasterPokemon = buildGamemaster([tiedmon]);
		const masterCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			caps: [Number.MAX_VALUE],
			includeShadowPurify: false,
		});
		return { gamemasterPokemon, tiedmon, masterCarveOuts };
	};

	it('emits the same protective clause shape for a masterCarveOuts entry as it does for a Great/Ultra carveOuts one', () => {
		const { gamemasterPokemon, tiedmon, masterCarveOuts } = buildFixture();

		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			false,
			masterCarveOuts
		);

		expect(result).toContain(`&!${tiedmon.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('applies unconditionally, with no candidate-set filtering — this tab has no "already good, skip it" concept, unlike the other two', () => {
		// No whitelist, no protection toggle, nothing else marking this
		// species as special — it still gets the clause purely because its
		// own raw IVs tie the Master hundo.
		const { gamemasterPokemon, tiedmon, masterCarveOuts } = buildFixture();

		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set()
			// simplified and masterCarveOuts both omitted — defaults `false`/`[]`
		);
		expect(result).not.toContain(String(tiedmon.dex));

		const resultWithMasterData = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			2500,
			DEFAULT_PROTECTION,
			new Set(),
			false,
			masterCarveOuts
		);
		expect(resultWithMasterData).toContain(`&!${tiedmon.dex}`);
	});

	it('Simplified mode collapses a masterCarveOuts entry into the same bare, unconditional exclusion as any other carve-out', () => {
		const { gamemasterPokemon, tiedmon, masterCarveOuts } = buildFixture();

		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			true,
			masterCarveOuts
		);

		expect(result).toContain(`&!${tiedmon.dex}`);
		expect(result).not.toContain('0-3attack');
	});

	it('a tie that exists ONLY at level 51 (not level 50) is still caught — the level-50/51 union applies here exactly as everywhere else', () => {
		// Base HP 5 — empirically verified (see the Tab 1 regression test of
		// the same shape) to floor-tie raw IV 14 and 15 at level 51
		// specifically, with no tie at all at level 50.
		const level51tied = mockPokemon({
			speciesId: 'badivlevel51tied',
			dex: 951,
			baseStats: { atk: 100, def: 132, hp: 5 },
		});
		const gamemasterPokemon = buildGamemaster([level51tied]);
		const masterCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			caps: [Number.MAX_VALUE],
			includeShadowPurify: false,
		});

		const result = computeBadIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			false,
			masterCarveOuts
		);

		expect(result).toContain(`&!${level51tied.dex},0-3attack,0-3defense,0-2hp,4hp`);
	});

	it('a Shadow form never needs its own masterCarveOuts entry — `includeShadowPurify: false` means the sweep never even considers it', () => {
		const monShadow = mockPokemon({
			speciesId: 'badivshadowtied_shadow',
			dex: 952,
			isShadow: true,
			baseStats: { atk: 100, def: 132, hp: 180 },
		});
		const gamemasterPokemon = buildGamemaster([monShadow]);

		const masterCarveOuts = findBadIvCarveOuts({
			gamemasterPokemon,
			caps: [Number.MAX_VALUE],
			includeShadowPurify: false,
		});

		expect(masterCarveOuts).toHaveLength(0);
	});

	it('backward compatible: omitting masterCarveOuts entirely (existing call sites, pre-this-change) behaves exactly as before', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const withExplicitEmpty = computeBadIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			1500,
			DEFAULT_PROTECTION,
			new Set(),
			false,
			[]
		);
		const withOmitted = computeBadIvString(gamemasterPokemon, carveOuts, GameLanguage.en, 1500, DEFAULT_PROTECTION, new Set());

		expect(withOmitted).toBe(withExplicitEmpty);
	});
});
