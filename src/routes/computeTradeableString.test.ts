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
		overrides.onlyLowIv ?? false
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
	it('off: no bucket restriction beyond hundo exclusion', () => {
		const { gamemasterPokemon } = buildMainFixture();
		const result = call(gamemasterPokemon, { onlyLowIv: false });
		expect(result).not.toContain('0-2attack');
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
