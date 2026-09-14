import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useBestBuddy } from '../contexts/best-buddy-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import { usePokemon } from '../queries/pokemon';
import { fetchReachablePokemonIncludingSelf } from '../utils/pokemon-helper';
import type { FamilyMember } from '../workers/compute.worker';
import { getComputeWorker } from '../workers/compute-client';

interface IUseComputeIVsProps {
	pokemon: IGamemasterPokemon;
	attackIV: number;
	defenseIV: number;
	hpIV: number;
	justForSelf?: boolean;
}

const EMPTY: Record<string, IIvPercents> = {};

/**
 * Ranks the given IV spread for every evolution reachable from `pokemon` (or just
 * `pokemon` itself when `justForSelf`). The 16x16x16 x ~50-level brute force runs
 * in a Web Worker so the main thread stays responsive.
 *
 * @returns `[ivPercents keyed by speciesId, loading, isStale]` — `isStale`
 * (react-query's own `isPlaceholderData`) is true whenever the returned data
 * was computed for a *previous* set of inputs and `keepPreviousData` is
 * filling in while the real result for the current IVs/level/species is
 * still computing — e.g. right after an IV changes but before the worker's
 * new result lands. `loading` alone doesn't catch this: it's only true on
 * this query key's very first-ever computation, so it goes false immediately
 * on any later input change even though the data shown is still the old
 * input's. A caller that only cares "is there SOME data" can ignore this;
 * one that means "is this data actually for what I'm showing right now"
 * (e.g. a rank/percentile readout) needs to check it.
 */
const useComputeIVs = ({
	pokemon,
	attackIV,
	defenseIV,
	hpIV,
	justForSelf = false,
}: IUseComputeIVsProps): [Record<string, IIvPercents>, boolean, boolean] => {
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { maxLevel } = useBestBuddy();

	// Walking the family graph is cheap; only the IV ranking is worth offloading.
	const reachable = useMemo<Array<FamilyMember>>(() => {
		if (!pokemon || !fetchCompleted) {
			return [];
		}
		const members = justForSelf
			? [pokemon]
			: Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon));
		return members
			.filter((p): p is IGamemasterPokemon => !!p)
			.map((p) => ({
				speciesId: p.speciesId,
				atk: p.baseStats.atk,
				def: p.baseStats.def,
				hp: p.baseStats.hp,
				isShadow: p.isShadow,
			}));
	}, [pokemon, gamemasterPokemon, fetchCompleted, justForSelf]);

	const enabled = fetchCompleted && !!pokemon && reachable.length > 0;

	const { data, isPending, isPlaceholderData } = useQuery({
		enabled,
		queryKey: [
			'iv-percents',
			pokemon?.speciesId,
			justForSelf,
			attackIV,
			defenseIV,
			hpIV,
			maxLevel,
			reachable.map((m) => m.speciesId).join(','),
		],
		queryFn: () =>
			getComputeWorker().familyIvPercents({
				reachable,
				selfIsShadow: pokemon.isShadow,
				attackIV,
				defenseIV,
				hpIV,
				maxLevel,
			}),
		// Keep the last result on screen while a new IV spread recomputes, so
		// moving a slider updates in place instead of flashing the loader.
		placeholderData: keepPreviousData,
		// Pure function of its inputs — once computed it never goes stale.
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	// `isPending` is only true on the very first computation; slider changes keep
	// showing the previous data (isPlaceholderData) rather than dropping to a loader.
	return [data ?? EMPTY, enabled && isPending, enabled && isPlaceholderData];
};

export default useComputeIVs;
