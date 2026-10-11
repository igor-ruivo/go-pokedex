import { type Query, QueryClient } from '@tanstack/react-query';
import {
	type AsyncStorage,
	experimental_createQueryPersister,
	type PersistedQuery,
} from '@tanstack/react-query-persist-client';

import { dexSnapshotId } from './dex-snapshot';
import { CACHE_MAX_AGE_MS, deleteCache, readCache, writeCache } from './persistent-cache';

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

/**
 * Bump this whenever a cached query payload changes shape in a
 * backwards-incompatible way. It invalidates every persisted query on clients.
 */
export const QUERY_CACHE_BUSTER = 'v1';

/**
 * A persisted query is only good for the dex-server snapshot it was fetched from (dex-snapshot.ts): the buster carries it, so a
 * copy from any other snapshot is discarded when met — on top of all of them being cleared when the snapshot changes.
 * (Settled before the app is imported, so it is known here.)
 */
const cacheBuster = () => `${QUERY_CACHE_BUSTER}:${dexSnapshotId() ?? 'none'}`;

// Which queries are worth writing to disk at all: the ones that are a copy of a file somewhere else. A query that is the
// result of a computation (IV percents, carve-outs, team evaluations…) is deliberately not kept — its key does not
// carry the data it was computed from (some only a count of it), so a copy could outlive the data it was right for.
const PERSISTED_QUERY_KEY_PREFIXES = [
	'game-master',
	'moves',
	'leagues',
	'species-search-metadata',
	'pvp-ranking',
	'raid-dps',
	'team-builder',
	'team-ranking',
	'calendar',
] as const;

// Without a snapshot (see dex-snapshot.ts) nothing is kept: a copy could not be tied to what it is a copy of.
const isPersistedQuery = (query: Query): boolean =>
	dexSnapshotId() !== undefined && (PERSISTED_QUERY_KEY_PREFIXES as ReadonlyArray<unknown>).includes(query.queryKey[0]);

/** Where the persister keeps its queries: one cache entry per query (see persistent-cache.ts for the eviction). */
const queryStorage: AsyncStorage<PersistedQuery> = {
	getItem: async (key) => (await readCache<PersistedQuery>('query', key))?.value,
	setItem: (key, value) => writeCache('query', key, value),
	removeItem: (key) => deleteCache('query', key),
};

const persister = experimental_createQueryPersister<PersistedQuery>({
	storage: queryStorage,
	// entries are stored as they are (structured clones), not as JSON text
	serialize: (persistedQuery) => persistedQuery,
	deserialize: (persistedQuery) => persistedQuery,
	buster: cacheBuster(),
	maxAge: CACHE_MAX_AGE_MS.query,
	prefix: 'q',
	filters: { predicate: isPersistedQuery },
});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: DAY_IN_MS,
			// Must stay >= the persister's maxAge, otherwise restored queries
			// are garbage-collected before they can be used.
			gcTime: 7 * DAY_IN_MS,
			retry: 2,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			// Persists (and restores) the queries `isPersistedQuery` selects; a no-op for every other query.
			persister: persister.persisterFn,
		},
	},
});

// A persisted query is a file of the page's dex-server snapshot, fetched from a fixed commit: its content cannot change for as long
// as the page lives, so it is never stale. (New data arrives with a new snapshot — the next load; see dex-snapshot.ts.)
for (const prefix of PERSISTED_QUERY_KEY_PREFIXES) {
	queryClient.setQueryDefaults([prefix], { staleTime: Infinity });
}
