import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { usePvp } from '../../queries/pvp';
import { useRaidRanker } from '../../queries/raid-ranker';
import { fetchReachablePokemonIncludingSelf } from '../../utils/pokemon-helper';

export type LeagueKey = 'great' | 'ultra' | 'master' | 'raid';
export const LEAGUE_KEYS: ReadonlyArray<LeagueKey> = ['great', 'ultra', 'master', 'raid'];

/** A Pokémon "counts" for a PvP league at top-100, or for raids at top-10 in any type. */
const PVP_CUTOFF = 100;
const RAID_CUTOFF = 10;

export interface RelevanceSets {
	great: Set<string>;
	ultra: Set<string>;
	master: Set<string>;
	raid: Set<string>;
	ready: boolean;
}

const EMPTY: RelevanceSets = {
	great: new Set(),
	ultra: new Set(),
	master: new Set(),
	raid: new Set(),
	ready: false,
};

/** Species ids that are directly relevant for each league / raids. Computed once. */
export const useRelevanceSets = (): RelevanceSets => {
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

	return useMemo(() => {
		if (!pvpFetchCompleted || !raidDPSFetchCompleted) return EMPTY;
		const pvpSet = (list: Record<string, { speciesId: string; rank: number }> | undefined) => {
			const s = new Set<string>();
			for (const r of Object.values(list ?? {})) if (r.rank <= PVP_CUTOFF) s.add(r.speciesId);
			return s;
		};
		const raid = new Set<string>();
		for (const list of Object.values(raidDPS)) {
			for (const e of Object.values(list)) if (e.rank <= RAID_CUTOFF) raid.add(e.speciesId);
		}
		return {
			great: pvpSet(rankLists[0]),
			ultra: pvpSet(rankLists[1]),
			master: pvpSet(rankLists[2]),
			raid,
			ready: true,
		};
	}, [rankLists, raidDPS, pvpFetchCompleted, raidDPSFetchCompleted]);
};

/**
 * Which leagues a Pokémon is relevant for — directly, or through any member of
 * its evolution line (megas included for the raid check).
 */
export const useLeagueBadges = (
	pokemon: IGamemasterPokemon | undefined,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
): Array<LeagueKey> => {
	const sets = useRelevanceSets();
	return useMemo(() => {
		if (!pokemon || !sets.ready) return [];
		const family = Array.from(
			fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)
		).map((m) => m.speciesId);
		const hits = (set: Set<string>) => family.some((id) => set.has(id));
		const out: Array<LeagueKey> = [];
		if (hits(sets.great)) out.push('great');
		if (hits(sets.ultra)) out.push('ultra');
		if (hits(sets.master)) out.push('master');
		if (hits(sets.raid)) out.push('raid');
		return out;
	}, [pokemon, gamemasterPokemon, sets]);
};
