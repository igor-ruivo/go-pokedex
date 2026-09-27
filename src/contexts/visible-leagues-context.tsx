import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

interface VisibleLeaguesContextType {
	/** Ids of rotating/custom cups (beyond great/ultra/master, which are
	 *  always shown) the player has opted into seeing. */
	visibleExtraLeagueIds: ReadonlySet<string>;
	isExtraLeagueVisible: (id: string) => boolean;
	toggleExtraLeague: (id: string) => void;
}

const VisibleLeaguesContext = createContext<VisibleLeaguesContextType | undefined>(undefined);

const readIds = (): ReadonlySet<string> => {
	try {
		const raw = readPersistentValue(ConfigKeys.VisibleExtraLeagues);
		const parsed = raw ? (JSON.parse(raw) as unknown) : [];
		return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
	} catch {
		return new Set();
	}
};

/**
 * Which rotating/custom PvP cups (see `leagues.json` beyond the static
 * great/ultra/master three) currently show up in league pickers across the
 * app — the Rankings top bar, a Pokémon page's league tabs + leaderboard
 * filter, and Mass Delete's rank-cutoff knobs all read this same set, so
 * turning a cup off anywhere is the same as turning it off everywhere.
 * Hidden by default: a freshly-rotated-in cup doesn't clutter every picker
 * until the player opts in.
 */
export const useVisibleLeagues = (): VisibleLeaguesContextType => {
	const context = useContext(VisibleLeaguesContext);
	if (!context) {
		throw new Error('useVisibleLeagues must be used within a VisibleLeaguesProvider');
	}
	return context;
};

export const VisibleLeaguesProvider = (props: React.PropsWithChildren<object>) => {
	const [ids, setIds] = useState<ReadonlySet<string>>(readIds);

	const toggleExtraLeague = useCallback((id: string) => {
		setIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			writePersistentValue(ConfigKeys.VisibleExtraLeagues, JSON.stringify(Array.from(next)));
			return next;
		});
	}, []);

	const isExtraLeagueVisible = useCallback((id: string) => ids.has(id), [ids]);

	const value = useMemo(
		() => ({ visibleExtraLeagueIds: ids, isExtraLeagueVisible, toggleExtraLeague }),
		[ids, isExtraLeagueVisible, toggleExtraLeague]
	);

	return <VisibleLeaguesContext.Provider value={value}>{props.children}</VisibleLeaguesContext.Provider>;
};
