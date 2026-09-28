import { createContext, useCallback, useContext, useDeferredValue, useMemo, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

interface VisibleLeaguesContextType {
	/** Ids of rotating/custom cups (beyond great/ultra/master, which are
	 *  always shown) the player has opted into seeing. */
	visibleExtraLeagueIds: ReadonlySet<string>;
	isExtraLeagueVisible: (id: string) => boolean;
	toggleExtraLeague: (id: string) => void;
	/** Same set, run through React 18's `useDeferredValue` — lags a render or
	 *  two behind `visibleExtraLeagueIds`/`isExtraLeagueVisible` by design.
	 *  Every EXPENSIVE per-toggle recomputation gated on which extra leagues
	 *  are visible (Rankings'/PokemonDetail's leaderboard `boardData`, Mass
	 *  Delete's per-league cutoff derivations and search-string rebuild) must
	 *  read this pair instead of the immediate one above — that's what keeps
	 *  the checkbox itself (and the persisted value `toggleExtraLeague`
	 *  writes) snappy under rapid clicking, instead of visually lagging or
	 *  seeming to "lose"/revert a click while a slow re-render from the
	 *  PREVIOUS toggle is still catching up on whichever page happens to be
	 *  open behind the picker. The checklist row's own `checked` prop (see
	 *  `LeagueVisibilityChecklist.tsx`) must keep reading the immediate
	 *  `visibleExtraLeagueIds` above, never this one — the checkbox itself
	 *  should never lag. */
	deferredVisibleExtraLeagueIds: ReadonlySet<string>;
	isExtraLeagueVisibleDeferred: (id: string) => boolean;
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

	// See this field's own doc comment on `VisibleLeaguesContextType` — deferred
	// on purpose, so a slow downstream consumer never blocks the next click.
	const deferredIds = useDeferredValue(ids);
	const isExtraLeagueVisibleDeferred = useCallback((id: string) => deferredIds.has(id), [deferredIds]);

	const value = useMemo(
		() => ({
			visibleExtraLeagueIds: ids,
			isExtraLeagueVisible,
			toggleExtraLeague,
			deferredVisibleExtraLeagueIds: deferredIds,
			isExtraLeagueVisibleDeferred,
		}),
		[ids, isExtraLeagueVisible, toggleExtraLeague, deferredIds, isExtraLeagueVisibleDeferred]
	);

	return <VisibleLeaguesContext.Provider value={value}>{props.children}</VisibleLeaguesContext.Provider>;
};
