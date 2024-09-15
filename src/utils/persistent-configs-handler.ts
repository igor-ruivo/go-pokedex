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
    LastLeague,
    ImageSource,
    ShowEntries,
    Shadow,
    Mega,
    TrashGreat,
    TrashUltra,
    TrashMaster,
    ExceptGreat,
    ExceptUltra,
    TrashTop,
    TrashCP,
    ShowMega,
    ShowShadow,
    ShowXL,
    Type1,
    Type2,
    TrashRaid,
    ExpandedRocket,
    SeenEvents
}

export const readSessionValue = (key: ConfigKeys) => {
    return sessionStorage.getItem(key.toString());
}

export const readPersistentValue = (key: ConfigKeys) => {
    return localStorage.getItem(key.toString());
}

export const writeSessionValue = (key: ConfigKeys, value: string) => {
    sessionStorage.setItem(key.toString(), value);
}

export const writePersistentValue = (key: ConfigKeys, value: string) => {
    localStorage.setItem(key.toString(), value);
}

export const writePersistentCostumKeyValue = (customKey: string, value: string) => {
    localStorage.setItem(customKey, value);
}

export const readPersistentCostumKeyValue = (customKey: string) => {
    return localStorage.getItem(customKey);
}