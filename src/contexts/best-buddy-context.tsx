import { createContext, useCallback, useContext, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import { BEST_BUDDY_LEVEL, levelToLevelIndex, MAX_LEVEL } from '../utils/pokemon-helper';

interface BestBuddyContextType {
	/** Whether level 51 (Best Buddy) counts as reachable. */
	bestBuddy: boolean;
	updateBestBuddy: (next: boolean) => void;
	/** {@link MAX_LEVEL} or {@link BEST_BUDDY_LEVEL}, whichever `bestBuddy` selects. */
	maxLevel: number;
	/** {@link maxLevel} as a half-level CPM index. */
	maxLevelIndex: number;
}

const BestBuddyContext = createContext<BestBuddyContextType | undefined>(undefined);

/**
 * Whether the app treats level 51 (Best Buddy) as a reachable level — one
 * persisted, device-wide choice. Every consumer that evaluates a Pokémon
 * against a level ceiling (the IV table, trash/search strings, a Pokédex
 * square's max CP, the level picker, best-IV/percentile ranking, the raid
 * counters calculators, and the DPS/TDO/eDPS figures computed on the fly)
 * reads this same value. Pre-generated dex-server data (Rankings' PvP lists
 * and the raid-attacker type rankings) is unaffected — that data is always
 * expressed against level 50, regardless of this setting.
 */
export const useBestBuddy = (): BestBuddyContextType => {
	const context = useContext(BestBuddyContext);
	if (!context) {
		throw new Error('useBestBuddy must be used within a BestBuddyProvider');
	}
	return context;
};

export const BestBuddyProvider = (props: React.PropsWithChildren<object>) => {
	const getDefaultBestBuddy = useCallback((): boolean => readPersistentValue(ConfigKeys.BestBuddy) === 'true', []);

	const [bestBuddy, setBestBuddy] = useState(getDefaultBestBuddy);

	const updateBestBuddy = useCallback((next: boolean) => {
		writePersistentValue(ConfigKeys.BestBuddy, String(next));
		setBestBuddy(next);
	}, []);

	const maxLevel = bestBuddy ? BEST_BUDDY_LEVEL : MAX_LEVEL;
	const maxLevelIndex = levelToLevelIndex(maxLevel);

	return (
		<BestBuddyContext.Provider value={{ bestBuddy, updateBestBuddy, maxLevel, maxLevelIndex }}>
			{props.children}
		</BestBuddyContext.Provider>
	);
};
