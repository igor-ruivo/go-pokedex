import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../../contexts/language-context';
import { calculateCP, type RankEntry } from '../../utils/pokemon-helper';
import { buildGamemaster, mockPokemon, mockType } from '../mass-delete-fixtures';
import {
	buildFormIds,
	buildSearchChain,
	computeMergedSearchString,
	computeSearchString,
	formIdentifierFor,
	selectTopIVCombinations,
	shadowSuffixFor,
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
	const gamemasterPokemon = buildGamemaster([vulpixAlolan, vulpixAlolanShadow, ninetalesAlolan, ninetalesAlolanShadow]);

	it('a non-Shadow target pulls in one entry per stage, each PAIRED with its Shadow counterpart (not four separate flat entries)', () => {
		const chain = buildSearchChain(ninetalesAlolan, gamemasterPokemon);
		const ids = chain.map((c) => `${c.nonShadow?.speciesId}+${c.shadow?.speciesId}`).sort();
		expect(ids).toEqual(['vulpix_alolan+vulpix_alolan_shadow', 'ninetales_alolan+ninetales_alolan_shadow'].sort());
	});

	it('a Shadow target stays a pure Shadow chain — no purification widening, no pairing, `nonShadow` undefined throughout', () => {
		const chain = buildSearchChain(ninetalesAlolanShadow, gamemasterPokemon);
		expect(chain.every((c) => c.nonShadow === undefined)).toBe(true);
		const ids = chain.map((c) => c.shadow?.speciesId).sort();
		expect(ids).toEqual(['vulpix_alolan_shadow', 'ninetales_alolan_shadow'].sort());
	});

	it('a species with no Shadow-catchable form anywhere in its line gets a solo entry (no `shadow` at all)', () => {
		const solo = mockPokemon({ speciesId: 'solomon', dex: 999, types: [mockType('normal')] });
		const chain = buildSearchChain(solo, buildGamemaster([solo]));
		expect(chain).toEqual([{ nonShadow: solo }]);
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

	it('regression: a mid-range, non-15 target combo (3/6/11) purifies from a raw combo (1/4/9) landing in GENUINELY DIFFERENT buckets on two of three stats — not just the 15-ceiling fan-out case', () => {
		// Attack: target bucket 1 (3) -> raw bucket 1 (1) — same, no ceiling
		// involved either way. Defense: target bucket 2 (6) -> raw bucket 1
		// (4) — genuinely different. HP: target bucket 3 (11) -> raw bucket 2
		// (9) — also genuinely different. None of these three stats are
		// anywhere near 15, so this is a distinct code path from the hundo
		// fan-out test above (which only exercises purifiedSources' [13,14,15]
		// branch) — this one exercises the plain `iv - 2` branch on all three
		// stats simultaneously, each shifting bucket independently.
		const pokemon = mockPokemon({ speciesId: 'midmon_shadow', dex: 802, isShadow: true });
		const midCombo: Array<RankEntry> = [
			{ IVs: { A: 3, D: 6, S: 11, star: 1 }, battle: { A: 1, D: 1, S: 1 }, L: 30, CP: 1500 },
		];
		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations: midCombo,
			gl: GameLanguage.en,
			formId: '802',
			shadowSuffix: '&shadow',
			viaPurify: true,
		});

		// Raw sum 1+4+9=14 -> star 0, NOT the target's own star 1 — the tier
		// gating must follow the raw catch's own IV-sum rating.
		expect(result).toContain('&!0*,1attack&!0*,1defense&!0*,2hp');
		// Never the target's own (purified-space) buckets.
		expect(result).not.toContain('2defense');
		expect(result).not.toContain('3hp');
	});

	it('regression: a combo straight from `selectTopIVCombinations` also gets purify-expanded when it lands in a viaPurify block', () => {
		const pokemon = mockPokemon({ speciesId: 'floormon_shadow', dex: 803, isShadow: true });
		const level: Array<RankEntry> = [
			{ IVs: { A: 15, D: 15, S: 15, star: 4 }, battle: { A: 1, D: 1, S: 1 }, L: 50, CP: 1500 },
		];
		const topIVCombinations = selectTopIVCombinations(level, 1);

		const result = computeSearchString(pokemon, {
			trash: false,
			topIVCombinations,
			gl: GameLanguage.en,
			formId: '803',
			shadowSuffix: '&shadow',
			viaPurify: true,
		});

		expect(result).toContain('&!3*,3-4attack');
		expect(result).toContain('3-4defense');
		expect(result).toContain('3-4hp');
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

describe('computeMergedSearchString — combining the non-Shadow and Shadow-purify blocks into one string', () => {
	// A single target combo (5/15/15, star 2) deliberately engineered to
	// exercise all three cases at once:
	// - tier 0: empty on BOTH sides (Case A — shared bare clause).
	// - tier 1: EMPTY on the non-Shadow side, but populated on the Shadow side
	//   (one of the purify pre-images, raw 3/13/13, sums to 29 — star 1, not
	//   star 2) — the asymmetric-empty case.
	// - tier 2: populated on BOTH sides, with DIFFERENT criteria (Case B) —
	//   non-Shadow's own single combo (bucket 1-4-4) vs the Shadow side's
	//   other 8 purify pre-images (bucket 1-3–4-3–4).
	// - tier 3: empty on BOTH sides (Case A again).
	const nonShadow = mockPokemon({ speciesId: 'mergemon', dex: 900, baseStats: { atk: 200, def: 150, hp: 150 } });
	const shadow = mockPokemon({
		speciesId: 'mergemon_shadow',
		dex: 900,
		isShadow: true,
		baseStats: { atk: 200, def: 150, hp: 150 },
	});
	const combos: Array<RankEntry> = [
		{ IVs: { A: 5, D: 15, S: 15, star: 2 }, battle: { A: 1, D: 1, S: 1 }, L: 50, CP: 1500 },
	];

	it('FIND mode: Case A tiers share one bare clause; the asymmetric tier keeps only the populated side (still scoped); Case B tier emits both sides, each with its own real criteria', () => {
		const result = computeMergedSearchString(nonShadow, shadow, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});

		// No leading &shadow/&!shadow at all — the whole point of merging.
		expect(result.startsWith('900&!0*')).toBe(true);
		// Tier 0, Case A: shared, unscoped bare exclusion.
		expect(result).toContain('&!0*&!1*');
		// Tier 1: non-Shadow side is empty — bare fallback, scoped to `shadow`
		// (so it only ever auto-passes for Shadow mons, never silently matches
		// a non-Shadow one). Shadow side has real criteria, scoped `!shadow`.
		expect(result).toContain('&!1*,shadow&!1*,!shadow,1attack&!1*,!shadow,3defense&!1*,!shadow,3hp');
		// Tier 2, Case B: non-Shadow's own criteria under the `shadow` escape...
		expect(result).toContain('&!2*,shadow,1attack&!2*,shadow,4defense&!2*,shadow,4hp');
		// ...and the Shadow side's own (genuinely different) criteria under `!shadow`.
		expect(result).toContain('&!2*,!shadow,1attack&!2*,!shadow,3-4defense&!2*,!shadow,3-4hp');
		// Tier 3, Case A: empty on both sides, shared bare clause, nothing after it.
		expect(result.endsWith('&!3*')).toBe(true);
	});

	it('documents the known granularity tradeoff: a sub-clause identical on both sides (tier 2’s Attack bucket, "1attack" here) still gets duplicated once per scope, because the merge compares whole tiers (all ~5 of a tier’s clauses together), not each clause independently', () => {
		const result = computeMergedSearchString(nonShadow, shadow, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});

		// Isolate tier 2's own region — "1attack" also shows up once, quite
		// incidentally, in tier 1 (its lone Shadow-side clause happens to
		// share the same Attack bucket) — that's not part of what this test
		// is pinning down, so scope the count to avoid a false signal from it.
		const tier2Region = result.slice(result.indexOf('&!2*'), result.indexOf('&!3*'));
		// Not a correctness bug — De Morgan on either scoped copy still
		// resolves to the same population — just the acknowledged byte-length
		// cost of tier-level (not clause-level) comparison. If this ever
		// becomes clause-level, this count drops to 1 and this test should be
		// updated deliberately, not silently left passing on the wrong reason.
		const occurrences = tier2Region.split('1attack').length - 1;
		expect(occurrences).toBe(2);
	});

	it('EXCEPT mode: the empty non-Shadow side of the asymmetric tier emits NOTHING (unlike find mode’s bare fallback) — only the populated, scoped side appears', () => {
		const result = computeMergedSearchString(nonShadow, shadow, {
			trash: true,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});

		// Tier 1: only the Shadow side's protect clause exists — the
		// non-Shadow side needed no clause at all (nothing to protect there).
		expect(result).not.toContain('!1*,shadow,');
		expect(result).toContain('&!1*,!shadow,');
		// Tier 2, Case B: BOTH sides get their own protect clause.
		expect(result).toContain('&!2*,shadow,');
		expect(result).toContain('&!2*,!shadow,');
		// Tiers 0 and 3 (empty on both sides) need no clause at all in "except"
		// mode — there's nothing to protect there either way.
		expect(result).not.toContain('!0*');
		expect(result).not.toContain('!3*');
		// The unconditional tail is still present, shared, exactly once.
		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('regression: every scoped clause the merge emits is byte-identical (content-wise) to what the equivalent solo call already produces — the merge only ever adds the scope term, never changes the criteria', () => {
		const soloNonShadow = computeSearchString(nonShadow, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});
		const soloShadow = computeSearchString(shadow, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
			viaPurify: true,
		});
		const merged = computeMergedSearchString(nonShadow, shadow, {
			trash: false,
			topIVCombinations: combos,
			gl: GameLanguage.en,
			formId: '900',
		});

		// Solo non-Shadow's own tier-2 criteria, with the `shadow` escape
		// spliced in right after each `!2*` — must appear verbatim in the
		// merged string.
		const nonShadowTier2 = '&!2*,1attack&!2*,4defense&!2*,4hp';
		expect(soloNonShadow).toContain(nonShadowTier2);
		expect(merged).toContain(nonShadowTier2.replaceAll('&!2*,', '&!2*,shadow,'));

		// Solo Shadow's own tier-2 criteria, same transform with `!shadow`.
		const shadowTier2 = '&!2*,1attack&!2*,3-4defense&!2*,3-4hp';
		expect(soloShadow).toContain(shadowTier2);
		expect(merged).toContain(shadowTier2.replaceAll('&!2*,', '&!2*,!shadow,'));
	});
});
