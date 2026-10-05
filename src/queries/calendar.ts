import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import type { IRichBlock } from '../DTOs/IRichText';
import {
	currentBossesUrl,
	currentEggsUrl,
	currentMaxBattlesUrl,
	currentRocketsUrl,
	eventsUrl,
	maxMondaysUrl,
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

/** One Max Monday: the Dynamax Pokémon that takes over the Power Spots that Monday (the entries are the base species). */
export interface ILeekduckMaxMonday {
	title: Record<GameLanguage, string>;
	date: number;
	dateEnd: number;
	pokemons: Array<IEntry>;
	/** What a Max Monday brings (its bullet points and the asterisk footnote, from the season post), per locale. Absent in older data. */
	bonuses?: Partial<Record<GameLanguage, Array<string>>>;
	/** The same, with its formatting kept (bullet points, bold, the footnote as a note). */
	bonusBlocks?: Partial<Record<GameLanguage, Array<IRichBlock>>>;
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
	maxMondays: Array<ILeekduckMaxMonday>;
	/** The Dynamax / Gigantamax bosses of Max Battles right now: each entry's `kind` is its form, its `tier` the Max Battle tier. */
	currentMaxBattles: Array<IEntry>;
	currentBosses: Array<IEntry>;
	currentEggs: Array<IEntry>;
	currentRockets: Array<IRocketGrunt>;

	postsFetchCompleted: boolean;
	seasonFetchCompleted: boolean;
	specialBossesFetchCompleted: boolean;
	spotlightHoursFetchCompleted: boolean;
	maxMondaysFetchCompleted: boolean;
	currentMaxBattlesFetchCompleted: boolean;
	currentBossesFetchCompleted: boolean;
	currentEggsFetchCompleted: boolean;
	currentRocketsFetchCompleted: boolean;

	errorLoadingPosts: string;
	errorLoadingSeason: string;
	errorLoadingSpecialBosses: string;
	errorLoadingSpotlightHours: string;
	errorLoadingMaxMondays: string;
	errorLoadingCurrentMaxBattles: string;
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
	const maxMondays = useQuery(calendarQuery<Array<ILeekduckMaxMonday>>('max-mondays', maxMondaysUrl));
	const currentMaxBattles = useQuery(calendarQuery<Array<IEntry>>('current-max-battles', currentMaxBattlesUrl));
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
			maxMondays: maxMondays.data ?? EMPTY,
			currentMaxBattles: currentMaxBattles.data ?? EMPTY,
			currentBosses: currentBosses.data ?? EMPTY,
			currentEggs: currentEggs.data ?? EMPTY,
			currentRockets: currentRockets.data ?? EMPTY,

			postsFetchCompleted: done(posts),
			seasonFetchCompleted: done(season),
			specialBossesFetchCompleted: done(specialBosses),
			spotlightHoursFetchCompleted: done(spotlightHours),
			maxMondaysFetchCompleted: done(maxMondays),
			currentMaxBattlesFetchCompleted: done(currentMaxBattles),
			currentBossesFetchCompleted: done(currentBosses),
			currentEggsFetchCompleted: done(currentEggs),
			currentRocketsFetchCompleted: done(currentRockets),

			errorLoadingPosts: err(posts),
			errorLoadingSeason: err(season),
			errorLoadingSpecialBosses: err(specialBosses),
			errorLoadingSpotlightHours: err(spotlightHours),
			errorLoadingMaxMondays: err(maxMondays),
			errorLoadingCurrentMaxBattles: err(currentMaxBattles),
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
			maxMondays.data,
			maxMondays.status,
			maxMondays.error,
			currentMaxBattles.data,
			currentMaxBattles.status,
			currentMaxBattles.error,
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
