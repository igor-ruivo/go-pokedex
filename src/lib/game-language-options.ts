import type { LanguageOption } from '../components/LanguagePicker';
import { GameLanguage } from '../contexts/language-context';
import { SUPPORTED_LOCALE_NAMES } from '../i18n';

// Endonyms, not translated — see LanguagePicker's doc for why. All 15
// GameLanguage members are listed here even though GameTranslator.ts search
// keywords are the only thing actually localized per language today —
// dex-server hasn't shipped per-locale Pokémon/move names yet, so picking,
// say, Japanese here only changes search-string keywords for now, not
// species/move names on the rest of the site. That's expected, not a bug —
// see the dex-server work this is waiting on.
export const GAME_LANGUAGE_OPTIONS: Array<LanguageOption<GameLanguage>> = [
	{ value: GameLanguage.en, label: SUPPORTED_LOCALE_NAMES.en },
	{ value: GameLanguage.de, label: SUPPORTED_LOCALE_NAMES.de },
	{ value: GameLanguage.es, label: SUPPORTED_LOCALE_NAMES.es },
	{ value: GameLanguage.esMx, label: SUPPORTED_LOCALE_NAMES['es-MX'] },
	{ value: GameLanguage.fr, label: SUPPORTED_LOCALE_NAMES.fr },
	{ value: GameLanguage.hi, label: SUPPORTED_LOCALE_NAMES.hi },
	{ value: GameLanguage.id, label: SUPPORTED_LOCALE_NAMES.id },
	{ value: GameLanguage.it, label: SUPPORTED_LOCALE_NAMES.it },
	{ value: GameLanguage.ptbr, label: 'Português (BR)' },
	{ value: GameLanguage.ja, label: SUPPORTED_LOCALE_NAMES.ja },
	{ value: GameLanguage.ko, label: SUPPORTED_LOCALE_NAMES.ko },
	{ value: GameLanguage.ru, label: SUPPORTED_LOCALE_NAMES.ru },
	{ value: GameLanguage.th, label: SUPPORTED_LOCALE_NAMES.th },
	{ value: GameLanguage.tr, label: SUPPORTED_LOCALE_NAMES.tr },
	{ value: GameLanguage.zhHant, label: SUPPORTED_LOCALE_NAMES['zh-Hant'] },
];
