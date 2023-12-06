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
    Language,
    GameLanguage,
    LastLeague
}

// avoids collision with other website's cache.
const wrapperString = "go!";

export const wrapStorageKey = (key: string) => `${wrapperString}${key}${wrapperString}`;

export const readSessionValue = (key: ConfigKeys) => {
    return sessionStorage.getItem(wrapStorageKey(key.toString()));
}

export const readPersistentValue = (key: ConfigKeys) => {
    return localStorage.getItem(wrapStorageKey(key.toString()));
}

export const writeSessionValue = (key: ConfigKeys, value: string) => {
    sessionStorage.setItem(wrapStorageKey(key.toString()), value);
}

export const writePersistentValue = (key: ConfigKeys, value: string) => {
    localStorage.setItem(wrapStorageKey(key.toString()), value);
}

export const writePersistentCostumKeyValue = (customKey: string, value: string) => {
    localStorage.setItem(wrapStorageKey(customKey), value);
}

export const readPersistentCostumKeyValue = (customKey: string) => {
    return localStorage.getItem(wrapStorageKey(customKey));
}