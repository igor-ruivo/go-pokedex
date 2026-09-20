import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { ConfigKeys, readPersistentValue } from '../utils/persistent-configs-handler';

// The full set of website-UI locales. Adding one means adding a matching
// `src/i18n/locales/<code>/` directory with every namespace file the other
// locales have (see scripts/check-i18n-parity.mjs, which fails the build
// otherwise) and listing the code here — nothing else needs to change, since
// `resources`/`ns` below are discovered from disk, not hand-listed (see the
// `import.meta.glob` comment). This is deliberately separate from
// GameLanguage (contexts/language-context.tsx), which tracks Pokémon/move-name
// language, not UI copy — see the two-axis split discussed when this was
// introduced.
//
// This exact list — and the order — mirrors Pokémon GO's own official site
// language switcher (pokemongolive.com), i.e. every locale Pokémon GO is
// actually played/localized in. `SUPPORTED_LOCALE_NAMES` gives each one's
// endonym (the name for the language *in* that language — "Español", not
// "Spanish") for the picker in SettingsMenu.tsx/Settings.tsx, same
// convention Niantic's own picker uses. None of these are RTL scripts.
export const SUPPORTED_LOCALES = [
	'en',
	'de',
	'es',
	'es-MX',
	'fr',
	'hi',
	'id',
	'it',
	'pl',
	'pt-BR',
	'ja',
	'ko',
	'ru',
	'th',
	'tr',
	'zh-Hant',
] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALE_NAMES: Record<Locale, string> = {
	'en': 'English',
	'de': 'Deutsch',
	'es': 'Español',
	'es-MX': 'Español (México)',
	'fr': 'Français',
	'hi': 'हिन्दी',
	'id': 'Bahasa Indonesia',
	'it': 'Italiano',
	'pl': 'Polski',
	'pt-BR': 'Português',
	'ja': '日本語',
	'ko': '한국어',
	'ru': 'Русский',
	'th': 'ไทย',
	'tr': 'Türkçe',
	'zh-Hant': '中文',
};

const isSupportedLocale = (value: unknown): value is Locale =>
	typeof value === 'string' && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value);

/** Every locale JSON file under locales/<code>/<namespace>.json, discovered
 *  and bundled at build time rather than hand-listed — a namespace file that
 *  exists on disk but isn't wired in here was a real bug (massDelete.json and
 *  pokemonDetail.json shipped fully translated and parity-checked, but never
 *  loaded, so every t() call against them silently rendered the raw key).
 *  `eager: true` keeps resolution synchronous, still required for
 *  scripts/prerender.mjs to get real text instead of keys in first paint. */
const modules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/*.json', { eager: true });

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
const namespaces = new Set<string>();
for (const [filePath, mod] of Object.entries(modules)) {
	const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(filePath);
	if (!match) continue;
	const [, locale, ns] = match;
	resources[locale] ??= {};
	resources[locale][ns] = mod.default;
	namespaces.add(ns);
}
const NAMESPACES = [...namespaces];

const detectDefaultLocale = (): Locale => {
	const cachedRaw = readPersistentValue(ConfigKeys.Language);
	if (cachedRaw) {
		try {
			const cached: unknown = JSON.parse(cachedRaw);
			if (isSupportedLocale(cached)) return cached;
		} catch {
			// Pre-migration value (the old numeric Language enum) or corrupt —
			// fall through to browser-language detection below.
		}
	}
	const browserLang = (typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE).toLowerCase();

	// Spanish and Chinese both need a regional check before the generic
	// language match below — es-MX/es-419 (Latin-America) get the Mexican
	// Spanish copy, every other es-* gets European Spanish; zh-* of any kind
	// maps to zh-Hant, since that's the only Chinese variant Pokémon GO's own
	// site (and this app) offers — better a Traditional-script page than none.
	if (browserLang.startsWith('es')) return browserLang === 'es-mx' || browserLang.startsWith('es-419') ? 'es-MX' : 'es';
	if (browserLang.startsWith('zh')) return 'zh-Hant';
	if (browserLang.startsWith('pt')) return 'pt-BR';

	const directMatch = (SUPPORTED_LOCALES as ReadonlyArray<string>).find(
		(l) => l.toLowerCase() === browserLang || browserLang.startsWith(`${l.toLowerCase()}-`)
	);
	return isSupportedLocale(directMatch) ? directMatch : DEFAULT_LOCALE;
};

void i18n.use(initReactI18next).init({
	resources,
	lng: detectDefaultLocale(),
	fallbackLng: DEFAULT_LOCALE,
	supportedLngs: SUPPORTED_LOCALES,
	ns: NAMESPACES,
	defaultNS: 'common',
	interpolation: { escapeValue: false },
	returnEmptyString: false,
	// Every key that ships must exist in every locale — enforced at build
	// time by `pnpm run i18n:check` (scripts/check-i18n-parity.mjs), part of
	// `pnpm run lint`. This handler is a dev-time trip wire for the gap
	// between "someone typed a new t() call" and "the next lint run catches
	// it" — loud on purpose, so a missing translation is never a silent
	// fallback to English, only ever a logged, trackable bug.
	missingKeyHandler: (lngs, ns, key) => {
		if (import.meta.env.DEV) {
			console.error(`[i18n] missing key "${ns}:${key}" for locale(s): ${lngs.join(', ')}`);
		}
	},
	saveMissing: import.meta.env.DEV,
});

export default i18n;
