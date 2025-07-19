import './Events.scss';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { GameLanguage } from '../contexts/language-context';
import { useLanguage } from '../contexts/language-context';
import { useNotifications } from '../contexts/notifications-context';
import { usePokemon } from '../contexts/pokemon-context';
import type { ILeekduckSpotlightHour } from '../contexts/raid-bosses-context';
import { useCalendar } from '../contexts/raid-bosses-context';
import type { IPostEntry } from '../DTOs/INews';
import { sortEntries, sortPosts } from '../DTOs/INews';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import {
	inCamelCase,
	localeStringMiniature,
	localeStringSmallOptions,
} from '../utils/Misc';
import {
	ConfigKeys,
	readSessionValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';
import translator, { TranslatorKeys } from '../utils/Translator';
import LoadingRenderer from './LoadingRenderer';
import PokemonImage from './PokemonImage';
import PokemonMiniature from './PokemonMiniature';
import Section from './Template/Section';

const Events = () => {
	const {
		posts,
		season,
		errorLoadingPosts,
		errorLoadingSeason,
		seasonFetchCompleted,
		postsFetchCompleted,
		spotlightHours,
		spotlightHoursFetchCompleted,
		errorLoadingSpotlightHours,
	} = useCalendar();
	const { seenEvents, updateSeenEvents } = useNotifications();
	const { currentLanguage, currentGameLanguage } = useLanguage();

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
			bonuses: Object.fromEntries(
				Object.entries(spotlight.bonus).map(([k, v]) => [k, [v]])
			) as Record<GameLanguage, Array<string>>,
			isSpotlight: true,
		};
	};

	const nonSeasonalPosts = useMemo(() => {
		const goPosts = postsFetchCompleted && posts ? posts : [];
		const spotlightPosts =
			spotlightHoursFetchCompleted && spotlightHours
				? spotlightHours.map(mapToPostEntry)
				: [];
		return [
			...[...goPosts, ...spotlightPosts]
				.filter(
					(p) =>
						p &&
						(p.wild.length > 0 ||
							p.raids.length > 0 ||
							p.bonuses[currentGameLanguage].length > 0 ||
							p.researches.length > 0 ||
							p.eggs.length > 0 ||
							p.incenses.length > 0 ||
							p.lures.length > 0) &&
						new Date(p.endDate) >= new Date()
				)
				.sort(sortPosts),
		];
	}, [
		posts,
		currentGameLanguage,
		spotlightHours,
		postsFetchCompleted,
		spotlightHoursFetchCompleted,
	]);

	const relevantPosts = useMemo(
		() => [
			...(season && seasonFetchCompleted ? [season] : []),
			...nonSeasonalPosts,
		],
		[season, seasonFetchCompleted, nonSeasonalPosts]
	);

	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
	const [selectedNews, setSelectedNews] = useState(
		(readSessionValue(ConfigKeys.ExpandedEvent) === null
			? postsFetchCompleted && posts && posts.length > 0
				? 1
				: 0
			: +readSessionValue(ConfigKeys.ExpandedEvent)!) >= relevantPosts.length
			? 0
			: readSessionValue(ConfigKeys.ExpandedEvent) === null
				? postsFetchCompleted && posts && posts.length > 0
					? 1
					: 0
				: +readSessionValue(ConfigKeys.ExpandedEvent)!
	);
	const [currentPlace, setCurrentPlace] = useState(
		readSessionValue(ConfigKeys.ExpandedArea) ?? '0'
	);
	const [currentEgg, setCurrentEgg] = useState(
		readSessionValue(ConfigKeys.ExpandedEgg) === '4'
			? '0'
			: (readSessionValue(ConfigKeys.ExpandedEgg) ?? '0')
	);

	const postId = useCallback((post: IPostEntry) => post.id, []);

	useEffect(() => {
		const currentPost = relevantPosts[selectedNews];
		if (currentPost) {
			updateSeenEvents([postId(currentPost)]);
		}
	}, [updateSeenEvents, relevantPosts, postId, selectedNews]);

	useEffect(() => {
		if (postsFetchCompleted) {
			setSelectedNews(
				readSessionValue(ConfigKeys.ExpandedEvent) === null
					? posts && posts.length > 0
						? 1
						: 0
					: +readSessionValue(ConfigKeys.ExpandedEvent)!
			);
			writeSessionValue(
				ConfigKeys.ExpandedEvent,
				readSessionValue(ConfigKeys.ExpandedEvent) === null
					? '' + (posts && posts.length > 0 ? 1 : 0)
					: readSessionValue(ConfigKeys.ExpandedEvent)!
			);
		}
	}, [postsFetchCompleted, setSelectedNews, posts]);

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

	const idxToEgg = useCallback((idx: number) => {
		switch (idx) {
			case 0:
				return '2km';
			case 1:
				return '5km';
			case 2:
				return '7km';
			case 3:
				return '10km';
			case 4:
				return '12km';
		}
	}, []);

	const idxToEggName = useCallback((idx: number) => {
		switch (idx) {
			case 0:
				return '2 km';
			case 1:
				return '5 km';
			case 2:
				return '7 km';
			case 3:
				return '10 km';
			case 4:
				return '12 km';
		}
	}, []);

	const idxToKind = useCallback((idx: number) => {
		switch (idx) {
			case 0:
				return 2;
			case 1:
				return 5;
			case 2:
				return 7;
			case 3:
				return 10;
			case 4:
				return 12;
		}
	}, []);

	// Helper for keyboard accessibility
	const handleKeyDown = (event: React.KeyboardEvent, onClick: () => void) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick();
		}
	};

	return (
		<LoadingRenderer
			errors={
				errorLoadingPosts +
				errorLoadingSeason +
				errorLoadingSpotlightHours +
				errors
			}
			completed={
				postsFetchCompleted &&
				seasonFetchCompleted &&
				spotlightHoursFetchCompleted &&
				fetchCompleted
			}
		>
			{() =>
				relevantPosts.length === 0 || !relevantPosts[selectedNews] ? (
					<span>No News!</span>
				) : (
					<div className='with-xl-gap'>
						<div className='with-dynamic-max-width auto-margin-sides'>
							<div className='raid-container item without-shadow'>
								<div className='overflowing'>
									<div className='news-gallery'>
										{relevantPosts.map((p, i) => (
											<div
												key={postId(p)}
												className={`post-miniature clickable ${!seenEvents.has(postId(p)) ? 'is-new' : ''} ${i === selectedNews ? 'news-selected' : ''} ${i === 0 ? 'season-miniature' : ''}`}
												role='button'
												tabIndex={0}
												onClick={() => {
													setSelectedNews(i);
													writeSessionValue(ConfigKeys.ExpandedEvent, '' + i);
												}}
												onKeyDown={(e) =>
													handleKeyDown(e, () => {
														setSelectedNews(i);
														writeSessionValue(ConfigKeys.ExpandedEvent, '' + i);
													})
												}
												aria-pressed={i === selectedNews}
											>
												<div className='miniature-date ellipsed'>
													{i === 0
														? translator(TranslatorKeys.Season, currentLanguage)
														: new Date(p.startDate).toLocaleString(
																undefined,
																localeStringMiniature
															)}
												</div>
												<div className={`spotlight-miniature-container`}>
													<img
														className='miniature-itself'
														alt='Miniature'
														src={p.imageUrl}
													/>
													{p.isSpotlight && (
														<PokemonImage
															pokemon={gamemasterPokemon[p.wild[0].speciesId]}
															withName={false}
															imgOnly
															withClassname='spotlighted-pokemon'
														/>
													)}
													{!seenEvents.has(postId(p)) && (
														<span className='notifications-counter heavy-weight post-notification'>
															{translator(TranslatorKeys.New, currentLanguage)}
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
						<div className='with-dynamic-max-width auto-margin-sides'>
							<div className='news-header-section item'>
								<div className='event-img-container'>
									<img
										className='event-img-itself'
										alt='Event'
										width='100%'
										height='100%'
										src={relevantPosts[selectedNews].imageUrl}
									/>
									{relevantPosts[selectedNews].isSpotlight && (
										<PokemonImage
											pokemon={
												gamemasterPokemon[
													relevantPosts[selectedNews].wild[0].speciesId
												]
											}
											withName={false}
											imgOnly
											withClassname='spotlighted-pokemon'
										/>
									)}
								</div>
								<div className={'current-news-title'}>
									{relevantPosts[selectedNews].subtitle[currentGameLanguage]
										.length > 15 ||
									relevantPosts.some(
										(r) =>
											r !== relevantPosts[selectedNews] &&
											r.title[currentGameLanguage] ===
												relevantPosts[selectedNews].title[currentGameLanguage]
									)
										? relevantPosts[selectedNews].subtitle[currentGameLanguage]
										: relevantPosts[selectedNews].title[currentGameLanguage]}
								</div>
								<div className='current-news-date'>
									<div className='from-date date-container'>
										{inCamelCase(
											new Date(
												relevantPosts[selectedNews].startDate
											).toLocaleString(undefined, localeStringSmallOptions)
										)}
									</div>
									{
										<div className='from-date date-container'>
											{translator(TranslatorKeys.Until, currentLanguage)}
										</div>
									}
									<div className='to-date date-container'>
										{inCamelCase(
											new Date(
												relevantPosts[selectedNews].endDate
											).toLocaleString(undefined, localeStringSmallOptions)
										)}
									</div>
								</div>
							</div>
						</div>

						{relevantPosts[selectedNews].bonuses[currentGameLanguage].length >
							0 && (
							<Section
								title={translator(TranslatorKeys.Bonus, currentLanguage)}
							>
								<div className='with-dynamic-max-width auto-margin-sides'>
									<div className='bonus-container'>
										{relevantPosts[selectedNews].bonuses[currentGameLanguage]
											.filter((b) => b)
											.map((b, i) => (
												<span key={i + '-' + currentLanguage}>{b}</span>
											))}
									</div>
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].wild.length > 0 && (
							<Section
								title={translator(
									TranslatorKeys.FeaturedSpawns,
									currentLanguage
								)}
							>
								{selectedNews === 0 && (
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
														className='clickable'
														key={i}
														role='button'
														tabIndex={0}
														onClick={() => {
															setCurrentPlace(String(i));
															writeSessionValue(
																ConfigKeys.ExpandedArea,
																String(i)
															);
														}}
														onKeyDown={(e) =>
															handleKeyDown(e, () => {
																setCurrentPlace(String(i));
																writeSessionValue(
																	ConfigKeys.ExpandedArea,
																	String(i)
																);
															})
														}
														aria-pressed={String(i) === currentPlace}
													>
														<strong
															className={`small-move-detail ${String(i) === currentPlace ? 'soft' : 'baby-soft'} smallish-padding item ${String(i) === currentPlace ? 'small-extra-padding-right' : ''}`}
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
								<div
									className={`with-flex contained ${selectedNews !== 0 ? 'with-margin-top' : ''}`}
								>
									{relevantPosts[selectedNews].wild
										.filter(
											(k) => selectedNews !== 0 || k.kind === currentPlace
										)
										.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
										.map((p) => (
											<div
												key={p.speciesId + p.kind}
												className='mini-card-wrapper-padding dynamic-size'
											>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature
														pokemon={gamemasterPokemon[p.speciesId]}
													/>
												</div>
											</div>
										))}
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].raids.length > 0 && (
							<Section
								title={`${translator(TranslatorKeys.Featured1, currentLanguage)} ${gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)} ${translator(TranslatorKeys.Featured2, currentLanguage)}`}
							>
								<div className={`with-flex contained with-margin-top`}>
									{relevantPosts[selectedNews].raids
										.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
										.map((p) => (
											<div
												key={p.speciesId + p.kind}
												className='mini-card-wrapper-padding dynamic-size'
											>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature
														pokemon={gamemasterPokemon[p.speciesId]}
													/>
												</div>
											</div>
										))}
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].researches.length > 0 && (
							<Section
								title={translator(
									TranslatorKeys.FeaturedResearches,
									currentLanguage
								)}
							>
								<div className={`with-flex contained with-margin-top`}>
									{relevantPosts[selectedNews].researches
										.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
										.map((p) => (
											<div
												key={p.speciesId + p.kind}
												className='mini-card-wrapper-padding dynamic-size'
											>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature
														pokemon={gamemasterPokemon[p.speciesId]}
													/>
												</div>
											</div>
										))}
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].eggs.length > 0 && (
							<Section
								title={translator(TranslatorKeys.FeaturedEggs, currentLanguage)}
							>
								<div>
									{selectedNews === 0 && (
										<div className='raid-container'>
											<div className='overflowing'>
												<div className='img-family'>
													{[
														season.eggs.filter((e) => e.kind === '2'),
														season.eggs.filter((e) => e.kind === '5'),
														season.eggs.filter((e) => e.kind === '7'),
														season.eggs.filter((e) => e.kind === '10'),
													].map((t, i) => (
														<div
															className='clickable'
															key={i}
															role='button'
															tabIndex={0}
															onClick={() => {
																setCurrentEgg(String(i));
																writeSessionValue(
																	ConfigKeys.ExpandedEgg,
																	String(i)
																);
															}}
															onKeyDown={(e) =>
																handleKeyDown(e, () => {
																	setCurrentEgg(String(i));
																	writeSessionValue(
																		ConfigKeys.ExpandedEgg,
																		String(i)
																	);
																})
															}
															aria-pressed={String(i) === currentEgg}
														>
															<strong
																className={`small-move-detail ${String(i) === currentEgg ? 'soft' : 'baby-soft'} smallish-padding item ${String(i) === currentEgg ? 'small-extra-padding-right' : ''}`}
															>
																<div className='img-padding'>
																	<img
																		height={22}
																		width={22}
																		style={{ width: 'auto' }}
																		alt='type'
																		src={`/images/eggs/${idxToEgg(i)}.png`}
																	/>
																</div>
																{String(i) === currentEgg && idxToEggName(i)}
															</strong>
														</div>
													))}
												</div>
											</div>
										</div>
									)}
									<div
										className={`with-flex contained ${selectedNews !== 0 ? 'with-margin-top' : ''}`}
									>
										{relevantPosts[selectedNews].eggs
											.filter(
												(r) =>
													selectedNews !== 0 ||
													(!r.comment?.[currentGameLanguage] &&
														r.kind === String(idxToKind(+currentEgg)))
											)
											.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
											.map((p) => (
												<div
													key={p.speciesId + p.kind}
													className='mini-card-wrapper-padding dynamic-size'
												>
													<div className={`mini-card-wrapper`}>
														<PokemonMiniature
															pokemon={gamemasterPokemon[p.speciesId]}
														/>
													</div>
												</div>
											))}
									</div>
									{relevantPosts[selectedNews].eggs.some(
										(e) =>
											e.comment?.[currentGameLanguage] &&
											e.kind === String(idxToKind(+currentEgg))
									) && (
										<div className='centered-text with-xl-padding'>
											<strong>
												{
													relevantPosts[selectedNews].eggs.find(
														(e) =>
															e.kind === String(idxToKind(+currentEgg)) &&
															e.comment?.[currentGameLanguage]
													)!.comment![currentGameLanguage]
												}
												:
											</strong>
										</div>
									)}
									<div className='with-flex contained'>
										{relevantPosts[selectedNews].eggs
											.filter(
												(r) =>
													r.comment?.[currentGameLanguage] &&
													r.kind === String(idxToKind(+currentEgg))
											)
											.sort((a, b) => sortEntries(a, b, gamemasterPokemon))
											.map((p) => (
												<div
													key={p.speciesId + p.kind}
													className='mini-card-wrapper-padding dynamic-size'
												>
													<div className={`mini-card-wrapper`}>
														<PokemonMiniature
															pokemon={gamemasterPokemon[p.speciesId]}
														/>
													</div>
												</div>
											))}
									</div>
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].incenses.length > 0 && (
							<Section
								title={translator(
									TranslatorKeys.FeaturedIncenses,
									currentLanguage
								)}
							>
								<div className={`with-flex contained with-margin-top`}>
									{relevantPosts[selectedNews].incenses
										.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
										.map((p) => (
											<div
												key={p.speciesId + p.kind}
												className='mini-card-wrapper-padding dynamic-size'
											>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature
														pokemon={gamemasterPokemon[p.speciesId]}
													/>
												</div>
											</div>
										))}
								</div>
							</Section>
						)}
						{relevantPosts[selectedNews].lures.length > 0 && (
							<Section
								title={translator(
									TranslatorKeys.FeaturedLures,
									currentLanguage
								)}
							>
								<div className={`with-flex contained with-margin-top`}>
									{relevantPosts[selectedNews].lures
										.sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon))
										.map((p) => (
											<div
												key={p.speciesId + p.kind}
												className='mini-card-wrapper-padding dynamic-size'
											>
												<div className={`mini-card-wrapper`}>
													<PokemonMiniature
														pokemon={gamemasterPokemon[p.speciesId]}
													/>
												</div>
											</div>
										))}
								</div>
							</Section>
						)}
					</div>
				)
			}
		</LoadingRenderer>
	);
};

export default Events;
