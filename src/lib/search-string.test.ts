import { beforeAll, describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { gameTranslationsTestFixture } from '../utils/game-translations-test-fixture';
import { __setGameTranslationsForTests } from '../utils/game-translations-store';
import { canonicalizeDexExclusions, type DexExclusion, renderDexExclusion } from './search-string';

beforeAll(() => {
	__setGameTranslationsForTests(gameTranslationsTestFixture);
});

const bare = (dex: number, form = '', extra = ''): DexExclusion => ({ dex, form, shadowScope: '', extra });
const shadowOnly = (dex: number, form = '', extra = ''): DexExclusion => ({
	dex,
	form,
	shadowScope: 'shadow-only',
	extra,
});
const nonShadowOnly = (dex: number, form = '', extra = ''): DexExclusion => ({
	dex,
	form,
	shadowScope: 'non-shadow-only',
	extra,
});

describe('renderDexExclusion', () => {
	it('bare, single-form dex', () => {
		expect(renderDexExclusion(bare(300), GameLanguage.en)).toBe('!300');
	});

	it('with a form disambiguator', () => {
		expect(renderDexExclusion(bare(26, 'psychic'), GameLanguage.en)).toBe('!26,psychic');
	});

	it('with a shadow-only scope', () => {
		expect(renderDexExclusion(shadowOnly(26, 'psychic'), GameLanguage.en)).toBe('!26,psychic,!shadow');
	});

	it('with a non-shadow-only scope', () => {
		expect(renderDexExclusion(nonShadowOnly(26, 'psychic'), GameLanguage.en)).toBe('!26,psychic,shadow');
	});

	it('with extra IV-bucket qualifiers', () => {
		expect(renderDexExclusion(bare(300, '', ',0-3attack,0-3defense,0-2hp,4hp'), GameLanguage.en)).toBe(
			'!300,0-3attack,0-3defense,0-2hp,4hp'
		);
	});

	it('localizes the shadow keyword for a non-English game language', () => {
		expect(renderDexExclusion(shadowOnly(26, 'psychic'), GameLanguage.ptbr)).toBe('!26,psychic,!sombroso');
		expect(renderDexExclusion(nonShadowOnly(26, 'psychic'), GameLanguage.ptbr)).toBe('!26,psychic,sombroso');
	});
});

describe('canonicalizeDexExclusions — Case A: shadow-scope collapse (single form, no disambiguation needed)', () => {
	it('a bare term absorbs a redundant shadow-only term for the same (form, extra) — dead weight, dropped', () => {
		const result = canonicalizeDexExclusions([bare(300), shadowOnly(300)], { 300: new Set(['']) });
		expect(result).toEqual([bare(300)]);
	});

	it('a bare term absorbs a redundant non-shadow-only term for the same (form, extra)', () => {
		const result = canonicalizeDexExclusions([bare(300), nonShadowOnly(300)], { 300: new Set(['']) });
		expect(result).toEqual([bare(300)]);
	});

	it('shadow-only + non-shadow-only (no bare present) union back into one bare term', () => {
		const result = canonicalizeDexExclusions([shadowOnly(300), nonShadowOnly(300)], { 300: new Set(['']) });
		expect(result).toEqual([bare(300)]);
	});

	it('order of the two input terms does not matter', () => {
		const a = canonicalizeDexExclusions([nonShadowOnly(300), shadowOnly(300)], { 300: new Set(['']) });
		const b = canonicalizeDexExclusions([shadowOnly(300), nonShadowOnly(300)], { 300: new Set(['']) });
		expect(a).toEqual(b);
		expect(a).toEqual([bare(300)]);
	});

	it('a lone shadow-only term with no bare or non-shadow-only counterpart is left untouched', () => {
		const result = canonicalizeDexExclusions([shadowOnly(300)], { 300: new Set(['']) });
		expect(result).toEqual([shadowOnly(300)]);
	});

	it('different `extra` values never merge, even for the identical form and opposite shadow scopes', () => {
		const a = shadowOnly(300, '', ',1-4attack');
		const b = nonShadowOnly(300, '', ',0-3attack');
		const result = canonicalizeDexExclusions([a, b], { 300: new Set(['']) });
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(a);
		expect(result).toContainEqual(b);
	});

	it('a bare term does NOT absorb a shadow-only term with a different `extra` — different, non-overlapping populations', () => {
		const bareWithExtra = bare(300, '', ',0-3attack');
		const shadowWithDifferentExtra = shadowOnly(300, '', ',1-4attack');
		const result = canonicalizeDexExclusions([bareWithExtra, shadowWithDifferentExtra], { 300: new Set(['']) });
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(bareWithExtra);
		expect(result).toContainEqual(shadowWithDifferentExtra);
	});

	it('a bare term DOES absorb a shadow-only term sharing the identical NON-EMPTY `extra` — and the merged result keeps that bucket pattern', () => {
		const sharedExtra = ',0-3attack,0-3defense,0-2hp,4hp';
		const result = canonicalizeDexExclusions([bare(300, '', sharedExtra), shadowOnly(300, '', sharedExtra)], {
			300: new Set(['']),
		});
		// Not stripped to "" — the bucket pattern both sides agreed on
		// survives the merge intact.
		expect(result).toEqual([bare(300, '', sharedExtra)]);
	});

	it('shadow-only + non-shadow-only sharing the identical NON-EMPTY `extra` union into one bare term, bucket pattern preserved', () => {
		const sharedExtra = ',1-4attack';
		const result = canonicalizeDexExclusions([shadowOnly(300, '', sharedExtra), nonShadowOnly(300, '', sharedExtra)], {
			300: new Set(['']),
		});
		expect(result).toEqual([bare(300, '', sharedExtra)]);
	});
});

describe('canonicalizeDexExclusions — Case B: cross-form merge into one bare dex-only term', () => {
	it('every sibling form at a dex unconditionally excluded -> collapses to a single bare "!<dex>"', () => {
		const result = canonicalizeDexExclusions([bare(26, 'psychic'), bare(26, '!psychic')], {
			26: new Set(['psychic', '!psychic']),
		});
		expect(result).toEqual([bare(26)]);
	});

	it('three sibling forms, all unconditionally excluded -> still one bare term', () => {
		const result = canonicalizeDexExclusions([bare(37, 'fire'), bare(37, 'ice'), bare(37, 'electric')], {
			37: new Set(['fire', 'ice', 'electric']),
		});
		expect(result).toEqual([bare(37)]);
	});

	it('composes with Case A: shadow-scope collapse runs first, THEN the cross-form merge can fire', () => {
		// !37,!fire and !37,!fire,!shadow collapse to bare !37,!fire (Case A);
		// !37,!ice stays as-is (already bare). With both forms then bare,
		// Case B merges them into a single !37.
		const result = canonicalizeDexExclusions([bare(37, '!fire'), shadowOnly(37, '!fire'), bare(37, '!ice')], {
			37: new Set(['!fire', '!ice']),
		});
		expect(result).toEqual([bare(37)]);
	});

	it('a missing sibling form blocks the merge — that form was never even mentioned, so it must stay uncovered', () => {
		const result = canonicalizeDexExclusions([bare(26, 'psychic')], { 26: new Set(['psychic', '!psychic']) });
		// !psychic was never excluded at all — merging to a bare "!26" would
		// wrongly protect it too. Left exactly as given.
		expect(result).toEqual([bare(26, 'psychic')]);
	});

	it('a sibling form only conditionally excluded (real `extra`) blocks the merge — it is not fully protected', () => {
		const partial = bare(26, '!psychic', ',0-3attack,0-3defense,0-2hp,4hp');
		const result = canonicalizeDexExclusions([bare(26, 'psychic'), partial], {
			26: new Set(['psychic', '!psychic']),
		});
		// Collapsing here would blanket-protect every IV spread of the
		// "!psychic" form, when only one specific bucket pattern should be.
		expect(result).toEqual([bare(26, 'psychic'), partial]);
	});

	it('a sibling form only Shadow-scoped (not unconditional) blocks the merge — its non-Shadow catches stay targetable', () => {
		const result = canonicalizeDexExclusions([shadowOnly(27, '!ice'), shadowOnly(27, '!ground')], {
			27: new Set(['!ice', '!ground']),
		});
		// Neither form is *unconditionally* excluded (each only for Shadow
		// catches) — collapsing to a bare "!27" would wrongly also protect
		// every non-Shadow catch of both forms.
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(shadowOnly(27, '!ice'));
		expect(result).toContainEqual(shadowOnly(27, '!ground'));
	});

	it('a single-form dex (form "") with only itself in `formsPerDex` is already maximally simplified — no-op', () => {
		const result = canonicalizeDexExclusions([bare(300)], { 300: new Set(['']) });
		expect(result).toEqual([bare(300)]);
	});
});

describe('canonicalizeDexExclusions — Case B generalized: cross-form merge keeps a shared NON-EMPTY bucket pattern', () => {
	it('every sibling form needs protection at the IDENTICAL bucket pattern -> collapses to one dex-only term that keeps it', () => {
		const sharedExtra = ',0-2attack,4attack,0-3defense,0-3hp';
		const result = canonicalizeDexExclusions([bare(26, 'psychic', sharedExtra), bare(26, '!psychic', sharedExtra)], {
			26: new Set(['psychic', '!psychic']),
		});
		expect(result).toEqual([bare(26, '', sharedExtra)]);
	});

	it('the same 2-form dex, but the two forms need DIFFERENT bucket patterns -> no merge, both kept exactly as given', () => {
		const patternA = bare(26, 'psychic', ',0-2attack,4attack,0-3defense,0-3hp');
		const patternB = bare(26, '!psychic', ',1-4attack,0-3defense,0-3hp');
		const result = canonicalizeDexExclusions([patternA, patternB], { 26: new Set(['psychic', '!psychic']) });
		// Neither group alone covers both forms, so nothing collapses —
		// forcing this into one dex-only clause (with either pattern, or none)
		// would silently change which catches get protected.
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(patternA);
		expect(result).toContainEqual(patternB);
	});

	it('one of two forms is missing at the shared pattern entirely -> blocks the merge, even though the OTHER form is fully covered', () => {
		const sharedExtra = ',0-2attack,4attack,0-3defense,0-3hp';
		// Only "psychic" has a clause at all; "!psychic" is completely absent.
		const result = canonicalizeDexExclusions([bare(26, 'psychic', sharedExtra)], {
			26: new Set(['psychic', '!psychic']),
		});
		expect(result).toEqual([bare(26, 'psychic', sharedExtra)]);
	});

	it('full two-dimension collapse: Shadow-scope collapses per form first (Case A), THEN the cross-form merge folds every form together, keeping the shared bucket', () => {
		// dex 900 has two forms, "fire" and "ice". EVERY combination in the
		// Shadow x form cartesian product needs protection at the identical
		// bucket pattern: fire (bare), fire-Shadow-only, ice (bare),
		// ice-non-Shadow-only + ice-Shadow-only (so both Shadow statuses are
		// separately covered for ice too). This should collapse all the way
		// down to one single "!900<pattern>" clause.
		const pattern = ',1-4attack';
		const result = canonicalizeDexExclusions(
			[
				bare(900, 'fire', pattern),
				shadowOnly(900, 'fire', pattern),
				nonShadowOnly(900, 'ice', pattern),
				shadowOnly(900, 'ice', pattern),
			],
			{ 900: new Set(['fire', 'ice']) }
		);
		expect(result).toEqual([bare(900, '', pattern)]);
	});

	it('two DIFFERENT extras can each independently qualify for their own dex-only merge at the same dex', () => {
		// Contrived but valid: dex 950 has two forms, both fully covered at
		// pattern X AND, separately, both ALSO fully covered at pattern Y
		// (e.g. two different CP caps producing two different deviating
		// patterns for both forms). Each pattern's group independently
		// satisfies "every form covered", so each collapses on its own —
		// the result is two dex-only clauses, one per pattern, not one.
		const patternX = ',1-4attack';
		const patternY = ',0-3defense';
		const result = canonicalizeDexExclusions(
			[
				bare(950, 'grass', patternX),
				bare(950, 'fire', patternX),
				bare(950, 'grass', patternY),
				bare(950, 'fire', patternY),
			],
			{ 950: new Set(['grass', 'fire']) }
		);
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(bare(950, '', patternX));
		expect(result).toContainEqual(bare(950, '', patternY));
	});
});

describe('canonicalizeDexExclusions — multiple dexes are handled independently', () => {
	it('a merge opportunity at one dex never leaks into an unrelated dex', () => {
		const result = canonicalizeDexExclusions(
			[bare(26, 'psychic'), bare(26, '!psychic'), shadowOnly(27, '!ice'), shadowOnly(27, '!ground')],
			{ 26: new Set(['psychic', '!psychic']), 27: new Set(['!ice', '!ground']) }
		);
		expect(result).toHaveLength(3);
		expect(result).toContainEqual(bare(26));
		expect(result).toContainEqual(shadowOnly(27, '!ice'));
		expect(result).toContainEqual(shadowOnly(27, '!ground'));
	});

	it('an empty input list returns an empty list', () => {
		expect(canonicalizeDexExclusions([], {})).toEqual([]);
	});
});

describe('canonicalizeDexExclusions — idempotency (a second pass never finds anything a first pass missed)', () => {
	it('re-running the pass on its own already-canonical output is a strict no-op, across every case above', () => {
		const formsPerDex = {
			26: new Set(['psychic', '!psychic']),
			27: new Set(['!ice', '!ground']),
			37: new Set(['!fire', '!ice']),
			300: new Set(['']),
			950: new Set(['grass', 'fire']),
		};
		const messy: Array<DexExclusion> = [
			// dex 26: fully mergeable (Case B, no bucket)
			bare(26, 'psychic'),
			bare(26, '!psychic'),
			// dex 27: correctly stuck (Shadow-only only, two different forms)
			shadowOnly(27, '!ice'),
			shadowOnly(27, '!ground'),
			// dex 37: Case A then Case B, sharing a real bucket
			bare(37, '!fire', ',1-4attack'),
			shadowOnly(37, '!fire', ',1-4attack'),
			nonShadowOnly(37, '!ice', ',1-4attack'),
			shadowOnly(37, '!ice', ',1-4attack'),
			// dex 300: single-form Case A, bare absorbs a same-pattern Shadow-only
			bare(300, '', ',0-3attack'),
			shadowOnly(300, '', ',0-3attack'),
			// dex 950: two independent, non-overlapping bucket patterns
			bare(950, 'grass', ',1-4attack'),
			bare(950, 'fire', ',1-4attack'),
			bare(950, 'grass', ',0-3defense'),
			bare(950, 'fire', ',0-3defense'),
		];

		const oncePass = canonicalizeDexExclusions(messy, formsPerDex);
		const twicePass = canonicalizeDexExclusions(oncePass, formsPerDex);

		expect(twicePass).toEqual(oncePass);
	});
});
