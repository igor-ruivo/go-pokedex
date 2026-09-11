import { createContext, useCallback, useContext, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

interface SeenEventsContextType {
	seenIds: ReadonlySet<string>;
	/** Marks an event id as opened on this device — idempotent, persisted. */
	markSeen: (id: string) => void;
}

const SeenEventsContext = createContext<SeenEventsContextType | undefined>(undefined);

export const useSeenEvents = (): SeenEventsContextType => {
	const context = useContext(SeenEventsContext);
	if (!context) {
		throw new Error('useSeenEvents must be used within a SeenEventsProvider');
	}
	return context;
};

const readSeenIds = (): Set<string> => {
	const raw = readPersistentValue(ConfigKeys.SeenEvents);
	if (!raw) return new Set();
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
	} catch {
		return new Set();
	}
};

/**
 * Which events (by id) this device has expanded at least once — a Context,
 * not a plain hook reading localStorage directly, because it needs to be
 * *reactive* across two unrelated parts of the tree: EventsTab (which marks
 * an event seen when you open it) and Shell's bottom nav (which shows an
 * unseen-count badge on the Calendar icon) aren't parent/child, so a shared
 * state slice is the only way opening an event updates the badge instantly
 * instead of only after a reload.
 */
export const SeenEventsProvider = (props: React.PropsWithChildren<object>) => {
	const [seenIds, setSeenIds] = useState<Set<string>>(readSeenIds);

	const markSeen = useCallback((id: string) => {
		setSeenIds((prev) => {
			if (prev.has(id)) return prev;
			const next = new Set(prev);
			next.add(id);
			writePersistentValue(ConfigKeys.SeenEvents, JSON.stringify([...next]));
			return next;
		});
	}, []);

	return <SeenEventsContext.Provider value={{ seenIds, markSeen }}>{props.children}</SeenEventsContext.Provider>;
};
