import { createContext, useContext, useEffect } from 'react';

import type { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import type { FetchData } from '../hooks/useFetchUrls';
import { useFetchUrls } from '../hooks/useFetchUrls';
import {
	currentBossesUrl,
	currentEggsUrl,
	currentRocketsUrl,
	eventsUrl,
	seasonUrl,
	specialBossesUrl,
	spotlightHoursUrl,
} from '../utils/Configs';
import type { GameLanguage } from './language-context';

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

interface CalendarContextType {
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

const CalendarContext = createContext<CalendarContextType | undefined>(
	undefined
);

const useFetchAllData: () => [
	Array<IPostEntry>,
	IPostEntry,
	Array<ILeekduckSpecialRaidBoss>,
	Array<ILeekduckSpotlightHour>,
	Array<IEntry>,
	Array<IEntry>,
	Array<IRocketGrunt>,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	boolean,
	string,
	string,
	string,
	string,
	string,
	string,
	string,
] = () => {
	const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<
		Array<IPostEntry>
	> = useFetchUrls();
	const [
		season,
		fetchSeason,
		seasonFetchCompleted,
		errorLoadingSeason,
	]: FetchData<IPostEntry> = useFetchUrls();
	const [
		specialBosses,
		fetchSpecialBosses,
		specialBossesFetchCompleted,
		errorLoadingSpecialBosses,
	]: FetchData<Array<ILeekduckSpecialRaidBoss>> = useFetchUrls();
	const [
		spotlightHours,
		fetchSpotlightHours,
		spotlightHoursFetchCompleted,
		errorLoadingSpotlightHours,
	]: FetchData<Array<ILeekduckSpotlightHour>> = useFetchUrls();
	const [
		currentBosses,
		fetchCurrentBosses,
		currentBossesFetchCompleted,
		errorLoadingCurrentBosses,
	]: FetchData<Array<IEntry>> = useFetchUrls();
	const [
		currentEggs,
		fetchCurrentEggs,
		currentEggsFetchCompleted,
		errorLoadingCurrentEggs,
	]: FetchData<Array<IEntry>> = useFetchUrls();
	const [
		currentRockets,
		fetchCurrentRockets,
		currentRocketsFetchCompleted,
		errorLoadingCurrentRockets,
	]: FetchData<Array<IRocketGrunt>> = useFetchUrls();

	useEffect(() => {
		const controller = new AbortController();
		void fetchPosts([eventsUrl], 0, { signal: controller.signal });
		void fetchSeason([seasonUrl], 0, { signal: controller.signal });
		void fetchSpecialBosses([specialBossesUrl], 0, {
			signal: controller.signal,
		});
		void fetchSpotlightHours([spotlightHoursUrl], 0, {
			signal: controller.signal,
		});
		void fetchCurrentBosses([currentBossesUrl], 0, {
			signal: controller.signal,
		});
		void fetchCurrentEggs([currentEggsUrl], 0, { signal: controller.signal });
		void fetchCurrentRockets([currentRocketsUrl], 0, {
			signal: controller.signal,
		});

		return () => {
			controller.abort('Request canceled by cleanup.');
		};
	}, [
		fetchPosts,
		fetchSeason,
		fetchSpecialBosses,
		fetchSpotlightHours,
		fetchCurrentBosses,
		fetchCurrentEggs,
		fetchCurrentRockets,
	]);

	return [
		posts[0],
		season[0],
		specialBosses[0],
		spotlightHours[0],
		currentBosses[0],
		currentEggs[0],
		currentRockets[0],
		postsFetchCompleted,
		seasonFetchCompleted,
		specialBossesFetchCompleted,
		spotlightHoursFetchCompleted,
		currentBossesFetchCompleted,
		currentEggsFetchCompleted,
		currentRocketsFetchCompleted,
		errorLoadingPosts,
		errorLoadingSeason,
		errorLoadingSpecialBosses,
		errorLoadingSpotlightHours,
		errorLoadingCurrentBosses,
		errorLoadingCurrentEggs,
		errorLoadingCurrentRockets,
	];
};

export const useCalendar = (): CalendarContextType => {
	const context = useContext(CalendarContext);
	if (!context) {
		throw new Error('useCalendar must be used within a CalendarProvider');
	}
	return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<object>) => {
	const [
		posts,
		season,
		specialBosses,
		spotlightHours,
		currentBosses,
		currentEggs,
		currentRockets,
		postsFetchCompleted,
		seasonFetchCompleted,
		specialBossesFetchCompleted,
		spotlightHoursFetchCompleted,
		currentBossesFetchCompleted,
		currentEggsFetchCompleted,
		currentRocketsFetchCompleted,
		errorLoadingPosts,
		errorLoadingSeason,
		errorLoadingSpecialBosses,
		errorLoadingSpotlightHours,
		errorLoadingCurrentBosses,
		errorLoadingCurrentEggs,
		errorLoadingCurrentRockets,
	]: [
		Array<IPostEntry>,
		IPostEntry,
		Array<ILeekduckSpecialRaidBoss>,
		Array<ILeekduckSpotlightHour>,
		Array<IEntry>,
		Array<IEntry>,
		Array<IRocketGrunt>,
		boolean,
		boolean,
		boolean,
		boolean,
		boolean,
		boolean,
		boolean,
		string,
		string,
		string,
		string,
		string,
		string,
		string,
	] = useFetchAllData();

	return (
		<CalendarContext.Provider
			value={{
				posts,
				season,
				specialBosses,
				spotlightHours,
				currentBosses,
				currentEggs,
				currentRockets,
				postsFetchCompleted,
				seasonFetchCompleted,
				specialBossesFetchCompleted,
				spotlightHoursFetchCompleted,
				currentBossesFetchCompleted,
				currentEggsFetchCompleted,
				currentRocketsFetchCompleted,
				errorLoadingPosts,
				errorLoadingSeason,
				errorLoadingSpecialBosses,
				errorLoadingSpotlightHours,
				errorLoadingCurrentBosses,
				errorLoadingCurrentEggs,
				errorLoadingCurrentRockets,
			}}
		>
			{props.children}
		</CalendarContext.Provider>
	);
};
