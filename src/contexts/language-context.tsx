import { createContext, useCallback, useContext, useState } from 'react';

import i18n, { DEFAULT_LOCALE, type Locale } from '../i18n';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export type { Locale };

// GameLanguage tracks Pokémon/move-name language (the data dex-server ships
// translated, e.g. moveName: Record<GameLanguage, string>) — deliberately
// separate from `Locale` (website-UI copy, src/i18n/). See src/i18n/index.ts
// for why: they have different lifecycles and, for now, different supported
// sets — a website-UI locale doesn't imply Pokémon GO itself ships that
// language's in-game strings, and vice versa.
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

interface LanguageContextType {
	currentLanguage: Locale;
	currentGameLanguage: GameLanguage;
	updateCurrentLanguage: (newLanguage: Locale) => void;
	updateCurrentGameLanguage: (newLanguage: GameLanguage) => void;
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

	const getDefaultGameLanguage = useCallback(() => {
		const cachedGameLanguage = readPersistentValue(ConfigKeys.GameLanguage);
		if (!cachedGameLanguage) {
			return GameLanguage.en;
		}

		return JSON.parse(cachedGameLanguage) as GameLanguage;
	}, []);

	const [currentGameLanguage, setCurrentGameLanguage] = useState(getDefaultGameLanguage());

	const updateCurrentLanguage = useCallback((newLanguage: Locale) => {
		writePersistentValue(ConfigKeys.Language, JSON.stringify(newLanguage));
		void i18n.changeLanguage(newLanguage);
		setCurrentLanguage(newLanguage);
	}, []);

	const updateCurrentGameLanguage = useCallback((newInputText: GameLanguage) => {
		writePersistentValue(ConfigKeys.GameLanguage, JSON.stringify(newInputText));
		setCurrentGameLanguage(newInputText);
	}, []);

	return (
		<LanguageContext.Provider
			value={{
				currentLanguage,
				currentGameLanguage,
				updateCurrentLanguage,
				updateCurrentGameLanguage,
			}}
		>
			{props.children}
		</LanguageContext.Provider>
	);
};
