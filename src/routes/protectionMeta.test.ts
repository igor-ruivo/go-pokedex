import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import { __setGameTranslationsForTests } from '../utils/game-translations-store';
import { gameTranslationsTestFixture } from '../utils/game-translations-test-fixture';
import { PROTECTION_META_TRANSLATORS } from './MassDelete';

// Minimal i18next-`t` stand-in: every `massDelete:protectionMeta.*.label` key
// this file touches is, after the fixes this test guards, just a bare
// `"{{field}}"` template (see src/i18n/locales/*/massDelete.json) — so
// "interpolate and return" is a faithful stand-in for the real thing.
// Keys with no `options` (the non-game-sourced ones) just echo the key,
// since those tests only check gl-independence, not exact copy.
const fakeT = ((key: string, options?: Record<string, string>) =>
	options ? Object.values(options)[0] : key) as unknown as TFunction;

// Every checkbox that DOES have a confirmed data-mined source — see
// dex-server's `game-translations-provider.ts` `DISPLAY_SOURCE_KEYS` for
// where each of these actually comes from. Anything in
// `PROTECTION_META_TRANSLATORS` NOT listed here (`tagged`) has no in-game
// equivalent and stays on website i18n by design — deliberately not covered
// by the "differs per GameLanguage" assertions below.
const GAME_SOURCED_KEYS = [
	'favorite',
	'legendary',
	'mythical',
	'ultraBeast',
	'megaEvolvable',
	'shadow',
	'dynamax',
	'fusion',
	'gigantamax',
	'shiny',
	'costume',
	'background',
	'specialBackground',
] as const;

const translatorFor = (key: string) => {
	const entry = PROTECTION_META_TRANSLATORS.find((e) => e.key === key);
	if (!entry) throw new Error(`No PROTECTION_META_TRANSLATORS entry for "${key}" — did it get renamed/removed?`);
	return entry.translate;
};

describe('MassDelete protection-category checkboxes — game-language sourcing', () => {
	beforeEach(() => {
		__setGameTranslationsForTests(null);
	});

	it.each(GAME_SOURCED_KEYS)('%s: is empty (not hardcoded English) before game-translations data has loaded', (key) => {
		__setGameTranslationsForTests(null);
		const { label } = translatorFor(key)(fakeT, GameLanguage.en);
		// '' is GameTranslator's documented "not loaded yet" state (see
		// GameTranslator.ts) — anything else here would mean a hardcoded
		// English (or any other) string is silently standing in for a
		// language that hasn't been confirmed, which is exactly the bug this
		// whole GameTranslator migration exists to prevent.
		expect(label).toBe('');
	});

	it.each(GAME_SOURCED_KEYS)(
		'%s: reflects the loaded game-translations value immediately, with no stale caching, once data arrives',
		(key) => {
			// Reproduces the exact bug report: call once before data loads
			// (matching a component's first render), THEN seed the data (matching
			// the async fetch resolving) and call again — the second call must
			// see the fresh value. If `translate()` (or anything it calls)
			// secretly cached its first result, this would still see ''.
			__setGameTranslationsForTests(null);
			const before = translatorFor(key)(fakeT, GameLanguage.en).label;
			expect(before).toBe('');

			__setGameTranslationsForTests(gameTranslationsTestFixture);
			const after = translatorFor(key)(fakeT, GameLanguage.en).label;
			expect(after).not.toBe('');
		}
	);

	it.each(GAME_SOURCED_KEYS)('%s: translates to a different string per GameLanguage (en vs pt_br vs ja)', (key) => {
		__setGameTranslationsForTests(gameTranslationsTestFixture);
		const translate = translatorFor(key);
		const en = translate(fakeT, GameLanguage.en).label;
		const ptbr = translate(fakeT, GameLanguage.ptbr).label;
		const ja = translate(fakeT, GameLanguage.ja).label;

		expect(en).not.toBe('');
		// The actual regression this whole feature request is about: setting
		// GameLanguage to anything other than English must change the label —
		// three-way comparison so a bug that only breaks one locale (e.g. an
		// EN/ptbr mixup) still fails this.
		expect(new Set([en, ptbr, ja]).size).toBe(3);
	});

	it('every game-sourced checkbox label matches its known fixture value exactly, for en/pt_br/ja', () => {
		__setGameTranslationsForTests(gameTranslationsTestFixture);
		const expected: Record<(typeof GAME_SOURCED_KEYS)[number], Partial<Record<GameLanguage, string>>> = {
			favorite: { [GameLanguage.en]: 'Favorite', [GameLanguage.ptbr]: 'Favorito', [GameLanguage.ja]: 'お気に入り' },
			legendary: {
				[GameLanguage.en]: 'Legendary',
				[GameLanguage.ptbr]: 'Lendário',
				[GameLanguage.ja]: '伝説のポケモン',
			},
			mythical: { [GameLanguage.en]: 'Mythical', [GameLanguage.ptbr]: 'Mítico', [GameLanguage.ja]: '幻のポケモン' },
			ultraBeast: {
				[GameLanguage.en]: 'Ultra Beasts',
				[GameLanguage.ptbr]: 'Ultracriaturas',
				[GameLanguage.ja]: 'ウルトラビースト',
			},
			megaEvolvable: {
				[GameLanguage.en]: 'Can Mega Evolve',
				[GameLanguage.ptbr]: 'Pode Megaevoluir',
				[GameLanguage.ja]: 'メガシンカ可能',
			},
			shadow: { [GameLanguage.en]: 'Shadow', [GameLanguage.ptbr]: 'Sombroso', [GameLanguage.ja]: 'シャドウ' },
			dynamax: { [GameLanguage.en]: 'Dynamax', [GameLanguage.ptbr]: 'Dinamax', [GameLanguage.ja]: 'ダイマックス' },
			fusion: { [GameLanguage.en]: 'Fusion', [GameLanguage.ptbr]: 'Fusão', [GameLanguage.ja]: 'がったい' },
			gigantamax: {
				[GameLanguage.en]: 'Gigantamax',
				[GameLanguage.ptbr]: 'Gigamax',
				[GameLanguage.ja]: 'キョダイマックス',
			},
			shiny: { [GameLanguage.en]: 'Shiny', [GameLanguage.ptbr]: 'Brilhante', [GameLanguage.ja]: '色違い' },
			costume: { [GameLanguage.en]: 'Event', [GameLanguage.ptbr]: 'Evento', [GameLanguage.ja]: 'イベント' },
			background: {
				[GameLanguage.en]: 'Location Background',
				[GameLanguage.ptbr]: 'Fundo do Local',
				[GameLanguage.ja]: 'ロケーション背景',
			},
			specialBackground: {
				[GameLanguage.en]: 'Special Background',
				[GameLanguage.ptbr]: 'Fundo Especial',
				[GameLanguage.ja]: 'スペシャル背景',
			},
		};

		for (const key of GAME_SOURCED_KEYS) {
			const translate = translatorFor(key);
			for (const gl of [GameLanguage.en, GameLanguage.ptbr, GameLanguage.ja] as const) {
				expect(translate(fakeT, gl).label, `${key} @ ${gl}`).toBe(expected[key][gl]);
			}
		}
	});

	it('non-game-sourced checkboxes (tagged) are unaffected by GameLanguage', () => {
		__setGameTranslationsForTests(gameTranslationsTestFixture);
		for (const key of ['tagged']) {
			const translate = translatorFor(key);
			const en = translate(fakeT, GameLanguage.en).label;
			const ja = translate(fakeT, GameLanguage.ja).label;
			// These have no in-game source by design (see PROTECTION_META_TRANSLATORS'
			// own comments) — website i18n only, so GameLanguage must not change them.
			expect(en).toBe(ja);
		}
	});
});
