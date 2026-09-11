import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { defaultShouldDehydrateQuery, type Query, QueryClient } from '@tanstack/react-query';

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

/**
 * Bump this whenever a cached query payload changes shape in a
 * backwards-incompatible way. It invalidates every persisted cache on clients.
 *
 * Bumped to v2 here specifically to force-discard the *existing* oversized
 * blob on clients right away, rather than waiting for it to shrink on its
 * own the next time something in the cache changes.
 */
export const QUERY_CACHE_BUSTER = 'v2';

// Which queries are worth writing to disk at all. Everything still gets
// fetched and cached in memory for the session regardless — this only
// controls what survives a reload. The incident this fixes: the PvP
// (great/ultra/master, ~2.1MB raw) and per-type raid-DPS (all 18 types
// fetched together, ~1.4MB raw) queries alone add up to several MB, and
// persisting *all* of it pushed the single `go-pokedex-query-cache`
// localStorage key past 5MB — at which point any other, unrelated write
// (marking a calendar event seen) could throw QuotaExceededError. Only the
// small reference data everyone needs on every page (game-master, moves —
// together under 1.4MB) and the calendar feeds (well under 100KB combined)
// actually earn a place on disk; a large multi-type/multi-league query
// re-fetches fast enough from the network that persisting it isn't worth
// the disk budget it costs.
const PERSISTED_QUERY_KEY_PREFIXES = new Set(['game-master', 'moves', 'calendar']);

const shouldPersistQuery = (query: Query): boolean =>
	defaultShouldDehydrateQuery(query) && PERSISTED_QUERY_KEY_PREFIXES.has(String(query.queryKey[0]));

/** Spread into `PersistQueryClientProvider`'s `persistOptions` (see App.tsx). */
export const queryDehydrateOptions = { shouldDehydrateQuery: shouldPersistQuery };

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// The dex-server data changes at most a few times a day; treat it as
			// fresh for a day and rely on the background refetch after that.
			staleTime: DAY_IN_MS,
			// Must stay >= the persister maxAge below, otherwise restored queries
			// are garbage-collected before they can be used.
			gcTime: 7 * DAY_IN_MS,
			retry: 2,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	},
});

export const queryPersister = createSyncStoragePersister({
	storage: window.localStorage,
	key: 'go-pokedex-query-cache',
});
