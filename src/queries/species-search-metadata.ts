import { useQuery } from '@tanstack/react-query';

import type { ISpeciesSearchMetadata } from '../DTOs/ISpeciesSearchMetadata';
import { speciesSearchMetadataUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

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
 * Deliberately NOT added to `PERSISTED_QUERY_KEY_PREFIXES` (query-client.ts)
 * — this is a multi-MB payload most sessions never even touch (it only
 * matters for the Search Strings tab and Mass Delete), so it stays
 * in-memory-only for the session and simply re-fetches from the network on
 * reload, the same way the (also multi-MB) PvP/raid-DPS queries already do.
 * No `staleTime`/`gcTime` override here either — the `QueryClient` defaults
 * (`query-client.ts`) already give it a full day of freshness and a week of
 * in-memory retention, same as every other unpersisted reference dataset.
 */
export const useSpeciesSearchMetadata = (): SpeciesSearchMetadataData => {
	const { data, isSuccess, isError, error } = useQuery({
		queryKey: speciesSearchMetadataQueryKey,
		queryFn: ({ signal }) => fetchJson<Record<string, ISpeciesSearchMetadata>>(speciesSearchMetadataUrl, signal),
	});

	return {
		speciesSearchMetadata: data ?? EMPTY,
		fetchCompleted: isSuccess || isError,
		errors: error ? String(error) : '',
	};
};
