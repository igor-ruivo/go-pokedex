import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { findBadIvCarveOuts } from '../workers/compute.worker';
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

describe('findBadIvCarveOuts — collects every distinct pattern across a reachable family, not just the first', () => {
	it('regression: a 2-stage line with two different deviating patterns produces a carve-out for BOTH', () => {
		const { gamemasterPokemon, stageA } = buildMultiStageBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500] });
		const ownAt1500 = carveOuts.filter((c) => c.speciesId === stageA.speciesId && c.cap === 1500);

		// A buggy "stop at the first unprotected stage" implementation would
		// only find one of these two distinct patterns — this is exactly the
		// Lickitung/Kabuto-shaped bug found and fixed manually earlier this
		// session, now locked in as an automated regression.
		expect(ownAt1500).toHaveLength(2);
		expect(ownAt1500).toContainEqual(
			expect.objectContaining({ pattern: { A: 12, D: 15, S: 13 } }) // stageA's own optimum
		);
		expect(ownAt1500).toContainEqual(
			expect.objectContaining({ pattern: { A: 8, D: 15, S: 15 } }) // stageB's optimum, discovered while walking forward from stageA
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

	it('dead-weight avoidance: a Shadow purified-best pattern identical to its non-Shadow sibling’s own raw pattern gets no redundant entry', () => {
		const { gamemasterPokemon, overlapmon, overlapmonShadow } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		// overlapmon's own raw top-1 at 1500 deviates (bucket 3-3-3) and gets
		// its own carve-out — a Shadow's purified-best lands in that EXACT
		// same bucket, already covered by the shadow-agnostic clause the
		// non-Shadow analysis emits, so no separate entry should exist.
		expect(carveOuts.some((c) => c.speciesId === overlapmon.speciesId && c.cap === 1500)).toBe(true);
		expect(carveOuts.some((c) => c.speciesId === overlapmonShadow.speciesId)).toBe(false);
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

	it('does NOT emit a redundant shadow-scoped clause when the non-Shadow analysis already covers the identical raw bucket', () => {
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

		expect(result).not.toContain(`!${overlapmonShadow.dex},!shadow`);
		// The plain (shadow-agnostic) clause is still present, and — since
		// identity there doesn't distinguish Shadow from non-Shadow — already
		// protects a live Shadow catch of this species matching that bucket.
		expect(result).toContain(`!${overlapmon.dex},`);
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
