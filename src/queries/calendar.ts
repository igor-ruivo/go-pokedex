import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import {
	currentBossesUrl,
	currentEggsUrl,
	currentRocketsUrl,
	eventsUrl,
	seasonUrl,
	specialBossesUrl,
	spotlightHoursUrl,
} from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';
import { HOUR_IN_MS } from '../utils/query-client';

export interface ILeekduckSpotlightHour {
	title: Record<GameLanguage, string>;
	date: number;
	dateEnd: number;
	pokemons: Array<IEntry>;
	bonus: Record<GameLanguage, string>;
	imgUrl: string;
	rawUrl: string;
}

export interface ILeekduckSpecialRaidBoss {
	title: Record<GameLanguage, string>;
	date: number;
	dateEnd: number;
	raids: Array<IEntry>;
	rawUrl: string;
}

interface CalendarData {
	posts: Array<IPostEntry>;
	season: IPostEntry;
	specialBosses: Array<ILeekduckSpecialRaidBoss>;
	spotlightHours: Array<ILeekduckSpotlightHour>;
	currentBosses: Array<IEntry>;
	currentEggs: Array<IEntry>;
	currentRockets: Array<IRocketGrunt>;

	postsFetchCompleted: boolean;
	seasonFetchCompleted: boolean;
	specialBossesFetchCompleted: boolean;
	spotlightHoursFetchCompleted: boolean;
	currentBossesFetchCompleted: boolean;
	currentEggsFetchCompleted: boolean;
	currentRocketsFetchCompleted: boolean;

	errorLoadingPosts: string;
	errorLoadingSeason: string;
	errorLoadingSpecialBosses: string;
	errorLoadingSpotlightHours: string;
	errorLoadingCurrentBosses: string;
	errorLoadingCurrentEggs: string;
	errorLoadingCurrentRockets: string;
}

const EMPTY: Array<never> = [];

// Calendar data (events, current bosses, ...) is scraped hourly, so keep it fresher
// than the once-a-day game-master data.
const calendarQuery = <T>(key: string, url: string) => ({
	queryKey: ['calendar', key] as const,
	queryFn: ({ signal }: { signal: AbortSignal }) => fetchJson<T>(url, signal),
	staleTime: HOUR_IN_MS,
});

/** Everything behind the /calendar routes: events, season, raids, eggs, rocket line-ups. */
export const useCalendar = (): CalendarData => {
	const posts = useQuery(calendarQuery<Array<IPostEntry>>('events', eventsUrl));
	const season = useQuery(calendarQuery<IPostEntry>('season', seasonUrl));
	const specialBosses = useQuery(calendarQuery<Array<ILeekduckSpecialRaidBoss>>('special-bosses', specialBossesUrl));
	const spotlightHours = useQuery(calendarQuery<Array<ILeekduckSpotlightHour>>('spotlight-hours', spotlightHoursUrl));
	const currentBosses = useQuery(calendarQuery<Array<IEntry>>('current-bosses', currentBossesUrl));
	const currentEggs = useQuery(calendarQuery<Array<IEntry>>('current-eggs', currentEggsUrl));
	const currentRockets = useQuery(calendarQuery<Array<IRocketGrunt>>('current-rockets', currentRocketsUrl));

	type Q = { data: unknown; status: string; error: Error | null };
	const done = (q: Q) => q.status === 'success' || q.status === 'error';
	const err = (q: Q) => (q.error ? String(q.error) : '');

	// Depend on the stable fields (data is structurally shared by Query, status/error
	// only change on transitions) so this object keeps its identity between renders.
	return useMemo<CalendarData>(
		() => ({
			posts: posts.data ?? EMPTY,
			// May be undefined while loading; every consumer guards on seasonFetchCompleted.
			season: season.data!,
			specialBosses: specialBosses.data ?? EMPTY,
			spotlightHours: spotlightHours.data ?? EMPTY,
			currentBosses: currentBosses.data ?? EMPTY,
			currentEggs: currentEggs.data ?? EMPTY,
			currentRockets: currentRockets.data ?? EMPTY,

			postsFetchCompleted: done(posts),
			seasonFetchCompleted: done(season),
			specialBossesFetchCompleted: done(specialBosses),
			spotlightHoursFetchCompleted: done(spotlightHours),
			currentBossesFetchCompleted: done(currentBosses),
			currentEggsFetchCompleted: done(currentEggs),
			currentRocketsFetchCompleted: done(currentRockets),

			errorLoadingPosts: err(posts),
			errorLoadingSeason: err(season),
			errorLoadingSpecialBosses: err(specialBosses),
			errorLoadingSpotlightHours: err(spotlightHours),
			errorLoadingCurrentBosses: err(currentBosses),
			errorLoadingCurrentEggs: err(currentEggs),
			errorLoadingCurrentRockets: err(currentRockets),
		}),
		[
			posts.data,
			posts.status,
			posts.error,
			season.data,
			season.status,
			season.error,
			specialBosses.data,
			specialBosses.status,
			specialBosses.error,
			spotlightHours.data,
			spotlightHours.status,
			spotlightHours.error,
			currentBosses.data,
			currentBosses.status,
			currentBosses.error,
			currentEggs.data,
			currentEggs.status,
			currentEggs.error,
			currentRockets.data,
			currentRockets.status,
			currentRockets.error,
		]
	);
};
