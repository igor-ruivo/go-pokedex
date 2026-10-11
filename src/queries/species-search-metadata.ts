import { useQuery } from '@tanstack/react-query';

import type { ISpeciesSearchMetadata } from '../DTOs/ISpeciesSearchMetadata';
import { speciesSearchMetadataUrl } from '../utils/Configs';
import { fetchJsonInWorker } from '../utils/fetch-json';

interface SpeciesSearchMetadataData {
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>;
	fetchCompleted: boolean;
	errors: string;
}

const EMPTY: Record<string, ISpeciesSearchMetadata> = {};

export const speciesSearchMetadataQueryKey = ['species-search-metadata'] as const;

/**
 * dex-server's precomputed per-species search-string metadata (form
 * disambiguation identifiers, Shadow-purify IV spreads) — kept as its own
 * dataset rather than fields on `IGamemasterPokemon`, since it's a
 * derived/optional add-on for a couple of specific features (Search Strings
 * tab, Mass Delete's bulk sweeps), not part of a species' own core identity.
 *
 * There is deliberately no on-the-fly fallback anywhere downstream of this —
 * every consumer (`formIdentifierFor`/`shadowSuffixFor`/`getBestTied`/etc.)
 * trusts this data is present and correct. Callers MUST gate their own
 * rendering/queries on `fetchCompleted` (mirroring `usePokemon`'s own
 * `fetchCompleted`) instead of reading `speciesSearchMetadata` before it's
 * ready — the empty object returned before that point is only there so a
 * component doesn't crash on `undefined` while it's still deciding whether
 * to show a loading state.
 *
 * Persisted in IndexedDB like the other dex-server feeds (see `query-client.ts`): the `QueryClient` defaults give it its
 * freshness and in-memory retention.
 */
export const useSpeciesSearchMetadata = (): SpeciesSearchMetadataData => {
	const { data, isSuccess, isError, error } = useQuery({
		queryKey: speciesSearchMetadataQueryKey,
		queryFn: () => fetchJsonInWorker<Record<string, ISpeciesSearchMetadata>>(speciesSearchMetadataUrl),
	});

	return {
		speciesSearchMetadata: data ?? EMPTY,
		fetchCompleted: isSuccess || isError,
		errors: error ? String(error) : '',
	};
};
