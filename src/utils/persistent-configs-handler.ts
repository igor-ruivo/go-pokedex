// important: changing these will invalidate the consumer's browser cache.
export enum ConfigKeys {
    DefaultTheme
}

// avoids collision with other website's cache.
const wrapperString = "go!pokedex";

const wrapStorageKey = (key: ConfigKeys) => `${wrapperString}${key}${wrapperString}`;

export const readSessionValue = (key: ConfigKeys) => {
    return sessionStorage.getItem(key.toString());
}

export const readPersistentValue = (key: ConfigKeys) => {
    return localStorage.getItem(key.toString());
}

export const writeSessionValue = (key: ConfigKeys, value: string) => {
    sessionStorage.setItem(wrapStorageKey(key), value);
}

export const writePersistentValue = (key: ConfigKeys, value: string) => {
    localStorage.setItem(wrapStorageKey(key), value);
}