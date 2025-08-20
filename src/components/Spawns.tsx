import './ReusableAdorners.scss';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import { useLanguage } from '../contexts/language-context';
import { usePokemon } from '../contexts/pokemon-context';
import { useCalendar } from '../contexts/raid-bosses-context';
import type { IPostEntry } from '../DTOs/INews';
import { sortPosts } from '../DTOs/INews';
import { getCurrentUTCTimestamp, inCamelCase, localeStringSmallestOptions } from '../utils/Misc';
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';
import translator, { TranslatorKeys } from '../utils/Translator';
import LoadingRenderer from './LoadingRenderer';
import PokemonMiniature from './PokemonMiniature';
import Section from './Template/Section';

const getDateKey = (obj: IPostEntry) => String(obj?.startDate?.valueOf()) + '-' + String(obj?.endDate?.valueOf());

const Spawns = () => {
	const { gamemasterPokemon, errors, fetchCompleted } = usePokemon();
	const { currentLanguage } = useLanguage();
	const { posts, postsFetchCompleted, errorLoadingPosts, season, seasonFetchCompleted, errorLoadingSeason } =
		useCalendar();
	const currPosts = useMemo(
		() =>
			postsFetchCompleted && posts
				? posts.filter(
						(p) =>
							p &&
							(p.wild?.length ?? 0) > 0 &&
							p.endDate >= getCurrentUTCTimestamp() &&
							p.startDate < getCurrentUTCTimestamp()
					)
				: [],
		[postsFetchCompleted, posts]
	);
	const [currentBossDate, setCurrentBossDate] = useState(() => {
		const savedDate = readSessionValue(ConfigKeys.ExpandedSpawnDate);
		if (savedDate == null) {
			return currPosts.length > 0 ? 'current' : 'season';
		}
		const hasMatchingPost = posts?.some((p) => p?.wild?.length && getDateKey(p) === savedDate);
		if ((postsFetchCompleted && hasMatchingPost) || savedDate === 'current' || savedDate === 'season') {
			return savedDate;
		}
		return currPosts.length > 0 ? 'current' : 'season';
	});
	const [currentPlace, setCurrentPlace] = useState(readSessionValue(ConfigKeys.ExpandedArea) ?? '0');

	type RaidEventDateOption = { label: string; value: string };

	const raidEventDates: Array<RaidEventDateOption> = useMemo(() => {
		const options: Array<RaidEventDateOption> = [];

		if (currPosts.length > 0) {
			options.push({
				label: translator(TranslatorKeys.Current, currentLanguage),
				value: 'current',
			});
		}

		options.push({
			label: translator(TranslatorKeys.Season, currentLanguage),
			value: 'season',
		});

		if (posts) {
			const futurePosts = posts
				.filter(
					(p): p is IPostEntry =>
						!!p &&
						(p.wild?.length ?? 0) > 0 &&
						p.endDate >= getCurrentUTCTimestamp() &&
						p.startDate > getCurrentUTCTimestamp()
				)
				.sort(sortPosts)
				.map(
					(e): RaidEventDateOption => ({
						label: inCamelCase(new Date(e.startDate).toLocaleString(undefined, localeStringSmallestOptions)),
						value: getDateKey(e),
					})
				);

			options.push(...futurePosts);
		}

		return options;
	}, [currPosts, currentLanguage, posts]);

	const selectedPosts = useMemo(
		() =>
			currentBossDate === 'season' && seasonFetchCompleted && season
				? [season]
				: currentBossDate === 'current'
					? currPosts
					: (posts ?? []).filter((p) => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === currentBossDate),
		[currentBossDate, season, currPosts, posts, seasonFetchCompleted]
	);

	useEffect(() => {
		if (postsFetchCompleted && seasonFetchCompleted && currPosts.length > 0) {
			const expandedSpawnDate = readSessionValue(ConfigKeys.ExpandedSpawnDate);
			let newDate: string;
			if (expandedSpawnDate === null) {
				newDate = currPosts.length > 0 ? 'current' : 'season';
			} else if (
				(posts &&
					postsFetchCompleted &&
					posts.some((p) => p && (p.wild?.length ?? 0) > 0 && getDateKey(p) === expandedSpawnDate)) ||
				expandedSpawnDate === 'current' ||
				expandedSpawnDate === 'season'
			) {
				newDate = expandedSpawnDate;
			} else {
				newDate = currPosts.length > 0 ? 'current' : 'season';
			}
			setCurrentBossDate(newDate);
		}
	}, [currPosts, setCurrentBossDate, postsFetchCompleted, seasonFetchCompleted, posts]);

	const idxToPlace = useCallback(
		(idx: number) => {
			switch (idx) {
				case 0:
					return translator(TranslatorKeys.Cities, currentLanguage);
				case 1:
					return translator(TranslatorKeys.Forests, currentLanguage);
				case 2:
					return translator(TranslatorKeys.Mountains, currentLanguage);
				case 3:
					return translator(TranslatorKeys.Beaches, currentLanguage);
				case 4:
					return translator(TranslatorKeys.Northen, currentLanguage);
				case 5:
					return translator(TranslatorKeys.Southern, currentLanguage);
			}
		},
		[currentLanguage]
	);

	const idxToRes = useCallback((idx: number) => {
		switch (idx) {
			case 0:
				return 'city';
			case 1:
				return 'forest';
			case 2:
				return 'mountain';
			case 3:
				return 'water';
			case 4:
				return 'north';
			case 5:
				return 'south';
		}
	}, []);

	return (
		<LoadingRenderer
			errors={errorLoadingPosts + errors + errorLoadingSeason}
			completed={postsFetchCompleted && seasonFetchCompleted && fetchCompleted && !!season}
		>
			{() => (
				<>
					<div className='boss-header-filters with-margin-top with-margin-bottom'>
						<div className='raid-date-element'>
							<Select
								className={`navbar-dropdown-family`}
								isSearchable={false}
								value={raidEventDates.find((o) => o?.value === currentBossDate) ?? null}
								options={raidEventDates}
								onChange={(e) => {
									if (e?.value) {
										setCurrentBossDate(e.value);
										writeSessionValue(ConfigKeys.ExpandedSpawnDate, e.value);
									}
								}}
								formatOptionLabel={(data) =>
									data ? (
										<div className='hint-container'>
											<div className='img-padding'>
												<img
													className='invert-dark-mode'
													src={`/images/calendar.png`}
													alt='calendar'
													style={{ width: 'auto' }}
													height={16}
													width={16}
												/>
											</div>
											<strong className='aligned-block ellipsed normal-text'>{data.label}</strong>
										</div>
									) : null
								}
							/>
						</div>
					</div>
					<Section title={translator(TranslatorKeys.FeaturedSpawns, currentLanguage)}>
						<div>
							{currentBossDate === 'season' && (
								<div className='raid-container'>
									<div className='overflowing'>
										<div className='img-family'>
											{[
												season.wild.filter((e) => e.kind === '0'),
												season.wild.filter((e) => e.kind === '1'),
												season.wild.filter((e) => e.kind === '2'),
												season.wild.filter((e) => e.kind === '3'),
												season.wild.filter((e) => e.kind === '4'),
												season.wild.filter((e) => e.kind === '5'),
											].map((t, i) => (
												<div
													className='clickable selectable'
													key={i}
													role='button'
													tabIndex={0}
													onClick={() => {
														setCurrentPlace(String(i));
														writeSessionValue(ConfigKeys.ExpandedArea, String(i));
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															setCurrentPlace(String(i));
															writeSessionValue(ConfigKeys.ExpandedArea, String(i));
														}
													}}
													aria-pressed={String(i) === currentPlace}
												>
													<strong
														className={`small-move-detail ${String(i) === currentPlace ? 'soft' : 'baby-soft'} smallish-padding normal-text item ${String(i) === currentPlace ? 'small-extra-padding-right' : ''}`}
													>
														<div className='img-padding'>
															<img
																className='invert-light-mode'
																height={22}
																width={22}
																alt='type'
																src={`/images/${idxToRes(i)}.png`}
															/>
														</div>
														{String(i) === currentPlace && idxToPlace(i)}
													</strong>
												</div>
											))}
										</div>
									</div>
								</div>
							)}
							<div className={`with-flex contained ${currentBossDate !== 'season' ? 'with-margin-top' : ''}`}>
								{selectedPosts.sort(sortPosts).map((t) =>
									t?.wild
										.filter((r) => currentBossDate !== 'season' || r.kind === currentPlace)
										.map((p) => (
											<div key={p.speciesId + p.kind} className='mini-card-wrapper-padding dynamic-size'>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
												</div>
											</div>
										))
								)}
							</div>
						</div>
					</Section>
				</>
			)}
		</LoadingRenderer>
	);
};

export default Spawns;
