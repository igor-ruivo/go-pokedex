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
	SeenEvents,
	ExpandedEgg,
	ExpandedArea,
	ExpandedEvent,
	ExpandedRaidDate,
	ExpandedRaidTier,
	ExpandedSpawnDate,
	RaidMetric,
	RaidWeather,
	RaidPartySize,
	RaidFriendship,
	RaidMegaBoostType,
	InstallPromptDismissed,
	BestBuddy,
}

// A storage read/write can throw for reasons that have nothing to do with
// this app's own logic being wrong — the origin's quota is full (the actual
// incident this guards: the persisted query cache alone once grew past 5MB,
// and the very next unrelated write, marking an event seen, threw
// QuotaExceededError uncaught and took the whole page down with it), Safari
// private-mode blocks storage entirely, a browser extension interferes, etc.
// None of what's stored here is essential — every caller already has a
// sensible in-memory default — so failing silently and carrying on beats
// crashing the app over a lost preference, every time.
const safeStorageOp = <T>(op: () => T, fallback: T): T => {
	try {
		return op();
	} catch {
		return fallback;
	}
};

export const readSessionValue = (key: ConfigKeys) => {
	return safeStorageOp(() => sessionStorage.getItem(key.toString()), null);
};

export const readPersistentValue = (key: ConfigKeys) => {
	return safeStorageOp(() => localStorage.getItem(key.toString()), null);
};

export const writeSessionValue = (key: ConfigKeys, value: string) => {
	safeStorageOp(() => sessionStorage.setItem(key.toString(), value), undefined);
};

export const writePersistentValue = (key: ConfigKeys, value: string) => {
	safeStorageOp(() => localStorage.setItem(key.toString(), value), undefined);
};

export const writePersistentCostumKeyValue = (customKey: string, value: string) => {
	safeStorageOp(() => localStorage.setItem(customKey, value), undefined);
};

export const readPersistentCostumKeyValue = (customKey: string) => {
	return safeStorageOp(() => localStorage.getItem(customKey), null);
};
