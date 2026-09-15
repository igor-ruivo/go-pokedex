import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
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

const call = (
	gamemasterPokemon: Parameters<typeof computeTradeableString>[0],
	overrides: Partial<{
		rankLists: Array<Record<string, { rank: number } | undefined>>;
		raidDPS: Record<string, Record<string, ReturnType<typeof mockDPSEntry>>>;
		raidMetric: 'dps' | 'tdo' | 'edps';
		gl: GameLanguage;
		trashMaster: number;
		trashRaid: number;
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
		overrides.trashMaster ?? 10,
		overrides.trashRaid ?? 10,
		overrides.protect ?? DEFAULT_PROTECTION,
		overrides.whitelist ?? new Set<string>(),
		overrides.onlyLowIv ?? false,
		overrides.cp ?? 2500
	);

describe('computeTradeableString — Master League relevance', () => {
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
});

describe('computeTradeableString — raid relevance', () => {
	it('a raid-good species is included regardless of Master rank', () => {
		const raidmon = mockPokemon({ speciesId: 'raidmon', dex: 603, types: [mockType('fire')] });
		const gamemasterPokemon = buildGamemaster([raidmon]);
		const raidDPS = { fire: { raidmon: mockDPSEntry({ speciesId: 'raidmon', dpsRank: 1, tdoRank: 1, edpsRank: 1 }) } };

		const result = call(gamemasterPokemon, { raidDPS, raidMetric: 'dps', trashRaid: 5 });

		expect(result).toContain('603');
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
	it.each([
		['legendary', 'legendarymon'] as const,
		['ultraBeast', 'beastmon'] as const,
	])('%s on: never a candidate even when Master-relevant; off: evaluated normally', (flagKey, speciesId) => {
		const { gamemasterPokemon } = buildMainFixture();
		const rankLists = [{}, {}, { [speciesId]: rank(1) }];

		const on = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, [flagKey]: true } });
		const off = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, [flagKey]: false } });

		const dex = String(gamemasterPokemon[speciesId].dex);
		expect(on).not.toContain(dex);
		expect(off).toContain(dex);
	});
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
