import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { findBadIvCarveOuts } from '../workers/compute.worker';
import { buildBadIvFixture, buildGamemaster, buildMainFixture, mockPokemon } from './mass-delete-fixtures';
import { computePerfectIvString, DEFAULT_PROTECTION } from './MassDelete';

describe('computePerfectIvString — base anchor', () => {
	it('starts with the bucket-domain good shape (Attack 0-1, Defense/HP 3-4) and folds hundo in via a trailing 4*', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = computePerfectIvString(gamemasterPokemon, [], GameLanguage.en, DEFAULT_PROTECTION, new Set());

		expect(result.startsWith('0-1attack,3-4defense,3-4hp,4*')).toBe(true);
	});

	it('never mentions a CP floor — unlike the delete-mode string, this mode has no deletion-safety concept', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = computePerfectIvString(gamemasterPokemon, [], GameLanguage.en, DEFAULT_PROTECTION, new Set());

		expect(result).not.toContain('cp');
	});
});

describe('computePerfectIvString — non-deviant species', () => {
	it('a species whose real optimum matches the shared good shape gets no exclusion clause at all', () => {
		// shadowmon (120/120/120 base stats) has no carve-out at either cap
		// (verified directly against `findBadIvCarveOuts`) — its own true
		// optimum already matches the shared shape, so the anchor alone
		// correctly covers it with no per-species refinement needed.
		const { gamemasterPokemon, shadowmon } = buildMainFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === shadowmon.speciesId)).toBe(false);

		const result = computePerfectIvString(gamemasterPokemon, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		expect(result).not.toContain(String(shadowmon.dex));
	});
});

describe('computePerfectIvString — a species whose real optimum deviates from the shared good shape', () => {
	it('is excluded from the shared-shape claim entirely, rather than risk a false "perfect"', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === deviantmon.speciesId)).toBe(true);

		const result = computePerfectIvString(gamemasterPokemon, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		// Complement of the good shape in bucket domain: attack {2,3,4}, defense/hp {0,1,2}.
		expect(result).toContain(`&!${deviantmon.dex},2-4attack,0-2defense,0-2hp`);
	});

	it('still lets that species be found via a genuine hundo, since `4*` is a separate, unconditional alternative', () => {
		const { gamemasterPokemon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computePerfectIvString(gamemasterPokemon, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		// The exclusion clause only removes the shared-shape claim for this
		// species — it never touches the separate `,4*` alternative, since the
		// clause negates the shared shape's own bucket ranges, not the whole match.
		expect(result).toContain('4*');
	});
});

describe('computePerfectIvString — category toggles (Legendary/Mythical/Ultra Beast/Mega Evolvable/Shadow) never apply', () => {
	it('a Legendary, Mythical, Ultra Beast, or Shadow species is always eligible — this mode has no way to exclude them at all', () => {
		const { gamemasterPokemon, legendarymon, mythicalmon, beastmon, shadowmon } = buildMainFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		const result = computePerfectIvString(gamemasterPokemon, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		// None of these tail keywords exist in this function's output at all —
		// there's no toggle wired up to emit them, unlike Bad-IV mode.
		expect(result).not.toContain('&!legendary');
		expect(result).not.toContain('&!mythical');
		expect(result).not.toContain('&!ultra');
		expect(result).not.toContain('&!megaevolve');
		expect(result).not.toContain('&!shadow');
		// None of these species has a carve-out (default base stats match the
		// good shape), so none of them gets an exclusion clause of its own either.
		for (const p of [legendarymon, mythicalmon, beastmon, shadowmon]) {
			expect(result).not.toContain(String(p.dex));
		}
	});

	it('a deviant Legendary still gets excluded from the shared-shape claim via the same bucket-complement clause as any other deviant species', () => {
		const { gamemasterPokemon, deviantlegendary } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === deviantlegendary.speciesId)).toBe(true);

		const result = computePerfectIvString(gamemasterPokemon, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		expect(result).toContain(`&!${deviantlegendary.dex},2-4attack,0-2defense,0-2hp`);
	});
});

describe('computePerfectIvString — Favorite/Tagged still apply, meaning "exclude from these results"', () => {
	it.each(['favorite', 'tagged'] as const)('%s off omits its tail keyword', (key) => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = computePerfectIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			{ ...DEFAULT_PROTECTION, [key]: false },
			new Set()
		);
		const keyword: Record<string, string> = { favorite: '&!favorite', tagged: '&!#' };
		expect(result).not.toContain(keyword[key]);
	});
});

describe('computePerfectIvString — manual whitelist', () => {
	it('excludes a whitelisted species from the results entirely, in place of (not in addition to) any deviant exclusion', () => {
		const { gamemasterPokemon, deviantmon } = buildBadIvFixture();
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] });

		const result = computePerfectIvString(
			gamemasterPokemon,
			carveOuts,
			GameLanguage.en,
			DEFAULT_PROTECTION,
			new Set([deviantmon.speciesId])
		);

		expect(result).not.toContain(`&!${deviantmon.dex},2-4attack,0-2defense,0-2hp`);
		expect(result).toContain(`&!${deviantmon.dex}`);
	});

	it('disambiguates a whitelisted species sharing a dex with another form', () => {
		const { gamemasterPokemon, formGrass } = buildMainFixture();
		const result = computePerfectIvString(
			gamemasterPokemon,
			[],
			GameLanguage.en,
			DEFAULT_PROTECTION,
			new Set([formGrass.speciesId])
		);

		expect(result).toContain('&!555,!grass');
		expect(result).not.toContain('!555,!fire');
	});
});

describe('computePerfectIvString — pt-BR translation', () => {
	it('localizes the base clause and the Favorite/Tagged tail keywords', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = computePerfectIvString(gamemasterPokemon, [], GameLanguage.ptbr, DEFAULT_PROTECTION, new Set());

		expect(result.startsWith('0-1ataque,3-4defesa,3-4ps,4*')).toBe(true);
		expect(result).toContain('&!favorito');
	});
});

describe('computePerfectIvString — an unrelated species is never affected by another species’ exclusion clause', () => {
	it('a plain, non-deviant species still matches purely via the shared anchor when a deviant sibling exists elsewhere', () => {
		const { gamemasterPokemon, shadowmon } = buildMainFixture();
		const deviant = mockPokemon({ speciesId: 'deviantone', dex: 900, baseStats: { atk: 300, def: 100, hp: 100 } });
		const merged = buildGamemaster([...Object.values(gamemasterPokemon), deviant]);
		const carveOuts = findBadIvCarveOuts({ gamemasterPokemon: merged, caps: [1500, 2500] });
		expect(carveOuts.some((c) => c.speciesId === deviant.speciesId)).toBe(true);

		const result = computePerfectIvString(merged, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());

		// shadowmon's own identity never appears — it was never excluded, so it
		// keeps matching through the bare shared anchor regardless of what
		// other species' exclusion clauses were appended alongside it.
		expect(result).not.toContain(String(shadowmon.dex));
		expect(result).toContain(String(deviant.dex));
	});
});
