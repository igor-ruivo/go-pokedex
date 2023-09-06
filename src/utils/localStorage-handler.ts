type localStorageItem = {
    value: object;
    expiry: number;
};

const stringifyValue = (value: localStorageItem) => JSON.stringify(value);

const deleteEntry = (key: string) => {
    localStorage.removeItem(key);
};

/**
 * Writes a stringified object in the localStorage with a specific key and time to live (ttl).
 * @param key the key to be used in the localStorage.
 * @param value the object value to be stringified and saved in the localStorage.
 * @param ttl the time to live, in milliseconds.
 */
export const writeEntry = (key: string, value: object, ttl: number) => {
    localStorage.setItem(
        key,
        stringifyValue({ value, expiry: Date.now() + ttl })
    );
};

/**
 * Reads and returns the object from the localStorage whose key is the specified in the parameters.
 * If the ttl has expired, it deletes the entry from the localStorage and returns null instead.
 * @param key the key to be used in the localStorage.
 * @returns null if the key wasn't found or if its ttl has expired,
 * or the original object otherwise.
 */
export const readEntry = <T extends object>(key: string) => {
    const item = localStorage.getItem(key);
    if (!item) {
        return null;
    }

    const entryObj: localStorageItem = JSON.parse(item);

    if (Date.now() > entryObj.expiry) {
        deleteEntry(key);
        return null;
    }

    return entryObj.value as T;
};