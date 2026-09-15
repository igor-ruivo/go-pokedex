import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../../contexts/language-context';
import { calculateCP, type RankEntry } from '../../utils/pokemon-helper';
import { buildGamemaster, mockPokemon, mockType } from '../mass-delete-fixtures';
import {
	buildFormIds,
	buildSearchChain,
	computeSearchString,
	formIdentifierFor,
	selectTopIVCombinations,
	shadowSuffixFor,
	withBestBuddySafetyFloor,
} from './SearchStringsTab';

// One minimal top-1 combination is enough — this file's own bucket/CP/level
// bookkeeping isn't what's under test here, only whether the unconditional
// Shadow-purify hundo guard gets appended alongside `!4*` in "except" mode.
const oneCombo: Array<RankEntry> = [
	{ IVs: { A: 0, D: 15, S: 15, star: 0 }, battle: { A: 1, D: 1, S: 1 }, L: 20, CP: 1200 },
];

describe('computeSearchString — Shadow-purify hundo guard (unconditional, "except" mode only)', () => {
	it('is appended right alongside !4* when trash (except) mode is on', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon', dex: 950 });
		const result = computeSearchString(pokemon, {
			trash: true,
			topIVCombinations: oneCombo,
			gl: GameLanguage.en,
			formId: '950',
		});

		// Same reasoning as Mass Delete's own copy of this rule: a Shadow catch
		// with Attack/Defense/HP all already bucket 3-4 (raw 11-15) might
		// purify (+2/stat, capped 15) into an exact 15/15/15.
		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('is NOT appended outside "except" mode — that mode never emits the unconditional !4* either', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon2', dex: 951 });
		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations: oneCombo,
			gl: GameLanguage.en,
			formId: '951',
		});

		expect(result).not.toContain('!shadow');
	});

	it('localizes to pt-BR alongside !4*', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon3', dex: 952 });
		const result = computeSearchString(pokemon, {
			trash: true,
			topIVCombinations: oneCombo,
			gl: GameLanguage.ptbr,
			formId: '952',
		});

		expect(result).toContain('&!4*&0-2ataque,0-2defesa,0-2ps,!sombroso');
	});
});

describe('computeSearchString — level bound is the TARGET’s own cap-crossing level, not the predecessor’s', () => {
	it('a weak predecessor whose own CP never reaches the cap is still bounded by the (much lower) level at which the TARGET’s CP crosses the cap — a wild catch beyond that level is permanently unusable for this league once evolved, no matter how low the predecessor’s own CP looks', () => {
		// Mirrors the real Vulpix-Alolan/Ninetales-Alolan shape: a weak
		// predecessor whose own CP, even at 15/15/15/L50, never gets close to
		// a Great League cap — but the level bound has nothing to do with the
		// predecessor's own CP. `c.L: 25` here stands in for "the TARGET's CP,
		// for this combo, crosses the league cap at level 25" (computed
		// upstream, against the target's own base stats, before this combo
		// ever reaches `computeSearchString`). A wild catch of this weak
		// predecessor found at level 30 would, once evolved, ALREADY exceed
		// the cap — permanently, since level can never go down — so levels
		// 26-35 must never contribute anything here, even though the
		// predecessor's own CP at those levels is nowhere near any cap.
		const weakPredecessor = mockPokemon({
			speciesId: 'weakmon',
			dex: 900,
			baseStats: { atk: 50, def: 50, hp: 50 },
		});
		const combos: Array<RankEntry> = [
			{ IVs: { A: 0, D: 15, S: 15, star: 0 }, battle: { A: 1, D: 1, S: 1 }, L: 25, CP: 1500 },
		];

		const result = computeSearchString(weakPredecessor, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});

		// Every CP/HP value present must come from levels 1-25 only.
		const cpAtLevel25 = calculateCP(50, 0, 50, 15, 50, 15, (25 - 1) * 2);
		const cpAtLevel26 = calculateCP(50, 0, 50, 15, 50, 15, (26 - 1) * 2);
		expect(result).toContain(String(cpAtLevel25));
		expect(result).not.toContain(String(cpAtLevel26));
	});

	it('a combo whose target-derived L is 0 (or below the wild-catch minimum) contributes nothing — the level loop never runs', () => {
		const predecessor = mockPokemon({ speciesId: 'strongmon', dex: 901, baseStats: { atk: 300, def: 300, hp: 300 } });
		const combos: Array<RankEntry> = [
			{ IVs: { A: 15, D: 15, S: 15, star: 4 }, battle: { A: 1, D: 1, S: 1 }, L: 0, CP: 10 },
		];

		const result = computeSearchString(predecessor, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '901',
		});

		// Every tier (0-3) is empty — the only combo given never contributed
		// any CP/HP at all — and cps[4] (star 4, checked separately) is empty
		// too, so no trailing `,4*` either.
		expect(result).toBe('901&!0*&!1*&!2*&!3*');
	});
});

/* ---- helpers to build RankEntry fixtures purely from a stat product -------- */
const combo = (key: number, prod: number, L = 50): RankEntry => ({
	IVs: { A: key, D: 0, S: 0, star: 0 },
	battle: { A: prod, D: 1, S: 1 },
	L,
	CP: 1000,
});

describe('selectTopIVCombinations — rank-tie-aware cutoff (regression: ties must not be split)', () => {
	it('ranks 1,1,3,4,5,6,6,6,9,10,10,10 asked for "top 10" returns all 12 tied-through-the-cutoff entries', () => {
		const level = [10, 10, 9, 8, 7, 6, 6, 6, 3, 2, 2, 2].map((prod, i) => combo(i, prod));
		const result = selectTopIVCombinations(level, 10);
		expect(result).toHaveLength(12);
	});

	it('a clean top-N with no boundary tie returns exactly N', () => {
		const level = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((prod, i) => combo(i, prod));
		const result = selectTopIVCombinations(level, 5);
		expect(result).toHaveLength(5);
	});

	it('asking for more than exist returns everything', () => {
		const level = [10, 9, 8].map((prod, i) => combo(i, prod));
		expect(selectTopIVCombinations(level, 100)).toHaveLength(3);
	});
});

describe('selectTopIVCombinations — single-level only (regression: never hedges across Best Buddy settings)', () => {
	it('only ranks within the ONE level list passed in — the caller is responsible for picking the right one (via useBestIvs, which reads the toggle)', () => {
		const level = [combo(1, 100), combo(2, 50)];
		const result = selectTopIVCombinations(level, 1);

		expect(result.map((c) => c.IVs.A)).toEqual([1]);
	});
});

describe('withBestBuddySafetyFloor — rank-1 safety net, both levels, regardless of the core cutoff', () => {
	it('adds the rank-1 spreads from BOTH levels on top of a core selection that already excludes them', () => {
		// `core` here stands in for a toggle-respecting selection that, for
		// whatever cutoff the player chose, happens not to include either
		// level's own #1 — the exact scenario the floor exists to cover.
		const core = [combo(9, 1)];
		const level50 = [combo(1, 100), combo(9, 1)];
		const level51 = [combo(2, 90), combo(9, 1)];

		const result = withBestBuddySafetyFloor(core, level50, level51);
		const keys = result.map((c) => c.IVs.A).sort();
		expect(keys).toEqual([1, 2, 9]);
	});

	it('a rank-1 tie at one level contributes every tied spread, not just one', () => {
		const level50 = [combo(1, 100), combo(2, 100), combo(3, 50)];
		const level51 = [combo(4, 40)];

		const result = withBestBuddySafetyFloor([], level50, level51);
		const keys = result.map((c) => c.IVs.A).sort();
		expect(keys).toEqual([1, 2, 4]);
	});

	it('when the core selection already includes both levels’ rank-1, nothing new is added (deduped)', () => {
		const level50 = [combo(1, 100)];
		const level51 = [combo(2, 90)];
		const core = [combo(1, 100), combo(2, 90), combo(3, 50)];

		const result = withBestBuddySafetyFloor(core, level50, level51);
		expect(result).toHaveLength(3);
	});

	it('the same rank-1 spread at both levels merges into one entry', () => {
		const level50 = [combo(1, 100, 50)];
		const level51 = [combo(1, 95, 51)];

		const result = withBestBuddySafetyFloor([], level50, level51);
		expect(result).toHaveLength(1);
		expect(result[0].L).toBe(51);
	});
});

describe('buildFormIds / formIdentifierFor — form disambiguation (regression: Ninetales-Alolan bug)', () => {
	const vulpix = mockPokemon({
		speciesId: 'vulpix',
		dex: 37,
		types: [mockType('fire')],
		family: { id: 'f-vulpix', evolutions: ['ninetales'] },
	});
	const vulpixAlolan = mockPokemon({
		speciesId: 'vulpix_alolan',
		dex: 37,
		types: [mockType('ice')],
		family: { id: 'f-vulpix-alolan', evolutions: ['ninetales_alolan'] },
	});
	const ninetales = mockPokemon({
		speciesId: 'ninetales',
		dex: 38,
		types: [mockType('fire')],
		family: { id: 'f-vulpix', parent: 'vulpix' },
	});
	const ninetalesAlolan = mockPokemon({
		speciesId: 'ninetales_alolan',
		dex: 38,
		types: [mockType('ice')],
		family: { id: 'f-vulpix-alolan', parent: 'vulpix_alolan' },
	});
	const gamemasterPokemon = buildGamemaster([vulpix, vulpixAlolan, ninetales, ninetalesAlolan]);
	const formIds = buildFormIds(gamemasterPokemon);

	it('the two dex-37 forms each get their own AND-joined (not comma/OR) type-scoped identifier', () => {
		expect(formIdentifierFor(vulpix, formIds)).toBe('37&fire');
		expect(formIdentifierFor(vulpixAlolan, formIds)).toBe('37&ice');
	});

	it('the two dex-38 forms are likewise disambiguated from each other', () => {
		expect(formIdentifierFor(ninetales, formIds)).toBe('38&fire');
		expect(formIdentifierFor(ninetalesAlolan, formIds)).toBe('38&ice');
	});

	it('a dex with only one candidate form needs no disambiguation at all — bare dex number', () => {
		const solomon = mockPokemon({ speciesId: 'solomon', dex: 999, types: [mockType('normal')] });
		const ids = buildFormIds(buildGamemaster([solomon]));
		expect(formIdentifierFor(solomon, ids)).toBe('999');
	});

	it('a Shadow reuses its non-Shadow counterpart’s identical identifier (same dex, same types)', () => {
		const vulpixAlolanShadow = mockPokemon({
			speciesId: 'vulpix_alolan_shadow',
			dex: 37,
			types: [mockType('ice')],
			isShadow: true,
		});
		expect(formIdentifierFor(vulpixAlolanShadow, formIds)).toBe('37&ice');
	});
});

describe('shadowSuffixFor', () => {
	const nonShadow = mockPokemon({ speciesId: 'dualmon', dex: 700, types: [mockType('ice')] });
	const shadow = mockPokemon({ speciesId: 'dualmon_shadow', dex: 700, types: [mockType('ice')], isShadow: true });
	const noShadowVariant = mockPokemon({ speciesId: 'solomon', dex: 701, types: [mockType('normal')] });
	const gamemasterPokemon = buildGamemaster([nonShadow, shadow, noShadowVariant]);

	it('a Shadow species always gets the positive &shadow suffix', () => {
		expect(shadowSuffixFor(shadow, gamemasterPokemon, GameLanguage.en)).toBe('&shadow');
	});

	it('a non-Shadow species WITH a Shadow counterpart gets the disambiguating &!shadow suffix', () => {
		expect(shadowSuffixFor(nonShadow, gamemasterPokemon, GameLanguage.en)).toBe('&!shadow');
	});

	it('a non-Shadow species with no Shadow counterpart at all needs no suffix', () => {
		expect(shadowSuffixFor(noShadowVariant, gamemasterPokemon, GameLanguage.en)).toBe('');
	});

	it('localizes the keyword to pt-BR', () => {
		expect(shadowSuffixFor(shadow, gamemasterPokemon, GameLanguage.ptbr)).toBe('&sombroso');
	});
});

describe('buildSearchChain — backward walk, plus each predecessor’s Shadow counterpart (regression)', () => {
	const vulpixAlolan = mockPokemon({
		speciesId: 'vulpix_alolan',
		dex: 37,
		types: [mockType('ice')],
		family: { id: 'f-vulpix-alolan', evolutions: ['ninetales_alolan'] },
	});
	const vulpixAlolanShadow = mockPokemon({
		speciesId: 'vulpix_alolan_shadow',
		dex: 37,
		types: [mockType('ice')],
		isShadow: true,
		family: { id: 'f-vulpix-alolan-shadow', evolutions: ['ninetales_alolan_shadow'] },
	});
	const ninetalesAlolan = mockPokemon({
		speciesId: 'ninetales_alolan',
		dex: 38,
		types: [mockType('ice')],
		family: { id: 'f-vulpix-alolan', parent: 'vulpix_alolan' },
	});
	const ninetalesAlolanShadow = mockPokemon({
		speciesId: 'ninetales_alolan_shadow',
		dex: 38,
		types: [mockType('ice')],
		isShadow: true,
		family: { id: 'f-vulpix-alolan-shadow', parent: 'vulpix_alolan_shadow' },
	});
	const gamemasterPokemon = buildGamemaster([
		vulpixAlolan,
		vulpixAlolanShadow,
		ninetalesAlolan,
		ninetalesAlolanShadow,
	]);

	it('a non-Shadow target pulls in both the plain predecessor chain AND each predecessor’s Shadow counterpart', () => {
		const chain = buildSearchChain(ninetalesAlolan, gamemasterPokemon);
		const ids = chain.map((c) => `${c.species.speciesId}:${c.viaPurify}`).sort();
		expect(ids).toEqual(
			[
				'vulpix_alolan:false',
				'ninetales_alolan:false',
				'vulpix_alolan_shadow:true',
				'ninetales_alolan_shadow:true',
			].sort()
		);
	});

	it('a Shadow target stays a pure Shadow chain — no purification widening applied to an already-Shadow lineage', () => {
		const chain = buildSearchChain(ninetalesAlolanShadow, gamemasterPokemon);
		const ids = chain.map((c) => `${c.species.speciesId}:${c.viaPurify}`).sort();
		expect(ids).toEqual(['vulpix_alolan_shadow:false', 'ninetales_alolan_shadow:false'].sort());
	});

	it('a species with no Shadow-catchable form anywhere in its line gets no extra entries', () => {
		const solo = mockPokemon({ speciesId: 'solomon', dex: 999, types: [mockType('normal')] });
		const chain = buildSearchChain(solo, buildGamemaster([solo]));
		expect(chain).toEqual([{ species: solo, viaPurify: false }]);
	});
});

describe('computeSearchString — Shadow purification math (backward direction)', () => {
	it('a target combo containing IV 0 or 1 on any stat is unreachable via purification — contributes nothing', () => {
		const pokemon = mockPokemon({ speciesId: 'unreachablemon_shadow', dex: 800, isShadow: true });
		const unreachable: Array<RankEntry> = [
			{ IVs: { A: 0, D: 15, S: 15, star: 2 }, battle: { A: 1, D: 1, S: 1 }, L: 50, CP: 1000 },
		];
		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations: unreachable,
			gl: GameLanguage.en,
			formId: '800',
			shadowSuffix: '&shadow',
			viaPurify: true,
		});

		// No star tier ever got a single raw candidate — every tier's clause
		// degenerates to its bare "never match this tier" exclusion, and star 4
		// (never populated either) never gets its own `,4*` addendum.
		expect(result).toBe('800&shadow&!0*&!1*&!2*&!3*');
	});

	it('an exact target hundo (15/15/15) expands into raw 13/14/15 sources spanning buckets 3-4 on every stat', () => {
		const pokemon = mockPokemon({ speciesId: 'hundomon_shadow', dex: 801, isShadow: true });
		const hundo: Array<RankEntry> = [
			{ IVs: { A: 15, D: 15, S: 15, star: 4 }, battle: { A: 1, D: 1, S: 1 }, L: 50, CP: 1500 },
		];
		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations: hundo,
			gl: GameLanguage.en,
			formId: '801',
			shadowSuffix: '&shadow',
			viaPurify: true,
		});

		// 26 of the 27 raw (13/14/15)^3 combos land at star 3 (IV sum < 45);
		// only the raw 15/15/15 itself reaches star 4. Star 3's own bucket
		// range spans both 3 (raw 13/14) and 4 (raw 15) on every stat.
		expect(result).toContain('801&shadow');
		expect(result).toContain('&!3*,3-4attack');
		expect(result).toContain('3-4defense');
		expect(result).toContain('3-4hp');
		// Star 4 (the single raw-hundo source) falls through to the
		// unconditional trailing `,4*` addendum, same as any other block.
		expect(result.endsWith(',4*')).toBe(true);
	});
});

describe('computeSearchString — form/Shadow identity prefix (regression: Ninetales-Alolan bug)', () => {
	it('the leading identity is AND-joined via & (dex AND type AND shadow-scope), never comma (OR)', () => {
		const pokemon = mockPokemon({ speciesId: 'vulpix_alolan', dex: 37, types: [mockType('ice')] });
		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations: [combo(5, 100)],
			gl: GameLanguage.en,
			formId: '37&ice',
			shadowSuffix: '&!shadow',
		});

		expect(result.startsWith('37&ice&!shadow')).toBe(true);
		// The old, buggy behavior was a bare dex number with no disambiguation
		// at all, which would also match the Kantonian (Fire) line and any
		// Shadow catch of either form.
		expect(result.startsWith('37&!')).toBe(false);
	});
});
