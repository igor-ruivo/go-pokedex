import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { IPostEntry } from '../DTOs/INews';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import type { GameLanguage } from './language-context';
import type { ILeekduckSpotlightHour } from './raid-bosses-context';
import { useCalendar } from './raid-bosses-context';

interface NotificationsContextType {
	unseenEvents: number;
	seenEvents: Set<string>;
	updateSeenEvents: (newEvents: Array<string>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = (): NotificationsContextType => {
	const context = useContext(NotificationsContext);
	if (!context) {
		throw new Error('useNotifications must be used within a NotificationsProvider');
	}
	return context;
};

export const NotificationsProvider = (props: React.PropsWithChildren<object>) => {
	const getDefaultSeenEvents = useCallback((): Set<string> => {
		const cachedSeenEvents = readPersistentValue(ConfigKeys.SeenEvents);
		if (!cachedSeenEvents) {
			return new Set();
		}

		const parsed: unknown = JSON.parse(cachedSeenEvents);
		if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
			return new Set<string>(parsed);
		}
		return new Set<string>();
	}, []);

	const [seenEvents, setSeenEvents] = useState(getDefaultSeenEvents());
	const { posts, spotlightHours, postsFetchCompleted, spotlightHoursFetchCompleted, season, seasonFetchCompleted } =
		useCalendar();

	const mapToPostEntry = (spotlight: ILeekduckSpotlightHour): IPostEntry => {
		return {
			id: spotlight.rawUrl,
			url: spotlight.rawUrl,
			title: spotlight.title,
			subtitle: spotlight.title,
			startDate: spotlight.date,
			endDate: spotlight.dateEnd,
			dateRanges: [{ start: spotlight.date, end: spotlight.dateEnd }],
			imageUrl: spotlight.imgUrl,
			wild: spotlight.pokemons,
			raids: [],
			eggs: [],
			researches: [],
			incenses: [],
			lures: [],
			bonuses: Object.fromEntries(Object.entries(spotlight.bonus).map(([k, v]) => [k, [v]])) as Record<
				GameLanguage,
				Array<string>
			>,
			isSpotlight: true,
		};
	};

	const currentEventIds = useMemo(
		() =>
			postsFetchCompleted && posts && season && seasonFetchCompleted && spotlightHoursFetchCompleted
				? [
						...[...posts, season, ...spotlightHours.map(mapToPostEntry)].filter(
							(p) =>
								p &&
								((p.wild?.length ?? 0) > 0 ||
									(p.raids?.length ?? 0) > 0 ||
									p.bonuses.en.length > 0 ||
									(p.researches?.length ?? 0) > 0) &&
								new Date(p.endDate ?? 0) >= new Date()
						),
					].map((p) => p.id)
				: [],
		[posts, postsFetchCompleted, season, seasonFetchCompleted, spotlightHours, spotlightHoursFetchCompleted]
	);

	const unseenEvents = useMemo(
		() => currentEventIds.filter((e) => !seenEvents.has(e)).length,
		[currentEventIds, seenEvents]
	);

	const updateSeenEvents = useCallback(
		(newEvents: Array<string>) => {
			setSeenEvents((currentSeenEvents) => {
				const set = new Set([...Array.from(currentSeenEvents), ...newEvents]);
				const newVal = Array.from(set);
				writePersistentValue(ConfigKeys.SeenEvents, JSON.stringify(newVal));
				return set;
			});
		},
		[setSeenEvents]
	);

	return (
		<NotificationsContext.Provider value={{ seenEvents, unseenEvents, updateSeenEvents }}>
			{props.children}
		</NotificationsContext.Provider>
	);
};
