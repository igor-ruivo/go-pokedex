import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SingleValue } from 'react-select';
import Select from 'react-select';

import {
	GameLanguage,
	Language,
	useLanguage,
} from '../contexts/language-context';
import { usePokemon } from '../contexts/pokemon-context';
import type { ILeekduckSpecialRaidBoss } from '../contexts/raid-bosses-context';
import { useCalendar } from '../contexts/raid-bosses-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import { sortEntries, sortPosts } from '../DTOs/INews';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { inCamelCase, localeStringSmallestOptions } from '../utils/Misc';
import {
	ConfigKeys,
	readSessionValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';
import translator, { TranslatorKeys } from '../utils/Translator';
import LoadingRenderer from './LoadingRenderer';
import PokemonMiniature from './PokemonMiniature';
import Section from './Template/Section';

type RaidEventDateOption = {
	label: string;
	value: string;
};

const Raids = () => {
	const { currentLanguage, currentGameLanguage } = useLanguage();

	const {
		posts,
		currentBosses,
		specialBosses,
		postsFetchCompleted,
		currentBossesFetchCompleted,
		specialBossesFetchCompleted,
		errorLoadingPosts,
		errorLoadingCurrentBosses,
		errorLoadingSpecialBosses,
	} = useCalendar();
	const { gamemasterPokemon, errors, fetchCompleted } = usePokemon();

	const mapToPostEntry = (special: ILeekduckSpecialRaidBoss): IPostEntry => {
		return {
			id: special.rawUrl,
			url: special.rawUrl,
			title: special.title,
			subtitle: special.title,
			startDate: special.date,
			endDate: special.dateEnd,
			dateRanges: [{ start: special.date, end: special.dateEnd }],
			imageUrl: '',
			wild: [],
			raids: special.raids,
			eggs: [],
			researches: [],
			incenses: [],
			lures: [],
			bonuses: Object.keys(GameLanguage).reduce(
				(acc, key) => {
					acc[key as keyof typeof GameLanguage] = [];
					return acc;
				},
				{} as Record<GameLanguage, Array<string>>
			),
		};
	};

	const reducedLeekPosts = useMemo<Array<IPostEntry>>(
		() =>
			specialBossesFetchCompleted && specialBosses
				? specialBosses
						.map(mapToPostEntry)
						.filter(
							(p) =>
								(p.raids?.length ?? 0) > 0 &&
								new Date(p.endDate ?? 0) >= new Date()
						)
				: [],
		[specialBossesFetchCompleted, specialBosses]
	);
	const reducedRaids = useMemo<Array<IPostEntry>>(
		() =>
			postsFetchCompleted && posts
				? posts.filter(
						(p) =>
							p &&
							(p.raids?.length ?? 0) > 0 &&
							new Date(p.endDate ?? 0) >= new Date()
					)
				: [],
		[postsFetchCompleted, posts]
	);

	const getDateKey = useCallback((obj: IPostEntry) => {
		const d = new Date(obj?.startDate ?? 0);
		return `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}`;
	}, []);

	const additionalBosses = useMemo<Array<IPostEntry>>(() => {
		const allEntries: Array<IPostEntry> = [
			...reducedLeekPosts,
			...reducedRaids,
		];
		const acc: Record<string, IPostEntry> = {};
		for (const obj of allEntries) {
			const key = getDateKey(obj);
			if (acc[key]) {
				const mergedRaids = [...(acc[key].raids ?? []), ...(obj.raids ?? [])];
				acc[key].raids = mergedRaids.filter(
					(raid, index, self) =>
						index === self.findIndex((r) => r.speciesId === raid.speciesId)
				);
			} else {
				acc[key] = {
					id: obj.id,
					url: obj.url,
					subtitle: obj.subtitle,
					dateRanges: obj.dateRanges,
					wild: obj.wild,
					researches: obj.researches,
					eggs: obj.eggs,
					lures: obj.lures,
					incenses: obj.incenses,
					bonuses: obj.bonuses,
					title: obj.title,
					imageUrl: obj.imageUrl,
					startDate: obj.startDate,
					endDate: obj.endDate,
					raids: obj.raids,
				};
			}
		}
		return Object.values(acc).map(
			(value): IPostEntry => ({
				title: value.title,
				imageUrl: value.imageUrl,
				startDate: value.startDate,
				endDate: value.endDate,
				raids: value.raids,
				id: value.id,
				url: value.url,
				subtitle: value.subtitle,
				dateRanges: value.dateRanges,
				wild: value.wild,
				researches: value.researches,
				eggs: value.eggs,
				lures: value.lures,
				incenses: value.incenses,
				bonuses: value.bonuses,
			})
		);
	}, [reducedLeekPosts, reducedRaids, getDateKey]);

	const remainingBosses = useMemo<Array<IPostEntry>>(
		() =>
			additionalBosses
				.filter(
					(e) =>
						(e.raids?.length ?? 0) > 0 && e.startDate > new Date().valueOf()
				)
				.sort(sortPosts),
		[additionalBosses]
	);

	const generateTodayBosses = useCallback(
		(entries: Array<IPostEntry>): Array<IEntry> => {
			if (
				!currentBossesFetchCompleted ||
				!specialBossesFetchCompleted ||
				!postsFetchCompleted
			) {
				return [];
			}

			const seenIds = new Set<string>(
				[...(currentBosses ?? [])].map((e) => e.speciesId)
			);
			const response: Array<IEntry> = [...(currentBosses ?? [])];

			const now = new Date();

			for (const entry of entries) {
				const dateEntryStart = new Date(entry.startDate);
				const dateEntryEnd = new Date(entry.endDate ?? 0);

				if (!(now >= dateEntryStart && now < dateEntryEnd)) {
					continue;
				}

				if (!entry.raids) {
					continue;
				}

				for (const p of entry.raids) {
					if (seenIds.has(p.speciesId)) {
						continue;
					}

					seenIds.add(p.speciesId);

					response.push({
						speciesId: p.speciesId,
						shiny: p.shiny,
						kind: p.kind,
					});
				}
			}

			return response.sort((a, b) => sortEntries(a, b, gamemasterPokemon));
		},
		[
			postsFetchCompleted,
			gamemasterPokemon,
			currentBosses,
			currentBossesFetchCompleted,
			specialBossesFetchCompleted,
		]
	);

	const raidEventDates = useMemo<Array<RaidEventDateOption>>(
		() => [
			{
				label: translator(TranslatorKeys.Current, currentLanguage),
				value: 'current',
			},
			...remainingBosses.map((e) => ({
				label: inCamelCase(
					new Date(e.startDate).toLocaleString(
						undefined,
						localeStringSmallestOptions
					)
				),
				value: getDateKey(e),
			})),
		],
		[currentLanguage, getDateKey, remainingBosses]
	);

	const initialBossDate = raidEventDates.some(
		(f) =>
			f.value === (readSessionValue(ConfigKeys.ExpandedRaidDate) ?? 'current')
	)
		? (readSessionValue(ConfigKeys.ExpandedRaidDate)! ?? 'current')
		: 'current';

	const [currentBossDate, setCurrentBossDate] =
		useState<string>(initialBossDate);

	const bossesAvailable = useMemo<Array<IEntry>>(
		() =>
			(currentBossDate === 'current'
				? generateTodayBosses(additionalBosses)
				: (additionalBosses.find((a) => getDateKey(a) === currentBossDate)
						?.raids ?? [])
			).sort((a, b) => sortEntries(a, b, gamemasterPokemon)),
		[
			currentBossDate,
			additionalBosses,
			generateTodayBosses,
			getDateKey,
			gamemasterPokemon,
		]
	);

	type RaidEventEggOption = {
		label: string;
		value: string;
	};

	const raidEventEggs = useMemo<Array<RaidEventEggOption>>(() => {
		const eggs: Array<RaidEventEggOption> = [];
		if (bossesAvailable.some((a) => a.kind === '1')) {
			eggs.push({
				label: translator(TranslatorKeys.Tier, currentLanguage) + ' 1',
				value: '0',
			});
		}
		if (bossesAvailable.some((a) => a.kind === '3')) {
			eggs.push({
				label: translator(TranslatorKeys.Tier, currentLanguage) + ' 3',
				value: '1',
			});
		}
		if (bossesAvailable.some((a) => a.kind === '5' || a.kind === 'mega')) {
			eggs.push({
				label: translator(TranslatorKeys.SpecialBosses, currentLanguage),
				value: '2',
			});
		}
		eggs.push({
			label: translator(TranslatorKeys.AllTiers, currentLanguage),
			value: '3',
		});
		return eggs;
	}, [bossesAvailable, currentLanguage]);

	const firstRelevantEntryTierForDate = useMemo<string>(
		() =>
			raidEventEggs.find((k) => k.value === '3')?.value ??
			raidEventEggs[0]?.value ??
			'',
		[raidEventEggs]
	);

	const initialTierValue = (() => {
		const sessionValue = readSessionValue(ConfigKeys.ExpandedRaidTier);
		if (sessionValue === null) {
			return firstRelevantEntryTierForDate;
		}
		if (raidEventEggs.some((f) => f.value === sessionValue)) {
			return sessionValue;
		}
		return firstRelevantEntryTierForDate;
	})();

	const [currentTier, setCurrentTier] = useState<string>(initialTierValue);

	useEffect(() => {
		if (!raidEventEggs.some((e) => e.value === currentTier)) {
			setCurrentTier(firstRelevantEntryTierForDate);
			writeSessionValue(
				ConfigKeys.ExpandedRaidTier,
				firstRelevantEntryTierForDate
			);
		}
	}, [
		raidEventEggs,
		currentTier,
		setCurrentTier,
		firstRelevantEntryTierForDate,
	]);

	const getCountdownForBoss = useCallback(
		(speciesId: string): number | undefined =>
			[...reducedLeekPosts, ...reducedRaids]
				.sort(sortPosts)
				.find(
					(d) =>
						d.startDate <= new Date().valueOf() &&
						(d.raids ?? []).some((f) => f.speciesId === speciesId)
				)?.endDate,
		[reducedLeekPosts, reducedRaids]
	);

	const eggIdxToKind = useCallback((idx: string): Array<string> => {
		switch (idx) {
			case '0':
				return ['1'];
			case '1':
				return ['3'];
			case '2':
				return ['5', 'mega'];
			default:
				return [];
		}
	}, []);

	return (
		<LoadingRenderer
			errors={
				errorLoadingCurrentBosses +
				errorLoadingSpecialBosses +
				errorLoadingPosts +
				errors
			}
			completed={
				postsFetchCompleted &&
				currentBossesFetchCompleted &&
				specialBossesFetchCompleted &&
				fetchCompleted
			}
		>
			{() => (
				<>
					<div className='boss-header-filters with-margin-top'>
						<div className='raid-date-element'>
							<Select<RaidEventDateOption, false>
								className='navbar-dropdown-family'
								isSearchable={false}
								value={
									raidEventDates.find((o) => o.value === currentBossDate) ??
									null
								}
								options={raidEventDates}
								onChange={(e: SingleValue<RaidEventDateOption>) => {
									if (e) {
										setCurrentBossDate(e.value);
										writeSessionValue(ConfigKeys.ExpandedRaidDate, e.value);
									}
								}}
								formatOptionLabel={(data: RaidEventDateOption) => (
									<div className='hint-container'>
										<div className='img-padding'>
											<img
												alt='calendar'
												className='invert-dark-mode'
												src={`/images/calendar.png`}
												style={{ width: 'auto' }}
												height={16}
												width={16}
											/>
										</div>
										<strong className='aligned-block ellipsed normal-text'>
											{data.label}
										</strong>
									</div>
								)}
							/>
						</div>
						<div>
							<Select<RaidEventEggOption, false>
								className='navbar-dropdown-family'
								isSearchable={false}
								value={
									raidEventEggs.find((o) => o.value === currentTier) ?? null
								}
								options={raidEventEggs}
								onChange={(e: SingleValue<RaidEventEggOption>) => {
									if (e) {
										setCurrentTier(e.value);
										writeSessionValue(ConfigKeys.ExpandedRaidTier, e.value);
									}
								}}
								formatOptionLabel={(data: RaidEventEggOption) => (
									<div className='hint-container'>
										<div className='img-padding'>
											<img
												alt='egg'
												className='with-img-dropShadow'
												src={`/images/raid-eggs/${data.value}.png`}
												style={{ width: 'auto' }}
												height={22}
												width={22}
											/>
										</div>
										<strong className='aligned-block ellipsed normal-text'>
											{data.label}
										</strong>
									</div>
								)}
							/>
						</div>
					</div>
					<div className='with-xl-gap with-margin-top'>
						{raidEventEggs
							.slice()
							.sort((i1, i2) => i2.value.localeCompare(i1.value))
							.filter(
								(egg) =>
									egg.value !== '3' &&
									(egg.value === currentTier || currentTier === '3')
							)
							.map((egg) =>
								bossesAvailable.filter(
									(e) =>
										eggIdxToKind(egg.value).includes(e.kind ?? '') &&
										(egg.value === '2' ||
											!gamemasterPokemon[e.speciesId].isShadow)
								).length > 0 ? (
									<Section
										special={egg.value === '2'}
										key={egg.value}
										title={`${
											currentLanguage !== Language.English
												? gameTranslator(
														GameTranslatorKeys.Raids,
														currentGameLanguage
													)
												: ''
										} ${
											raidEventEggs.find((o) => o.value === egg.value)?.label
										} ${
											currentLanguage === Language.English
												? gameTranslator(
														GameTranslatorKeys.Raids,
														currentGameLanguage
													)
												: ''
										}`}
									>
										<div className='with-flex with-margin-top contained'>
											<div className='row-container'>
												{bossesAvailable.filter(
													(e) =>
														eggIdxToKind(egg.value).includes(e.kind ?? '') &&
														(egg.value === '2' ||
															!gamemasterPokemon[e.speciesId].isShadow)
												).length > 0 && (
													<div className='in-row round-border'>
														<div className='in-column'>
															<div className='in-row wrapped contained'>
																{bossesAvailable
																	.filter(
																		(e) =>
																			eggIdxToKind(egg.value).includes(
																				e.kind ?? ''
																			) &&
																			(egg.value === '2' ||
																				!gamemasterPokemon[e.speciesId]
																					.isShadow)
																	)
																	.sort((p1: IEntry, p2: IEntry) => {
																		if (currentBossDate !== 'current') {
																			return 0;
																		}

																		if (
																			getCountdownForBoss(p1.speciesId) &&
																			!getCountdownForBoss(p2.speciesId)
																		) {
																			return -1;
																		}

																		if (
																			getCountdownForBoss(p2.speciesId) &&
																			!getCountdownForBoss(p1.speciesId)
																		) {
																			return 1;
																		}

																		if (
																			!getCountdownForBoss(p2.speciesId) &&
																			!getCountdownForBoss(p1.speciesId)
																		) {
																			return 0;
																		}

																		return (
																			(getCountdownForBoss(p1.speciesId) ?? 0) -
																			(getCountdownForBoss(p2.speciesId) ?? 0)
																		);
																	})
																	.map((e) => (
																		<div
																			className='mini-card-wrapper-padding dynamic-size'
																			key={e.speciesId}
																		>
																			<div className={`mini-card-wrapper`}>
																				<PokemonMiniature
																					pokemon={
																						gamemasterPokemon[e.speciesId]
																					}
																					cpStringOverride=''
																					withCountdown={
																						currentBossDate === 'current'
																							? getCountdownForBoss(e.speciesId)
																							: undefined
																					}
																				/>
																			</div>
																		</div>
																	))}
															</div>
														</div>
													</div>
												)}
											</div>
										</div>
									</Section>
								) : null
							)}

						{raidEventEggs
							.slice()
							.sort((i1, i2) => i2.value.localeCompare(i1.value))
							.filter(
								(egg) =>
									egg.value !== '3' &&
									(egg.value === currentTier || currentTier === '3')
							)
							.map((egg) =>
								bossesAvailable.filter(
									(e) =>
										eggIdxToKind(egg.value).includes(e.kind ?? '') &&
										egg.value !== '2' &&
										gamemasterPokemon[e.speciesId].isShadow
								).length > 0 ? (
									<Section
										key={egg.value}
										title={`${
											currentLanguage !== Language.English
												? gameTranslator(
														GameTranslatorKeys.Raids,
														currentGameLanguage
													)
												: ''
										} ${
											raidEventEggs.find((o) => o.value === egg.value)?.label
										} ${
											currentLanguage === Language.English
												? gameTranslator(
														GameTranslatorKeys.Raids,
														currentGameLanguage
													)
												: ''
										} ${gameTranslator(
											GameTranslatorKeys.Shadow,
											currentGameLanguage
										)}`}
										darker
									>
										<div className='with-flex with-margin-top contained'>
											<div className='row-container'>
												{bossesAvailable.filter(
													(e) =>
														eggIdxToKind(egg.value).includes(e.kind ?? '') &&
														egg.value !== '2' &&
														gamemasterPokemon[e.speciesId].isShadow
												).length > 0 && (
													<div className='in-row round-border'>
														<div className='in-column'>
															<div className='in-row wrapped contained'>
																{bossesAvailable
																	.filter(
																		(e) =>
																			eggIdxToKind(egg.value).includes(
																				e.kind ?? ''
																			) &&
																			egg.value !== '2' &&
																			!getCountdownForBoss(e.speciesId) &&
																			gamemasterPokemon[e.speciesId].isShadow
																	)
																	.map((e) => (
																		<div
																			className='mini-card-wrapper-padding dynamic-size'
																			key={e.speciesId}
																		>
																			<div className={`mini-card-wrapper`}>
																				<PokemonMiniature
																					pokemon={
																						gamemasterPokemon[e.speciesId]
																					}
																					cpStringOverride=''
																					withCountdown={getCountdownForBoss(
																						e.speciesId
																					)}
																				/>
																			</div>
																		</div>
																	))}
															</div>
															<div className='in-row wrapped contained'>
																{bossesAvailable
																	.filter(
																		(e) =>
																			eggIdxToKind(egg.value).includes(
																				e.kind ?? ''
																			) &&
																			egg.value !== '2' &&
																			getCountdownForBoss(e.speciesId) &&
																			gamemasterPokemon[e.speciesId].isShadow
																	)
																	.map((e) => (
																		<div
																			className='mini-card-wrapper-padding dynamic-size'
																			key={e.speciesId}
																		>
																			<div className={`mini-card-wrapper`}>
																				<PokemonMiniature
																					pokemon={
																						gamemasterPokemon[e.speciesId]
																					}
																					cpStringOverride=''
																					withCountdown={getCountdownForBoss(
																						e.speciesId
																					)}
																				/>
																			</div>
																		</div>
																	))}
															</div>
														</div>
													</div>
												)}
											</div>
										</div>
									</Section>
								) : null
							)}
					</div>
				</>
			)}
		</LoadingRenderer>
	);
};

export default Raids;
