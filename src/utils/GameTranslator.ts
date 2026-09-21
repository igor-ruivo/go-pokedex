import type { GameLanguage } from '../contexts/language-context';
import { getGameTranslationsSnapshot } from './game-translations-store';

export enum GameTranslatorKeys {
	CPSearch,
	AttackSearch,
	DefenseSearch,
	HPSearch,
	MegaEvolve,
	UltraBeast,
	ShadowSearch,
	Legendary,
	Mythical,
	Favorite,
	DynamaxSearch,
	FusionSearch,
	GigantamaxSearch,
	BackgroundSearch,
	SpecialBackgroundSearch,
	ShinySearch,
	CostumeSearch,
	TradedSearch,
	CPDisplay,
	RaidDisplay,
	ShadowDisplay,
	FastAttackHeader,
	ChargedAttackHeader,
	GreatLeagueLong,
	UltraLeagueLong,
	MasterLeagueLong,
	GreatLeagueShort,
	UltraLeagueShort,
	MasterLeagueShort,
	AttackBoostSelf,
	AttackBoostTarget,
	AttackDropSelf,
	AttackDropTarget,
	DefenseBoostSelf,
	DefenseBoostTarget,
	DefenseDropSelf,
	DefenseDropTarget,
	BuffChance,
	WeatherSunny,
	WeatherClear,
	WeatherRainy,
	WeatherPartlyCloudy,
	WeatherCloudy,
	WeatherWindy,
	WeatherSnow,
	WeatherFog,
	FriendshipGood,
	FriendshipGreat,
	FriendshipUltra,
	FriendshipBest,
	MegaLevelBase,
	MegaLevelHigh,
	MegaLevelMax,
	AdventureSync,
	Routes,
	FastAttackHeaderPlural,
	ChargedAttackHeaderPlural,
	EliteFastTm,
	EliteChargedTm,
	EliteRaidTier,
	RaidDisplayPlural,
	MegaEvolvableDisplay,
}

// Every key here is a literal lookup into `game-translations.json` — the
// dataset dex-server builds entirely from Pokémon GO's own data-mined client
// string tables (see dex-server's `game-translations-provider.ts`), never
// hand-typed here. Nothing in this file is a hardcoded translation any more:
// this is purely the mapping from "which concept" to "which JSON key", plus
// the lookup/gap-reporting logic below.
const TRANSLATION_KEY_NAMES: Record<GameTranslatorKeys, string> = {
	[GameTranslatorKeys.CPSearch]: 'cpSearch',
	[GameTranslatorKeys.AttackSearch]: 'attackSearch',
	[GameTranslatorKeys.DefenseSearch]: 'defenseSearch',
	[GameTranslatorKeys.HPSearch]: 'hpSearch',
	[GameTranslatorKeys.MegaEvolve]: 'megaEvolve',
	[GameTranslatorKeys.UltraBeast]: 'ultraBeast',
	[GameTranslatorKeys.ShadowSearch]: 'shadowSearch',
	[GameTranslatorKeys.Legendary]: 'legendary',
	[GameTranslatorKeys.Mythical]: 'mythical',
	[GameTranslatorKeys.Favorite]: 'favorite',
	[GameTranslatorKeys.DynamaxSearch]: 'dynamaxSearch',
	[GameTranslatorKeys.FusionSearch]: 'fusionSearch',
	[GameTranslatorKeys.GigantamaxSearch]: 'gigantamaxSearch',
	[GameTranslatorKeys.BackgroundSearch]: 'backgroundSearch',
	[GameTranslatorKeys.SpecialBackgroundSearch]: 'specialBackgroundSearch',
	[GameTranslatorKeys.ShinySearch]: 'shinySearch',
	[GameTranslatorKeys.CostumeSearch]: 'costumeSearch',
	[GameTranslatorKeys.TradedSearch]: 'tradedSearch',
	[GameTranslatorKeys.CPDisplay]: 'cpDisplay',
	[GameTranslatorKeys.RaidDisplay]: 'raidDisplay',
	[GameTranslatorKeys.ShadowDisplay]: 'shadowDisplay',
	[GameTranslatorKeys.FastAttackHeader]: 'fastAttackHeader',
	[GameTranslatorKeys.ChargedAttackHeader]: 'chargedAttackHeader',
	[GameTranslatorKeys.GreatLeagueLong]: 'greatLeagueLong',
	[GameTranslatorKeys.UltraLeagueLong]: 'ultraLeagueLong',
	[GameTranslatorKeys.MasterLeagueLong]: 'masterLeagueLong',
	[GameTranslatorKeys.GreatLeagueShort]: 'greatLeagueShort',
	[GameTranslatorKeys.UltraLeagueShort]: 'ultraLeagueShort',
	[GameTranslatorKeys.MasterLeagueShort]: 'masterLeagueShort',
	[GameTranslatorKeys.AttackBoostSelf]: 'attackBoostSelf',
	[GameTranslatorKeys.AttackBoostTarget]: 'attackBoostTarget',
	[GameTranslatorKeys.AttackDropSelf]: 'attackDropSelf',
	[GameTranslatorKeys.AttackDropTarget]: 'attackDropTarget',
	[GameTranslatorKeys.DefenseBoostSelf]: 'defenseBoostSelf',
	[GameTranslatorKeys.DefenseBoostTarget]: 'defenseBoostTarget',
	[GameTranslatorKeys.DefenseDropSelf]: 'defenseDropSelf',
	[GameTranslatorKeys.DefenseDropTarget]: 'defenseDropTarget',
	[GameTranslatorKeys.BuffChance]: 'buffChance',
	[GameTranslatorKeys.WeatherSunny]: 'weatherSunny',
	[GameTranslatorKeys.WeatherClear]: 'weatherClear',
	[GameTranslatorKeys.WeatherRainy]: 'weatherRainy',
	[GameTranslatorKeys.WeatherPartlyCloudy]: 'weatherPartlyCloudy',
	[GameTranslatorKeys.WeatherCloudy]: 'weatherCloudy',
	[GameTranslatorKeys.WeatherWindy]: 'weatherWindy',
	[GameTranslatorKeys.WeatherSnow]: 'weatherSnow',
	[GameTranslatorKeys.WeatherFog]: 'weatherFog',
	[GameTranslatorKeys.FriendshipGood]: 'friendshipGood',
	[GameTranslatorKeys.FriendshipGreat]: 'friendshipGreat',
	[GameTranslatorKeys.FriendshipUltra]: 'friendshipUltra',
	[GameTranslatorKeys.FriendshipBest]: 'friendshipBest',
	[GameTranslatorKeys.MegaLevelBase]: 'megaLevelBase',
	[GameTranslatorKeys.MegaLevelHigh]: 'megaLevelHigh',
	[GameTranslatorKeys.MegaLevelMax]: 'megaLevelMax',
	[GameTranslatorKeys.AdventureSync]: 'adventureSync',
	[GameTranslatorKeys.Routes]: 'routes',
	[GameTranslatorKeys.FastAttackHeaderPlural]: 'fastAttackHeaderPlural',
	[GameTranslatorKeys.ChargedAttackHeaderPlural]: 'chargedAttackHeaderPlural',
	[GameTranslatorKeys.EliteFastTm]: 'eliteFastTm',
	[GameTranslatorKeys.EliteChargedTm]: 'eliteChargedTm',
	[GameTranslatorKeys.EliteRaidTier]: 'eliteRaidTier',
	[GameTranslatorKeys.RaidDisplayPlural]: 'raidDisplayPlural',
	[GameTranslatorKeys.MegaEvolvableDisplay]: 'megaEvolvableDisplay',
};

// Dev-only, de-duplicated so a missing combo doesn't spam the console on
// every render/keystroke of a search-string builder.
const warnedGaps = new Set<string>();

/** `''` covers two different situations by design, both rendered the same
 *  way (an empty placeholder — no English/hardcoded text stands in for a
 *  language that hasn't been confirmed): the data hasn't finished loading
 *  yet (expected, no warning), or it has loaded and this exact key/locale
 *  combination is genuinely missing from `game-translations.json` (a real
 *  bug — dex-server's own QA is supposed to make this impossible, so it's
 *  still surfaced loudly in dev). */
const gameTranslator = (key: GameTranslatorKeys, language: GameLanguage): string => {
	const data = getGameTranslationsSnapshot();
	if (!data) return '';

	const translationKey = TRANSLATION_KEY_NAMES[key];
	const value = data.translations[translationKey]?.[language];
	if (value !== undefined) return value;

	if (import.meta.env.DEV) {
		const gapId = `${GameTranslatorKeys[key]}/${language}`;
		if (!warnedGaps.has(gapId)) {
			warnedGaps.add(gapId);
			console.error(
				`[GameTranslator] no confirmed translation for "${gapId}" in the fetched game-translations.json — see dex-server's game-translations-provider.ts.`
			);
		}
	}

	return '';
};

export default gameTranslator;

const warnedTypeGaps = new Set<string>();

/** Lowercase, in-game search-bar token for a Pokémon type (e.g. typing
 *  "fire" to filter). Used to localize dex-server's English-only
 *  `searchFormId` form-disambiguation tokens — see `translateTypeNames` in
 *  lib/search-string.ts. */
export const gameTypeTranslator = (type: string, language: GameLanguage): string => {
	const data = getGameTranslationsSnapshot();
	if (!data) return '';

	const value = data.types[type]?.search[language];
	if (value !== undefined) return value;

	if (import.meta.env.DEV) {
		const gapId = `${type}/${language}`;
		if (!warnedTypeGaps.has(gapId)) {
			warnedTypeGaps.add(gapId);
			console.error(
				`[GameTranslator] no confirmed type search translation for "${gapId}" in the fetched game-translations.json.`
			);
		}
	}

	return '';
};

const warnedTypeDisplayGaps = new Set<string>();

/** Properly-cased, in-game display name for a Pokémon type (e.g. "Fire") —
 *  for type chips/badges, as opposed to `gameTypeTranslator`'s lowercase
 *  search token. */
export const gameTypeDisplayTranslator = (type: string, language: GameLanguage): string => {
	const data = getGameTranslationsSnapshot();
	if (!data) return '';

	const value = data.types[type]?.display[language];
	if (value !== undefined) return value;

	if (import.meta.env.DEV) {
		const gapId = `${type}/${language}`;
		if (!warnedTypeDisplayGaps.has(gapId)) {
			warnedTypeDisplayGaps.add(gapId);
			console.error(
				`[GameTranslator] no confirmed type display translation for "${gapId}" in the fetched game-translations.json.`
			);
		}
	}

	return '';
};
