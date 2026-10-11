import { idbDelete, idbEntries, idbGet, idbSetMany, isQuotaError } from './idb-store';

/**
 * A cache for what can be fetched or computed again (the dex-server JSON feeds and calendar, rankings worked out in the browser,
 * the game translations). Every entry remembers when it was saved, and is kept next to a tiny "meta" record with the same date, so that
 * sweeping or evicting never has to read the values themselves (the feeds are MBs).
 *
 * Eviction, all best-effort — a cache that cannot be written is only a cache that is missing:
 *  - each namespace has a maximum age (`CACHE_MAX_AGE_MS`); `collectGarbage` drops what is older, at startup;
 *  - when the origin runs out of room, the oldest half of all the cache entries goes and the write is tried once more.
 * Saved user data (`user:`) and settings (`cfg:`) are never touched by either.
 */
const DAY = 24 * 60 * 60 * 1000;

/**
 * The longest each kind of entry is kept, read or not.
 *  - `query`: the dex-server feeds and calendar. Whether one is still the right one is not a matter of age — it is tied to the
 *    commit it was fetched from (dex-snapshot.ts), and all of them go when that changes. This only lets go of what has not been
 *    used for a week, and an entry that goes alone is simply fetched again from the same commit: still the same snapshot.
 *  - `rank`: the teams ranked from a player's own collection; the fingerprint decides if one is still right, this only
 *    lets go of leagues/cups nobody opens any more.
 *  - `translations`: the game's own text, from dex-server too.
 */
export const CACHE_MAX_AGE_MS = {
	query: 7 * DAY,
	rank: 30 * DAY,
	translations: 7 * DAY,
} as const;

export type CacheNamespace = keyof typeof CACHE_MAX_AGE_MS;

const CACHE_PREFIX = 'cache:';
const META_PREFIX = 'cachemeta:';

export interface CacheEntry<T> {
	savedAt: number;
	value: T;
}

const isCacheEntry = (value: unknown): value is CacheEntry<unknown> =>
	typeof value === 'object' && value !== null && typeof (value as CacheEntry<unknown>).savedAt === 'number';

const name = (namespace: CacheNamespace, key: string) => `${namespace}:${key}`;

export const readCache = async <T>(namespace: CacheNamespace, key: string): Promise<CacheEntry<T> | undefined> => {
	try {
		const entry = await idbGet<unknown>(CACHE_PREFIX + name(namespace, key));
		return isCacheEntry(entry) ? (entry as CacheEntry<T>) : undefined;
	} catch {
		return undefined;
	}
};

export const deleteCache = async (namespace: CacheNamespace, key: string): Promise<void> => {
	try {
		await idbDelete([CACHE_PREFIX + name(namespace, key), META_PREFIX + name(namespace, key)]);
	} catch {
		// nothing to do — it is only a cache
	}
};

/** Drops the oldest half of every cache entry (at least one). */
const evictOldest = async (): Promise<void> => {
	const metas = await idbEntries<{ savedAt?: number }>(META_PREFIX);
	const oldestFirst = metas.sort(([, a], [, b]) => (a.savedAt ?? 0) - (b.savedAt ?? 0));
	const doomed = oldestFirst.slice(0, Math.max(1, Math.ceil(oldestFirst.length / 2)));
	await idbDelete(doomed.flatMap(([metaKey]) => [metaKey, CACHE_PREFIX + metaKey.slice(META_PREFIX.length)]));
};

/** Saves `value`; a failure (storage blocked, quota still exceeded after making room) just means no cache. */
export const writeCache = async (namespace: CacheNamespace, key: string, value: unknown): Promise<void> => {
	const savedAt = Date.now();
	const write = () =>
		idbSetMany([
			[CACHE_PREFIX + name(namespace, key), { savedAt, value }],
			[META_PREFIX + name(namespace, key), { savedAt }],
		]);
	try {
		await write();
	} catch (error) {
		if (!isQuotaError(error)) return;
		try {
			await evictOldest();
			await write();
		} catch {
			// still no room — no cache this time
		}
	}
};

/** Deletes every cache entry past its namespace's maximum age. Reads only the meta records. */
export const collectGarbage = async (now = Date.now()): Promise<void> => {
	try {
		const metas = await idbEntries<{ savedAt?: number }>(META_PREFIX);
		const doomed = metas.filter(([metaKey, meta]) => {
			const namespace = metaKey.slice(META_PREFIX.length).split(':', 1)[0] ?? '';
			// a namespace this build no longer knows (an older/newer version's) gets a generous default
			const maxAge = (CACHE_MAX_AGE_MS as Record<string, number | undefined>)[namespace] ?? 30 * DAY;
			return now - (meta.savedAt ?? 0) > maxAge;
		});
		if (doomed.length > 0) {
			await idbDelete(doomed.flatMap(([metaKey]) => [metaKey, CACHE_PREFIX + metaKey.slice(META_PREFIX.length)]));
		}
	} catch {
		// the next start sweeps again
	}
};

/** Drops every entry of the given namespaces, at once. */
export const clearCacheNamespaces = async (namespaces: ReadonlyArray<CacheNamespace>): Promise<void> => {
	try {
		const metas = await idbEntries<unknown>(META_PREFIX);
		const doomed = metas
			.map(([metaKey]) => metaKey)
			.filter((metaKey) => namespaces.some((namespace) => metaKey.startsWith(`${META_PREFIX}${namespace}:`)));
		if (doomed.length > 0)
			await idbDelete(doomed.flatMap((metaKey) => [metaKey, CACHE_PREFIX + metaKey.slice(META_PREFIX.length)]));
	} catch {
		// nothing to do — and nothing stale can be read anyway: every copy is also tied to its snapshot
	}
};
