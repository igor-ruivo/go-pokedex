export const cacheTtlInMillis = 60 * 60 * 1000 * 24;
export const calendarCache = 60 * 60 * 1000;
export const rankChangesCacheTtlInMillis = 5 * 24 * 60 * 60 * 1000;
export const goBaseUrl =
	'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets/pm';
export const buildPokemonImageUrl = (
	dex: string,
	type: string,
	form?: string
) =>
	`https://assets.pokemon.com/assets/cms2/img/pokedex/${type}/${dex}${form ? '_f' + form : ''}.png`;
export const gamemasterPokemonUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
export const pvpokeRankings1500Url =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/great-league-pvp.json';
export const pvpokeRankings2500Url =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/ultra-league-pvp.json';
export const pvpokeRankingsUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/master-league-pvp.json';
export const movesUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/moves.json';
export const dpsUrl = (type: string) =>
	`https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/${type}-raid-dps-rank.json`;
export const eventsUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/events.json';
export const seasonUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/season.json';
export const specialBossesUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/leekduck-special-raid-bosses.json';
export const spotlightHoursUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/spotlight-hours.json';
export const currentBossesUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/leekduck-raid-bosses.json';
export const currentEggsUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/leekduck-eggs.json';
export const currentRocketsUrl =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/rocket-lineups.json';
