export const cacheTtlInMillis = 60 * 60 * 1000 * 24;
export const rankChangesCacheTtlInMillis = 5 * 24 * 60 * 60 * 1000;
export const goBaseUrl = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets/pm";
export const buildPokemonImageUrl = (dex: string, type: string, form?: string) => `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/${dex}${form ? "_f" + form : ""}.png`;
export const gamemasterPokemonUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster/pokemon.json";
export const pvpokeRankings1500Url = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-1500.json";
export const pvpokeRankings2500Url = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-2500.json";
export const pvpokeRankingsUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-10000.json";
export const pvpokeRankingsRetroUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/retro/overall/rankings-1500.json";
export const pvpokeRankingsHolidayUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/holiday/overall/rankings-1500.json";
export const pvpokeRankingsHolidayLittleUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/holiday/overall/rankings-500.json";
export const pvpokeRankingsRemixLittleUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/remix/overall/rankings-1500.json";
export const pvpokeRankingsFantasyLittleUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/fantasy/overall/rankings-1500.json";
export const gameMasterUrl = "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";
export const enTranslationsUrl = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_english.json";
export const ptbrTranslationsUrl = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_brazilianportuguese.json";
export const bossesUrl = "https://leekduck.com/boss/";