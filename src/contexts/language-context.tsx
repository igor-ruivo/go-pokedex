import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import i18n, { DEFAULT_LOCALE, type Locale } from '../i18n';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export type { Locale };

// GameLanguage is the language of everything dex-server ships (today: just
// the in-game search-bar keyword tokens — shadow/shiny/legendary/CP/HP/etc.,
// see GameTranslator.ts; species/move names are pending dex-server work) —
// deliberately a distinct enum from `Locale` (website-UI copy, src/i18n/),
// since Pokémon GO's own supported set doesn't line up 1:1 with this site's.
// Values match the website-UI `Locale` codes where both exist, for the same
// reason `pt_br` (not `pt-BR`) below is left alone rather than "fixed" to
// match: `ptbr`'s value is already what's persisted in real users'
// localStorage today, and changing it would silently reset their saved game
// language back to the default — not worth it just for cosmetic consistency.
// New members added here don't have that problem yet, so they use the
// website's exact codes.
export enum GameLanguage {
	en = 'en',
	ptbr = 'pt_br',
	de = 'de',
	es = 'es',
	esMx = 'es-MX',
	fr = 'fr',
	hi = 'hi',
	id = 'id',
	it = 'it',
	ja = 'ja',
	ko = 'ko',
	ru = 'ru',
	th = 'th',
	tr = 'tr',
	zhHant = 'zh-Hant',
}

// The default GameLanguage for each website-UI Locale — used so that
// GameLanguage (search-string keyword terms only; see above) follows the
// main app-language picker unless a page-level override says otherwise. One
// entry per SUPPORTED_LOCALES member; keep the two lists in sync.
export const localeToGameLanguage: Record<Locale, GameLanguage> = {
	'en': GameLanguage.en,
	'de': GameLanguage.de,
	'es': GameLanguage.es,
	'es-MX': GameLanguage.esMx,
	'fr': GameLanguage.fr,
	'hi': GameLanguage.hi,
	'id': GameLanguage.id,
	'it': GameLanguage.it,
	'pt-PT': GameLanguage.ptbr,
	'ja': GameLanguage.ja,
	'ko': GameLanguage.ko,
	'ru': GameLanguage.ru,
	'th': GameLanguage.th,
	'tr': GameLanguage.tr,
	'zh-Hant': GameLanguage.zhHant,
};

interface LanguageContextType {
	currentLanguage: Locale;
	// Display-only GameLanguage: every non-search-string consumer (labels,
	// tooltips, sentences, league/move/event/rocket/egg names, everything
	// GameTranslator.ts's `...Display` keys and dex-server's other
	// GameLanguage-keyed payloads feed) reads this. It always tracks
	// `currentLanguage` 1:1 via `localeToGameLanguage` — there is no way to
	// set it independently, on purpose: the whole point is that it can never
	// drift from the app's own UI language. See `searchGameLanguage` below
	// for the one deliberate exception.
	currentGameLanguage: GameLanguage;
	// Search-string-only GameLanguage: the ONLY thing this controls is the
	// literal keyword tokens inside a generated Niantic search-bar string
	// (see src/lib/search-string.ts and the generators in MassDelete.tsx /
	// SearchStringsTab.tsx). Defaults to `currentGameLanguage` but can be
	// explicitly overridden via the picker rendered on those two pages —
	// e.g. the site's UI is in Japanese but the player's actual Pokémon GO
	// account (and so the strings they'll paste into its search bar) is in
	// Portuguese. Every other label on those same two pages (explanatory
	// sentences, protection-checkbox descriptions, chip text, etc.) still
	// reads `currentGameLanguage` above, not this — only the generated
	// string itself uses the override.
	searchGameLanguage: GameLanguage;
	updateCurrentLanguage: (newLanguage: Locale) => void;
	updateSearchGameLanguage: (newLanguage: GameLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}
	return context;
};

export const LanguageProvider = (props: React.PropsWithChildren<object>) => {
	// src/i18n/index.ts already resolved the effective starting locale (cached
	// choice, else browser language, else DEFAULT_LOCALE) and initialized
	// i18next with it before this ever mounts — reuse that resolution here
	// instead of re-deriving it, so the two can never disagree.
	const [currentLanguage, setCurrentLanguage] = useState<Locale>((i18n.language as Locale) || DEFAULT_LOCALE);

	// Always derived — see the interface doc above for why this one has no
	// setter and no override.
	const currentGameLanguage = localeToGameLanguage[currentLanguage];

	// Search-string-only override (see the interface doc above). Its mere
	// presence in storage *is* the "this was explicitly chosen" flag, so no
	// separate flag is needed. Once set, it sticks across app-language
	// changes until the picker is used again.
	const [searchGameLanguageOverride, setSearchGameLanguageOverride] = useState<GameLanguage | null>(() => {
		const cached = readPersistentValue(ConfigKeys.GameLanguage);
		if (!cached) return null;
		try {
			return JSON.parse(cached) as GameLanguage;
		} catch {
			return null;
		}
	});

	const searchGameLanguage = searchGameLanguageOverride ?? currentGameLanguage;

	const updateCurrentLanguage = useCallback((newLanguage: Locale) => {
		writePersistentValue(ConfigKeys.Language, JSON.stringify(newLanguage));
		void i18n.changeLanguage(newLanguage);
		setCurrentLanguage(newLanguage);
	}, []);

	const updateSearchGameLanguage = useCallback((newLanguage: GameLanguage) => {
		writePersistentValue(ConfigKeys.GameLanguage, JSON.stringify(newLanguage));
		setSearchGameLanguageOverride(newLanguage);
	}, []);

	const value = useMemo(
		() => ({
			currentLanguage,
			currentGameLanguage,
			searchGameLanguage,
			updateCurrentLanguage,
			updateSearchGameLanguage,
		}),
		[currentLanguage, currentGameLanguage, searchGameLanguage, updateCurrentLanguage, updateSearchGameLanguage]
	);

	return <LanguageContext.Provider value={value}>{props.children}</LanguageContext.Provider>;
};
