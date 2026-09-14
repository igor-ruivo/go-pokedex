import { describe, expect, it } from 'vitest';

import { canonicalizeDexExclusions, type DexExclusion, renderDexExclusion } from './search-string';

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
		expect(renderDexExclusion(bare(300))).toBe('!300');
	});

	it('with a form disambiguator', () => {
		expect(renderDexExclusion(bare(26, 'psychic'))).toBe('!26,psychic');
	});

	it('with a shadow-only scope', () => {
		expect(renderDexExclusion(shadowOnly(26, 'psychic'))).toBe('!26,psychic,!shadow');
	});

	it('with a non-shadow-only scope', () => {
		expect(renderDexExclusion(nonShadowOnly(26, 'psychic'))).toBe('!26,psychic,shadow');
	});

	it('with extra IV-bucket qualifiers', () => {
		expect(renderDexExclusion(bare(300, '', ',0-3attack,0-3defense,0-2hp,4hp'))).toBe(
			'!300,0-3attack,0-3defense,0-2hp,4hp'
		);
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
