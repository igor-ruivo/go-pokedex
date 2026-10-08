import { useMemo } from 'react';

import { useLanguage } from '../contexts/language-context';
import { useSeenEvents } from '../contexts/seen-events-context';
import { leekduckPosts } from '../lib/calendar-events';
import { nowAsEventTime } from '../lib/format';
import { useCalendar } from '../queries/calendar';

/**
 * How many currently-listed events (Events tab, including the season card)
 * this device hasn't opened yet — powers the notification-style badge on
 * the Calendar nav icon. Mirrors EventsTab's own "what counts as a current
 * event" filter exactly (same feed — official posts *and* Spotlight Hours,
 * folded in via the same `spotlightToPost` — same `nowAsEventTime`-based
 * cutoff), so the badge count always matches what you'd actually see if you
 * opened it.
 */
export const useUnseenEventsCount = (): number => {
	const {
		posts,
		season,
		spotlightHours,
		maxMondays,
		raidHours,
		postsFetchCompleted,
		seasonFetchCompleted,
		spotlightHoursFetchCompleted,
		maxMondaysFetchCompleted,
		raidHoursFetchCompleted,
	} = useCalendar();
	const { seenIds } = useSeenEvents();
	const { currentGameLanguage: gl } = useLanguage();

	return useMemo(() => {
		if (!postsFetchCompleted || !spotlightHoursFetchCompleted || !maxMondaysFetchCompleted || !raidHoursFetchCompleted)
			return 0;
		const now = nowAsEventTime();
		const events = [...posts, ...leekduckPosts(spotlightHours, maxMondays, raidHours)].filter(
			(p) => p && p.endDate >= now && p.availableLocales.includes(gl)
		);
		const all = seasonFetchCompleted && season ? [season, ...events] : events;
		return all.filter((p) => !seenIds.has(p.id)).length;
	}, [
		posts,
		spotlightHours,
		maxMondays,
		raidHours,
		postsFetchCompleted,
		spotlightHoursFetchCompleted,
		maxMondaysFetchCompleted,
		raidHoursFetchCompleted,
		seasonFetchCompleted,
		season,
		seenIds,
		gl,
	]);
};
