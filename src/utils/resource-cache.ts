type LocalStorageItem<T> = {
	value: T;
	expiry: number;
};

const stringifyValue = <T>(value: LocalStorageItem<T>): string => JSON.stringify(value);

const deleteEntry = (key: string): void => {
	localStorage.removeItem(key);
};

/**
 * Writes a stringified value in the localStorage with a specific key and time to live (ttl).
 * @param key the key to be used in the localStorage.
 * @param value the value to be stringified and saved in the localStorage.
 * @param ttl the time to live, in milliseconds.
 */
export const writeEntry = <T>(key: string, value: T, ttl: number): void => {
	const item: LocalStorageItem<T> = { value, expiry: Date.now() + ttl };
	localStorage.setItem(key, stringifyValue(item));
};

/**
 * Reads and returns the value from the localStorage whose key is the specified in the parameters.
 * If the ttl has expired, it deletes the entry from the localStorage and returns null instead.
 * @param key the key to be used in the localStorage.
 * @returns null if the key wasn't found or if its ttl has expired,
 * or the original value otherwise.
 */
export const readEntry = <T>(key: string, customCacheExpirationAction?: (data: T) => void): T | null => {
	const item = localStorage.getItem(key);
	if (!item) {
		return null;
	}

	let entryObj: LocalStorageItem<T>;
	try {
		entryObj = JSON.parse(item) as LocalStorageItem<T>;
	} catch {
		deleteEntry(key);
		return null;
	}

	if (Date.now() > entryObj.expiry) {
		if (customCacheExpirationAction) {
			customCacheExpirationAction(entryObj.value);
			return entryObj.value;
		}
		deleteEntry(key);
		return null;
	}

	return entryObj.value;
};
