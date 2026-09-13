import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { findBadIvCarveOuts } from '../workers/compute.worker';
import {
	buildBadIvFixture,
	buildGamemaster,
	buildMainFixture,
	buildMultiStageBadIvFixture,
	mockPokemon,
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

describe('computeBadIvString — Shadow is structurally excluded, never independently evaluated', () => {
	it('a Shadow form never appears in findBadIvCarveOuts output, regardless of its stats', () => {
		const shadowbase = mockPokemon({ speciesId: 'shadowbadiv', dex: 304, baseStats: { atk: 300, def: 100, hp: 100 } });
		const shadowform = mockPokemon({
			speciesId: 'shadowbadiv_shadow',
			dex: 304,
			isShadow: true,
			baseStats: { atk: 300, def: 100, hp: 100 },
		});
		const gamemasterPokemon = buildGamemaster([shadowbase, shadowform]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		expect(carveOuts.some((c) => c.speciesId === 'shadowbadiv_shadow')).toBe(false);
	});

	it('the `!shadow` tail keyword is the only protection mechanism here, toggled on/off directly', () => {
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
