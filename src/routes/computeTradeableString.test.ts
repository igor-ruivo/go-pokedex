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
	it('off: no bucket restriction beyond hundo exclusion and the unconditional Shadow-purify guard', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { onlyLowIv: false });
		// The `onlyLowIv` toggle's own restriction is 3 separate `&`-joined
		// positive terms (an AND, one per stat) — distinct in shape from the
		// unconditional Shadow-purify guard's single comma-joined OR term
		// (`&0-2attack,0-2defense,0-2hp,!shadow`), which is always present
		// regardless of this toggle and isn't what this test is checking.
		expect(result).not.toContain('&0-2attack&0-2defense&0-2hp');
	});

	it('on: adds the AND-joined low-IV restriction across all three stats', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { onlyLowIv: true });
		expect(result).toContain('&0-2attack&0-2defense&0-2hp');
	});
});

describe('computeTradeableString — category pre-filter (Legendary/Mythical/Ultra Beast)', () => {
	it.each([
		['legendary', 'legendarymon'] as const,
		['mythical', 'mythicalmon'] as const,
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

describe('computeTradeableString — Shadow handling (in-loop exclusion, not a candidate-filter)', () => {
	it('a Shadow form sharing a dex with its Master-good non-Shadow sibling still gets its own disambiguating exclusion', () => {
		const { gamemasterPokemon, shadowmon, shadowmonShadow } = buildMainFixture();
		const rankLists = [{}, {}, { shadowmon: rank(1) }];

		const on = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, shadow: true } });
		const off = call(gamemasterPokemon, { rankLists, protect: { ...DEFAULT_PROTECTION, shadow: false } });

		expect(shadowmonShadow.dex).toBe(shadowmon.dex);
		// On: the dex is still suggested (via the non-Shadow form), but the
		// Shadow form itself gets a disambiguating exclusion clause.
		expect(on).toContain(String(shadowmon.dex));
		expect(on).toContain('&!100,!shadow');
		// Off: no special clause needed, Shadow evaluated like anything else.
		expect(off).not.toContain('&!100,!shadow');
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

describe('computeTradeableString — Shadow-purify hundo guard (unconditional, always on)', () => {
	it('the guard clause is present regardless of any toggle — same treatment as !4*', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon);

		// A Shadow catch with Attack/Defense/HP all already bucket 3-4 (raw
		// 11-15) might purify (+2/stat, capped 15) into an exact 15/15/15 —
		// suggesting it for trade would throw away that possibility for good.
		// Protected unconditionally, right next to the exact-hundo guard.
		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('localizes to pt-BR alongside the rest of the tail', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { gl: GameLanguage.ptbr });

		expect(result).toContain('&!4*&0-2ataque,0-2defesa,0-2ps,!sombroso');
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

		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow&!cp2000-');
		expect(result).toContain('&0-2attack&0-2defense&0-2hp');
	});
});

describe('computeTradeableString — final canonicalization pass (dead-weight exclusion clauses)', () => {
	it('whitelisting both the Shadow and non-Shadow forms of the same species collapses their two clauses into one bare, Shadow-agnostic clause', () => {
		// dex 800 has two sibling forms (water, grass) — water is Master-ranked
		// (drives dex 800 into the tradeable set), grass is whitelisted in BOTH
		// its Shadow and non-Shadow form. Both "water" and "grass" are unique
		// types at this dex, so each gets its own type as its positive id —
		// grass's own id is "800,grass", negated to "!800,!grass". Without the
		// canonicalization pass this would emit two separate clauses —
		// "!800,!grass,shadow" (protects only the non-Shadow catch) and
		// "!800,!grass,!shadow" (protects only the Shadow catch) — together
		// they protect exactly what one bare "!800,!grass" would, for fewer
		// characters.
		const water = mockPokemon({ speciesId: 'tradewater', dex: 800, types: [mockType('water')] });
		const grass = mockPokemon({ speciesId: 'tradegrass', dex: 800, types: [mockType('grass')] });
		const grassShadow = mockPokemon({
			speciesId: 'tradegrass_shadow',
			dex: 800,
			isShadow: true,
			types: [mockType('grass')],
		});
		const gamemasterPokemon = buildGamemaster([water, grass, grassShadow]);

		const result = call(gamemasterPokemon, {
			rankLists: [{}, {}, { [water.speciesId]: rank(1) }],
			whitelist: new Set([grass.speciesId, grassShadow.speciesId]),
		});

		expect(result).toContain('&!800,!grass');
		expect(result).not.toContain('!800,!grass,shadow');
		expect(result).not.toContain('!800,!grass,!shadow');
	});
});
