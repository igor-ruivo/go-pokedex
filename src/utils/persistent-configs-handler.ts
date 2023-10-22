// important: changing these will invalidate the consumer's browser cache.
export enum ConfigKeys {
    DefaultTheme,
    LastShownImageIndex,
    BrowserCachedImages,
    LastListType,
    SearchInputText,
    ShowFamilyTree,
    ControlPanelCollapsed,
    AttackIV,
    DefenseIV,
    HPIV,
    LevelCap,
    GridScrollY,
    TopPokemonInSearchString,
    TrashString,
    Language
}

// avoids collision with other website's cache.
const wrapperString = "go!pokedex";

const wrapStorageKey = (key: ConfigKeys) => `${wrapperString}${key.toString()}${wrapperString}`;

export const readSessionValue = (key: ConfigKeys) => {
    return sessionStorage.getItem(wrapStorageKey(key));
}

export const readPersistentValue = (key: ConfigKeys) => {
    return localStorage.getItem(wrapStorageKey(key));
}

export const writeSessionValue = (key: ConfigKeys, value: string) => {
    sessionStorage.setItem(wrapStorageKey(key), value);
}

export const writePersistentValue = (key: ConfigKeys, value: string) => {
    localStorage.setItem(wrapStorageKey(key), value);
}