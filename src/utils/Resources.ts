export const cacheTtlInMillis = 60 * 60 * 1000;
export const buildPokemonImageUrl = (dex: string, type: string, form?: string) => `https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/${dex}${form ? "_f" + form : ""}.png`;
export const gamemasterPokemonUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster/pokemon.json";
export const pvpokeRankings1500Url = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-1500.json";
export const pvpokeRankings2500Url = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-2500.json";
export const pvpokeRankingsUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-10000.json";
