import { useMemo } from 'react';

import { useLanguage } from '../contexts/language-context';
import { useSeenEvents } from '../contexts/seen-events-context';
import { leekduckPosts } from '../lib/calendar-events';
import { nowAsEventTime } from '../lib/format';
import { gblEventId } from '../lib/gbl';
import { useCalendar } from '../queries/calendar';
import { useGblSeason } from '../queries/gbl';

/**
 * How many currently-listed events (Events tab, including the season card)
 * this device hasn't opened yet — powers the notification-style badge on
 * the Calendar nav icon. Mirrors EventsTab's own "what counts as a current
 * event" filter exactly (same feed — official posts *and* Spotlight Hours,
 * folded in via the same `spotlightToPost` — same `nowAsEventTime`-based
 * cutoff), so the badge count always matches what you'd actually see if you
 * opened it.
 *
 * `ready` is false until the feeds this is worked out from have loaded (the count is 0 until then, which is not an answer).
 */
export const useUnseenEvents = (): { count: number; ready: boolean } => {
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
	const { gblSeason } = useGblSeason();
	const { seenIds } = useSeenEvents();
	const { currentGameLanguage: gl } = useLanguage();

	return useMemo(() => {
		if (!postsFetchCompleted || !spotlightHoursFetchCompleted || !maxMondaysFetchCompleted || !raidHoursFetchCompleted)
			return { count: 0, ready: false };
		const now = nowAsEventTime();
		const events = [...posts, ...leekduckPosts(spotlightHours, maxMondays, raidHours)].filter(
			(p) => p && p.endDate >= now && p.availableLocales.includes(gl)
		);
		const all = seasonFetchCompleted && season ? [season, ...events] : events;
		// the GO Battle League card follows the season's, so it only counts with it
		const gblUnseen = seasonFetchCompleted && season && gblSeason && !seenIds.has(gblEventId(gblSeason)) ? 1 : 0;
		return { count: all.filter((p) => !seenIds.has(p.id)).length + gblUnseen, ready: true };
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
		gblSeason,
		seenIds,
		gl,
	]);
};

export const useUnseenEventsCount = (): number => useUnseenEvents().count;
