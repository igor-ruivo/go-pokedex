/**
 * A minimal key-value store over IndexedDB: one database, one object store, values kept as structured clones (objects, arrays,
 * strings — no `JSON.stringify` round trip). IndexedDB is native to every browser, free, and holds hundreds of MB where
 * localStorage holds ~5 MB, which is why the app's caches and saved data live here.
 *
 * Where IndexedDB is missing or refuses to open (a locked-down browser profile, a test run in Node) the same API works over a
 * plain in-memory map: nothing is kept past the page, but nothing breaks either — the same degradation the app always had
 * when storage was blocked. The memory path applies its effect synchronously (the returned promise is already settled), so
 * tests can read back what a write did.
 *
 * Key layout (prefixes keep concerns apart, and `idbEntries` reads one concern at a time):
 *   `cfg:<ConfigKeys id>`        a setting (see persistent-configs-handler)
 *   `user:<name>`                irreplaceable user data (collection, favorite teams)
 *   `cache:<ns>:<key>`           a cached copy of something that can be fetched/computed again (see persistent-cache)
 *   `cachemeta:<ns>:<key>`       that entry's age, kept apart so sweeping caches never reads the (large) values
 */
const DB_NAME = 'go-pokedex';
const STORE = 'kv';
/** A database that has not opened by now is treated as unavailable: the app must never wait forever on storage. */
const OPEN_TIMEOUT_MS = 3000;

const memory = new Map<string, unknown>();
let database: Promise<IDBDatabase | undefined> | undefined;
let persistent = false;

const openDatabase = (): Promise<IDBDatabase | undefined> => {
	database ??= new Promise((resolve) => {
		const giveUp = setTimeout(() => resolve(undefined), OPEN_TIMEOUT_MS);
		const settle = (db: IDBDatabase | undefined) => {
			clearTimeout(giveUp);
			persistent = db !== undefined;
			resolve(db);
		};
		try {
			const request = indexedDB.open(DB_NAME, 1);
			request.onupgradeneeded = () => void request.result.createObjectStore(STORE);
			request.onsuccess = () => {
				const db = request.result;
				// another tab upgrading the schema: let it, and open again on the next use
				db.onversionchange = () => {
					db.close();
					database = undefined;
				};
				settle(db);
			};
			request.onerror = () => settle(undefined);
			request.onblocked = () => settle(undefined);
		} catch {
			settle(undefined);
		}
	});
	return database;
};

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

/** Whether data written now survives the page (IndexedDB opened), as opposed to the in-memory stand-in. Settled once any op has awaited. */
export const idbIsPersistent = (): boolean => persistent;

const transact = <T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => () => T): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const transaction = db.transaction(STORE, mode);
		const read = run(transaction.objectStore(STORE));
		transaction.oncomplete = () => resolve(read());
		transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
		transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
	});

/** Runs `onMemory` right away without IndexedDB, or `onDatabase` once it opened (and `onMemory` if it did not). */
const run = <T>(onMemory: () => T, onDatabase: (db: IDBDatabase) => Promise<T>): Promise<T> => {
	if (!hasIndexedDb()) return Promise.resolve(onMemory());
	return openDatabase().then((db) => (db ? onDatabase(db) : onMemory()));
};

const prefixRange = (prefix: string) => IDBKeyRange.bound(prefix, prefix + '￿');

export const idbGet = <T>(key: string): Promise<T | undefined> =>
	run(
		() => (memory.has(key) ? (structuredClone(memory.get(key)) as T) : undefined),
		(db) =>
			transact(db, 'readonly', (store) => {
				const request = store.get(key);
				return () => request.result as T | undefined;
			})
	);

/** Writes several entries in one transaction: all of them land, or none does. */
export const idbSetMany = (entries: ReadonlyArray<readonly [key: string, value: unknown]>): Promise<void> =>
	run(
		() => {
			for (const [key, value] of entries) memory.set(key, structuredClone(value));
		},
		(db) =>
			transact(db, 'readwrite', (store) => {
				for (const [key, value] of entries) store.put(value, key);
				return () => undefined;
			})
	);

export const idbSet = (key: string, value: unknown): Promise<void> => idbSetMany([[key, value]]);

export const idbDelete = (keys: ReadonlyArray<string>): Promise<void> =>
	run(
		() => {
			for (const key of keys) memory.delete(key);
		},
		(db) =>
			transact(db, 'readwrite', (store) => {
				for (const key of keys) store.delete(key);
				return () => undefined;
			})
	);

/** Every entry whose key starts with `prefix`, as `[full key, value]`. */
export const idbEntries = <T>(prefix: string): Promise<Array<[string, T]>> =>
	run(
		() =>
			[...memory.entries()]
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, value]): [string, T] => [key, structuredClone(value) as T]),
		(db) =>
			transact(db, 'readonly', (store) => {
				const keys = store.getAllKeys(prefixRange(prefix));
				const values = store.getAll(prefixRange(prefix));
				return () => keys.result.map((key, index): [string, T] => [key as string, values.result[index] as T]);
			})
	);

/** Test seam: what the in-memory stand-in holds. */
export const __memoryEntriesForTests = (): Map<string, unknown> => memory;

/** True for the error a full origin throws on write (the name differs a little between browsers). */
export const isQuotaError = (error: unknown): boolean =>
	error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

// --- other tabs ---------------------------------------------------------------------------------------------------------
// localStorage told the other tabs when a value changed (the `storage` event); IndexedDB does not, so a tab that changed
// a record says so on a BroadcastChannel and the others read it again.

let channel: BroadcastChannel | undefined;
const watchers = new Map<string, Set<() => void>>();

const getChannel = (): BroadcastChannel | undefined => {
	if (channel === undefined && typeof BroadcastChannel !== 'undefined') {
		channel = new BroadcastChannel('go-pokedex-store');
		channel.onmessage = (event: MessageEvent<unknown>) => {
			if (typeof event.data === 'string') watchers.get(event.data)?.forEach((watcher) => watcher());
		};
		// never keep a Node process (tests) alive on account of it
		(channel as { unref?: () => void }).unref?.();
	}
	return channel;
};

/** Tells the other tabs that `key` changed. */
export const idbNotifyOtherTabs = (key: string): void => {
	getChannel()?.postMessage(key);
};

/** Calls `watcher` whenever another tab says `key` changed; returns how to stop. */
export const idbWatch = (key: string, watcher: () => void): (() => void) => {
	getChannel();
	const set = watchers.get(key) ?? new Set<() => void>();
	set.add(watcher);
	watchers.set(key, set);
	return () => void set.delete(watcher);
};

let persistenceRequested = false;
/**
 * Asks the browser not to evict this origin's data under storage pressure. Only worth doing once the user has saved something
 * (some browsers ask them to confirm), so it is called when they do, not at startup.
 */
export const requestPersistentStorage = (): void => {
	if (persistenceRequested) return;
	persistenceRequested = true;
	try {
		void navigator.storage?.persist?.().catch(() => undefined);
	} catch {
		// not supported — the data is simply evictable like any other site's
	}
};
