import { hydrateFavorites } from '../lib/favorite-teams';
import { hydrateCollection } from '../lib/pokemon-collection';
import { initDexSnapshot } from './dex-snapshot';
import { collectGarbage } from './persistent-cache';
import { hydrateConfigs } from './persistent-configs-handler';

/**
 * Loads everything the app reads synchronously (settings, the saved collection, favorite teams) from IndexedDB into memory, and
 * settles the dex-server snapshot the page will read all its data from (dex-snapshot.ts).
 * Awaited once at startup, before the first render — see index.tsx; nothing that reads them may run earlier.
 */
export const hydrateStorage = async (): Promise<void> => {
	await Promise.all([hydrateConfigs(), hydrateCollection(), hydrateFavorites(), initDexSnapshot()]);
	// Not needed to render: once the page is up, drop the cache entries that outlived their namespace's maximum age.
	setTimeout(() => void collectGarbage(), 5000);
};
