import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { RankedTeam, TeamBuilderData, TeamLeague } from '../DTOs/ITeamBuilder';
import { LEAGUE_CP } from './league-caps';
import { canonicalMoveset, type TeamSlotDescriptor } from './team-analysis';

/**
 * The ranking of the teams made from a player's saved Pokémon is worked out in the browser (a simulation per team), so it is
 * kept in the session's storage — one entry per league — along with the fingerprint of everything it was computed from
 * (the saved Pokémon and their stand-ins, the league's ranking, the species, PvPoke's data). Coming back to the page with the
 * same fingerprint shows the teams straight away; any change in the inputs, or in the format (`RANK_CACHE_VERSION`), is a miss.
 */
export const RANK_CACHE_VERSION = 3;

/** Where one league's ranking is kept. Leagues never share an entry. */
export const rankCacheKey = (league: TeamLeague): string =>
	`go-pokedex:collection-team-rank:v${RANK_CACHE_VERSION}:${league}`;

/** A team as it was stored: shaped like one, so a corrupted or hand-edited entry is not taken for a ranking. */
export const isRankedTeam = (value: unknown): value is RankedTeam => {
	if (typeof value !== 'object' || value === null) return false;
	const team = value as Partial<RankedTeam>;
	return (
		typeof team.score === 'number' &&
		typeof team.threatScore === 'number' &&
		(team.tier === 'elite' ||
			team.tier === 'strong' ||
			team.tier === 'solid' ||
			team.tier === 'shaky' ||
			team.tier === 'risky') &&
		Array.isArray(team.members) &&
		team.members.length === 3 &&
		team.members.every((member: unknown) => {
			if (typeof member !== 'object' || member === null) return false;
			const rankedMember = member as { speciesId?: unknown; moveset?: unknown };
			return (
				typeof rankedMember.speciesId === 'string' &&
				Array.isArray(rankedMember.moveset) &&
				rankedMember.moveset.every((move: unknown) => typeof move === 'string')
			);
		})
	);
};

/** The ranking kept for `league`, if it was computed from exactly `signature`; otherwise `undefined`. */
export const readRankedCache = (league: TeamLeague, signature: string): Array<RankedTeam> | undefined => {
	try {
		const raw = window.sessionStorage.getItem(rankCacheKey(league));
		if (!raw) return undefined;
		const cached: unknown = JSON.parse(raw);
		if (typeof cached !== 'object' || cached === null) return undefined;
		const record = cached as { signature?: unknown; teams?: unknown };
		return record.signature === signature && Array.isArray(record.teams) && record.teams.every(isRankedTeam)
			? record.teams
			: undefined;
	} catch {
		return undefined;
	}
};

/** Keeps the ranking of `league`, replacing what it had. Storage that is unavailable or full only means no cache. */
export const writeRankedCache = (league: TeamLeague, signature: string, teams: ReadonlyArray<RankedTeam>): void => {
	try {
		window.sessionStorage.setItem(rankCacheKey(league), JSON.stringify({ signature, teams }));
	} catch {
		// Session storage may be unavailable or full; the in-memory ranking still works.
	}
};

/** A short, stable fingerprint of a string (two 32-bit hashes and its length). */
export const hashSignature = (value: string): string => {
	let first = 2166136261;
	let second = 0x9e3779b9;
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		first = Math.imul(first ^ code, 16777619);
		second = Math.imul(second ^ code, 2246822519);
	}
	return `${value.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
};

/**
 * The combinations as what they are rated on: every member with its Charged Moves in their canonical order, so that arranging them
 * differently is not a change (a ranking is neither recomputed nor asked for again because of it).
 */
export const canonicalCombinations = (
	combinations: ReadonlyArray<ReadonlyArray<TeamSlotDescriptor>>
): Array<Array<TeamSlotDescriptor>> =>
	combinations.map((team) => team.map((member) => ({ ...member, moveset: canonicalMoveset(member.moveset) })));

/**
 * The fingerprint a ranking is cached under: the league and its CP cap, the combinations being ranked (every member's build
 * and marks), the league's ranking, the base data of every species involved, and the parts of PvPoke's team-builder data the
 * simulation reads (its simulator state, moves, best IVs, forms, excluded threats and the league's meta).
 */
export const rankingSignature = (input: {
	league: TeamLeague;
	combinations: ReadonlyArray<ReadonlyArray<TeamSlotDescriptor>>;
	rankList: Readonly<Record<string, unknown>>;
	gamemaster: Readonly<
		Record<
			string,
			Omit<Pick<IGamemasterPokemon, 'dex' | 'types' | 'baseStats' | 'isShadow'>, 'types'> & {
				types: ReadonlyArray<unknown>;
			}
		>
	>;
	builder: TeamBuilderData | undefined;
}): string => {
	const { league, combinations, rankList, gamemaster, builder } = input;
	const rankedSpecies = Object.entries(rankList)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([speciesId, ranking]) => [speciesId, ranking]);
	const speciesIds = new Set([
		...Object.keys(rankList),
		...combinations.flatMap((team) => team.map((member) => member.speciesId)),
	]);
	const species = [...speciesIds].sort().map((id) => {
		const pokemon = gamemaster[id];
		return pokemon ? [id, pokemon.dex, pokemon.types, pokemon.baseStats, pokemon.isShadow] : [id, null];
	});
	return hashSignature(
		JSON.stringify({
			version: RANK_CACHE_VERSION,
			league,
			combinations: canonicalCombinations(combinations),
			rankedSpecies,
			species,
			builder: builder
				? {
						simulator: builder.simulator,
						moves: builder.moves,
						ivs: builder.ivs,
						cpCap: LEAGUE_CP[league],
						forms: builder.forms,
						excludedThreats: builder.excludedThreats,
						meta: builder.meta[league],
					}
				: null,
		})
	);
};
