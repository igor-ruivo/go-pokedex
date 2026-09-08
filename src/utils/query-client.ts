import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

/**
 * Bump this whenever a cached query payload changes shape in a
 * backwards-incompatible way. It invalidates every persisted cache on clients.
 */
export const QUERY_CACHE_BUSTER = 'v1';

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
