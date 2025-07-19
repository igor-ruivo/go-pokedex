import './PokemonMoves.scss';

import type { KeyboardEvent, MouseEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { useLanguage } from '../contexts/language-context';
import { useMoves } from '../contexts/moves-context';
import { usePokemon } from '../contexts/pokemon-context';
import { usePvp } from '../contexts/pvp-context';
import type { DPSEntry } from '../contexts/raid-ranker-context';
import { useRaidRanker } from '../contexts/raid-ranker-context';
import type { IDetailItem } from '../DTOs/IDetailItem';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { PokemonTypes } from '../DTOs/PokemonTypes';
import { LeagueType } from '../hooks/useLeague';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import {
	calculateDamage,
	computeDPSEntry,
	Effectiveness,
	getAllChargedMoves,
	getAllFastMoves,
	translateMoveFromMoveId,
} from '../utils/pokemon-helper';
import translator, { TranslatorKeys } from '../utils/Translator';
import ListEntry from './ListEntry';
import LoadingRenderer from './LoadingRenderer';
import { translatedType } from './PokemonInfoImagePlaceholder';
import Section from './Template/Section';

interface IPokemonMoves {
	pokemon: IGamemasterPokemon;
	level: number;
	league: LeagueType;
}

const PokemonMoves = ({ pokemon, level, league }: IPokemonMoves) => {
	const { currentLanguage, currentGameLanguage } = useLanguage();
	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
	const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
	const { moves, movesFetchCompleted, movesErrors } = useMoves();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const [fastMovesCollapsed, setFastMovesCollapsed] = useState(false);
	const [chargedMovesCollapsed, setChargedMovesCollapsed] = useState(false);
	const [raidAttackType, setRaidAttackType] = useState<string>('');

	const type = useMemo(() => {
		if (!raidAttackType) {
			return undefined;
		}

		return [
			(raidAttackType.substring(0, 1).toLocaleUpperCase() +
				raidAttackType
					.substring(1)
					.toLocaleLowerCase()) as unknown as PokemonTypes,
		];
	}, [raidAttackType]);

	const isNotReady = useMemo(
		() =>
			!raidDPSFetchCompleted ||
			!fetchCompleted ||
			!pvpFetchCompleted ||
			!movesFetchCompleted ||
			!gamemasterPokemon ||
			!pokemon,
		[
			fetchCompleted,
			gamemasterPokemon,
			movesFetchCompleted,
			pokemon,
			pvpFetchCompleted,
			raidDPSFetchCompleted,
		]
	);

	const greatLeagueMoveset = useMemo(
		() => (isNotReady ? [] : (rankLists[0][pokemon.speciesId]?.moveset ?? [])),
		[isNotReady, pokemon, rankLists]
	);
	const ultraLeagueMoveset = useMemo(
		() => (isNotReady ? [] : (rankLists[1][pokemon.speciesId]?.moveset ?? [])),
		[isNotReady, pokemon, rankLists]
	);
	const masterLeagueMoveset = useMemo(
		() => (isNotReady ? [] : (rankLists[2][pokemon.speciesId]?.moveset ?? [])),
		[isNotReady, pokemon, rankLists]
	);
	const customLeagueMoveset = useMemo(
		() =>
			isNotReady
				? []
				: rankLists[3]
					? (rankLists[3][pokemon.speciesId]?.moveset ?? [])
					: [],
		[isNotReady, pokemon, rankLists]
	);

	const raidComputation = useMemo(() => {
		if (isNotReady) {
			const x: DPSEntry = {
				fastMove: '',
				chargedMove: '',
				dps: 0,
				fastMoveDmg: 0,
				chargedMoveDmg: 0,
				speciesId: pokemon?.speciesId ?? '',
				rank: 0,
			};
			return x;
		}
		return (
			raidDPS[type ? type[0].toString().toLocaleLowerCase() : ''][
				pokemon.speciesId
			] ??
			computeDPSEntry(
				pokemon,
				gamemasterPokemon,
				moves,
				15,
				100,
				raidAttackType
			)
		);
	}, [
		gamemasterPokemon,
		moves,
		pokemon,
		raidAttackType,
		raidDPS,
		type,
		isNotReady,
	]);
	const raidMoveset: [string, string] = useMemo(
		() => [raidComputation.fastMove, raidComputation.chargedMove],
		[raidComputation]
	);
	const realDps = useMemo(() => {
		if (isNotReady) {
			const x: DPSEntry = {
				fastMove: '',
				chargedMove: '',
				dps: 0,
				fastMoveDmg: 0,
				chargedMoveDmg: 0,
				speciesId: pokemon?.speciesId ?? '',
				rank: 0,
			};
			return x;
		}
		return computeDPSEntry(
			pokemon,
			gamemasterPokemon,
			moves,
			15,
			level,
			raidAttackType,
			undefined,
			raidMoveset
		);
	}, [
		gamemasterPokemon,
		level,
		moves,
		pokemon,
		raidAttackType,
		raidMoveset,
		isNotReady,
	]);

	const relevantMoveSet = useMemo(
		() =>
			league === LeagueType.GREAT_LEAGUE
				? greatLeagueMoveset
				: league === LeagueType.ULTRA_LEAGUE
					? ultraLeagueMoveset
					: league === LeagueType.CUSTOM_CUP
						? customLeagueMoveset
						: league === LeagueType.MASTER_LEAGUE
							? masterLeagueMoveset
							: raidMoveset,
		[
			customLeagueMoveset,
			greatLeagueMoveset,
			league,
			masterLeagueMoveset,
			raidMoveset,
			ultraLeagueMoveset,
		]
	);

	const isStabMove = useCallback(
		(moveId: string) =>
			pokemon.types
				.map((t) => {
					const stringVal = t.toString();
					return stringVal.toLocaleLowerCase();
				})
				.includes(moves[moveId].type.toLocaleLowerCase()),
		[moves, pokemon]
	);

	const hasBuffs = useCallback(
		(moveId: string) => league !== LeagueType.RAID && !!moves[moveId].buffs,
		[league, moves]
	);

	const movesSorter = useCallback(
		(m1: string, m2: string) => {
			const move1 = moves[m1];
			const move2 = moves[m2];

			const m1Index = relevantMoveSet.indexOf(m1);
			const m2Index = relevantMoveSet.indexOf(m2);

			const recommendedComparison =
				(m2Index !== -1 ? 1 : 0) - (m1Index !== -1 ? 1 : 0);
			if (recommendedComparison !== 0) {
				return recommendedComparison;
			}

			if (m1Index !== -1 && m2Index !== -1) {
				const indexesDraw = m2Index - m1Index;
				if (indexesDraw !== 0) {
					return indexesDraw * -1;
				}
			}

			const specialComparison = (hasBuffs(m2) ? 1 : 0) - (hasBuffs(m1) ? 1 : 0);
			if (specialComparison !== 0) {
				return specialComparison;
			}

			const eliteComparison =
				(pokemon.eliteMoves.includes(m2) ? 1 : 0) -
				(pokemon.eliteMoves.includes(m1) ? 1 : 0);
			if (eliteComparison !== 0) {
				return eliteComparison;
			}

			const legacyComparison =
				(pokemon.legacyMoves.includes(m2) ? 1 : 0) -
				(pokemon.legacyMoves.includes(m1) ? 1 : 0);
			if (legacyComparison !== 0) {
				return legacyComparison;
			}

			const stabComparison =
				(isStabMove(m2) ? 1 : 0) - (isStabMove(m1) ? 1 : 0);
			if (stabComparison !== 0) {
				return stabComparison;
			}

			const typeComparison = move1.type.localeCompare(move2.type);
			if (typeComparison !== 0) {
				return typeComparison;
			}

			return translateMoveFromMoveId(
				m1,
				moves,
				currentGameLanguage
			).localeCompare(translateMoveFromMoveId(m2, moves, currentGameLanguage));
		},
		[hasBuffs, isStabMove, currentGameLanguage, moves, pokemon, relevantMoveSet]
	);

	const computeIdAttr = useCallback(
		(moveId: string, isRecommended: boolean) =>
			`details-${moveId}-${isRecommended ? 'rec' : 'all'}`,
		[]
	);

	const detailsClickHandler = useCallback(
		(
			e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
			elementId: string
		) => {
			const details = document.getElementById(elementId) as HTMLDetailsElement;
			if (details) {
				details.open = !details.open;
				e.stopPropagation();
				e.preventDefault();
			}
		},
		[]
	);

	const renderBuffDetailItem = useCallback(
		(moveId: string, isRecommended: boolean): IDetailItem => {
			const idAttr = computeIdAttr(moveId, isRecommended);

			return {
				detailId: `${idAttr}-buff`,
				onClick: (
					event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
				) => detailsClickHandler(event, `${idAttr}-buff`),
				summary: (
					<>
						<img
							className='invert-dark-mode'
							alt='Special effects'
							loading='lazy'
							width='10'
							height='10'
							decoding='async'
							src='https://db.pokemongohub.net/vectors/magic.svg'
						/>
						{translator(TranslatorKeys.Special, currentLanguage)}
					</>
				),
				content: (
					<>
						<p>
							<strong>
								{translateMoveFromMoveId(moveId, moves, currentGameLanguage)}
							</strong>{' '}
							{translator(TranslatorKeys.Has, currentLanguage)}{' '}
							<strong>
								{moves[moveId].buffs!.buffActivationChance * 100}%{' '}
								{translator(TranslatorKeys.Chance, currentLanguage)}
							</strong>{' '}
							{translator(TranslatorKeys.To, currentLanguage)}:
						</p>
						<ul className='buff-panel-buff'>
							{(moves[moveId].buffs
								? Object.entries(moves[moveId].buffs)
								: ([] as Array<[string, number]>)
							)
								.filter(([buff]) => buff !== 'buffActivationChance')
								.map(([buff, quantity]) => (
									<li key={buff}>
										{translator(
											quantity >= 0
												? TranslatorKeys.Increase
												: TranslatorKeys.Lower,
											currentLanguage
										)}{' '}
										{translator(
											TranslatorKeys[buff as keyof typeof TranslatorKeys],
											currentLanguage
										)}{' '}
										{quantity > 0
											? ((quantity + 4) / 4 - 1) * 100 +
												'% ' +
												translator(TranslatorKeys.BaseValue, currentLanguage)
											: quantity * -1 +
												' ' +
												translator(
													quantity === -1
														? TranslatorKeys.Stage
														: TranslatorKeys.Stages,
													currentLanguage
												)}
									</li>
								))}
						</ul>
					</>
				),
			};
		},
		[
			computeIdAttr,
			currentGameLanguage,
			currentLanguage,
			detailsClickHandler,
			moves,
		]
	);

	const renderEliteDetailItem = useCallback(
		(
			moveId: string,
			isRecommended: boolean,
			isLegacy: boolean
		): IDetailItem => {
			const idAttr = computeIdAttr(moveId, isRecommended);

			return {
				detailId: `${idAttr}-${isLegacy ? 'legacy' : 'elite'}`,
				onClick: (
					event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
				) =>
					detailsClickHandler(
						event,
						`${idAttr}-${isLegacy ? 'legacy' : 'elite'}`
					),
				summary: (
					<>
						{translator(
							isLegacy ? TranslatorKeys.LegacyMove : TranslatorKeys.EliteMove,
							currentLanguage
						)}
					</>
				),
				content: (
					<>
						<p>
							{translator(
								isLegacy ? TranslatorKeys.Legacy : TranslatorKeys.Elite,
								currentLanguage
							)}{' '}
							{!isLegacy &&
								gameTranslator(GameTranslatorKeys.EliteTM, currentGameLanguage)}
							{!isLegacy && '.'}
						</p>
					</>
				),
			};
		},
		[computeIdAttr, currentGameLanguage, currentLanguage, detailsClickHandler]
	);

	const renderStabDetailItem = useCallback(
		(moveId: string, isRecommended: boolean): IDetailItem => {
			const idAttr = computeIdAttr(moveId, isRecommended);

			return {
				detailId: `${idAttr}-stab`,
				onClick: (
					event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
				) => detailsClickHandler(event, `${idAttr}-stab`),
				summary: <>STAB</>,
				content: (
					<>
						<p>
							<i>
								&quot;<b>S</b>ame <b>T</b>ype <b>A</b>ttack <b>B</b>onus&quot;
							</i>{' '}
							- {translator(TranslatorKeys.STAB, currentLanguage)}
						</p>
					</>
				),
			};
		},
		[computeIdAttr, currentLanguage, detailsClickHandler]
	);

	const renderDetails = useCallback(
		(moveId: string, isRecommended: boolean) => {
			const details: Array<IDetailItem> = [];

			if (hasBuffs(moveId)) {
				details.push(renderBuffDetailItem(moveId, isRecommended));
			}

			if (pokemon.eliteMoves.includes(moveId)) {
				details.push(renderEliteDetailItem(moveId, isRecommended, false));
			}

			if (
				!pokemon.eliteMoves.includes(moveId) &&
				pokemon.legacyMoves.includes(moveId)
			) {
				details.push(renderEliteDetailItem(moveId, isRecommended, true));
			}

			if (isStabMove(moveId)) {
				details.push(renderStabDetailItem(moveId, isRecommended));
			}

			return details;
		},
		[
			hasBuffs,
			isStabMove,
			pokemon,
			renderBuffDetailItem,
			renderEliteDetailItem,
			renderStabDetailItem,
		]
	);

	const relevantMovePower = useCallback(
		(moveId: string) => {
			switch (league) {
				case LeagueType.RAID:
					return moves[moveId].pvePower;
				default:
					return moves[moveId].pvpPower;
			}
		},
		[league, moves]
	);

	const relevantMoveEnergy = useCallback(
		(moveId: string) => {
			switch (league) {
				case LeagueType.RAID:
					return moves[moveId].pveEnergy;
				default:
					return moves[moveId].pvpEnergy;
			}
		},
		[league, moves]
	);

	const relevantMoveDuration = useCallback(
		(moveId: string) => {
			switch (league) {
				case LeagueType.RAID:
					return moves[moveId].pveCooldown;
				default:
					return moves[moveId].pvpCooldown;
			}
		},
		[league, moves]
	);

	const renderMove = useCallback(
		(
			moveId: string,
			typeTranslatorKey: TranslatorKeys,
			moveUrl: string,
			className: string,
			isChargedMove: boolean,
			isRecommended: boolean
		) => {
			return (
				<ListEntry
					mainIcon={{
						imageDescription: translator(
							typeTranslatorKey ?? moves[moveId].type,
							currentLanguage
						),
						image: (
							<div className='img-padding'>
								<img
									className='with-img-dropShadow'
									height={20}
									width={20}
									src={moveUrl}
									alt={translator(
										typeTranslatorKey ?? moves[moveId].type,
										currentLanguage
									)}
								/>
							</div>
						),
						imageSideText:
							translateMoveFromMoveId(moveId, moves, currentGameLanguage) +
							(pokemon.eliteMoves.includes(moveId)
								? ' *'
								: pokemon.legacyMoves.includes(moveId)
									? ' †'
									: ''),
						withBackground: true,
					}}
					backgroundColorClassName={className}
					secondaryContent={[
						<React.Fragment
							key={`${moveId}-${isRecommended ? 'rec' : 'all'}-atk`}
						>
							{Math.round(
								calculateDamage(
									pokemon.baseStats.atk,
									relevantMovePower(moveId),
									isStabMove(moveId),
									pokemon.isShadow,
									false,
									league === LeagueType.RAID &&
										raidAttackType &&
										raidAttackType === moves[moveId].type
										? Effectiveness.Effective
										: Effectiveness.Normal,
									15,
									level
								) * 10
							) / 10}
							<img
								className='invert-light-mode'
								alt='damage'
								src='https://i.imgur.com/uzIMRdH.png'
								width={14}
								height={16}
							/>
						</React.Fragment>,
						<React.Fragment
							key={`${moveId}-${isRecommended ? 'rec' : 'all'}-eng`}
						>
							{relevantMoveEnergy(moveId) * (isChargedMove ? -1 : 1)}
							<img
								className='invert-light-mode'
								alt='energy gain'
								src='https://i.imgur.com/Ztp5sJE.png'
								width={11}
								height={16}
							/>
						</React.Fragment>,
						(!isChargedMove || league === LeagueType.RAID) && (
							<React.Fragment
								key={`${moveId}-${isRecommended ? 'rec' : 'all'}-cd`}
							>
								{relevantMoveDuration(moveId)}s
								<img
									className='invert-light-mode'
									alt='cooldown'
									src='https://i.imgur.com/RIdKYJG.png'
									width={11}
									height={16}
								/>
							</React.Fragment>
						),
					]}
					toggledContent={[
						!isChargedMove && (
							<React.Fragment
								key={`${moveId}-${isRecommended ? 'rec' : 'all'}-dps`}
							>
								{Math.round(
									(calculateDamage(
										pokemon.baseStats.atk,
										relevantMovePower(moveId),
										isStabMove(moveId),
										pokemon.isShadow,
										false,
										league === LeagueType.RAID &&
											raidAttackType &&
											raidAttackType === moves[moveId].type
											? Effectiveness.Effective
											: Effectiveness.Normal,
										15,
										level
									) /
										relevantMoveDuration(moveId)) *
										100
								) / 100}{' '}
								DPS
							</React.Fragment>
						),
						!isChargedMove && (
							<React.Fragment
								key={`${moveId}-${isRecommended ? 'rec' : 'all'}-eps`}
							>
								{Math.round(
									(relevantMoveEnergy(moveId) / relevantMoveDuration(moveId)) *
										100
								) / 100}{' '}
								EPS
							</React.Fragment>
						),
						isChargedMove && (
							<React.Fragment
								key={`${moveId}-${isRecommended ? 'rec' : 'all'}-dpe`}
							>
								{relevantMoveEnergy(moveId) !== 0
									? Math.round(
											(calculateDamage(
												pokemon.baseStats.atk,
												relevantMovePower(moveId),
												isStabMove(moveId),
												pokemon.isShadow,
												false,
												league === LeagueType.RAID &&
													raidAttackType &&
													raidAttackType === moves[moveId].type
													? Effectiveness.Effective
													: Effectiveness.Normal,
												15,
												level
											) /
												relevantMoveEnergy(moveId)) *
												-1 *
												100
										) / 100
									: '∞'}{' '}
								DPE
							</React.Fragment>
						),
					]}
					details={renderDetails(moveId, isRecommended)}
					slimmer
					slim
					soft
					defaultBackgroundStyle='normal-entry'
				/>
			);
		},
		[
			currentLanguage,
			isStabMove,
			currentGameLanguage,
			league,
			level,
			moves,
			pokemon,
			raidAttackType,
			relevantMoveDuration,
			relevantMoveEnergy,
			relevantMovePower,
			renderDetails,
		]
	);

	return (
		<LoadingRenderer
			errors={errors + movesErrors + pvpErrors}
			completed={!isNotReady}
		>
			{() =>
				!isNotReady && (
					<div className='banner_layout normal-text'>
						{league === LeagueType.RAID && (
							<>
								<div className='raid-container item with-padding'>
									<div className='overflowing'>
										<div className='img-family'>
											{Array.from(
												new Set(
													getAllChargedMoves(
														pokemon,
														moves,
														gamemasterPokemon
													).map((m) => moves[m].type)
												)
											)
												.filter((t) => t !== 'normal')
												.map((t) => (
													<div
														className='clickable'
														key={t}
														onClick={() => {
															if (t === raidAttackType) {
																setRaidAttackType('');
															} else {
																setRaidAttackType(t);
															}
														}}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																if (t === raidAttackType) {
																	setRaidAttackType('');
																} else {
																	setRaidAttackType(t);
																}
															}
														}}
														role='button'
														tabIndex={0}
														aria-pressed={t === raidAttackType}
													>
														<strong
															className={`small-move-detail ${t === raidAttackType ? 'soft' : 'baby-soft'} smallish-padding item ${t === raidAttackType ? 'small-extra-padding-right' : ''}`}
														>
															<div className='img-padding'>
																<img
																	className='with-img-dropShadow'
																	height={26}
																	width={26}
																	alt='type'
																	src={`/images/types/${t}.png`}
																/>
															</div>
															{t === raidAttackType &&
																translatedType(
																	(t.substring(0, 1).toLocaleUpperCase() +
																		t.substring(1)) as unknown as PokemonTypes,
																	currentLanguage
																)}
														</strong>
													</div>
												))}
										</div>
									</div>
									<span className='with-padding'>
										<>
											{!raidAttackType ? (
												<span>
													{translator(TranslatorKeys.Overall, currentLanguage)}
												</span>
											) : (
												<span>
													{translator(TranslatorKeys.Focused1, currentLanguage)}
												</span>
											)}
											<strong className='cp-container'>
												{translatedType(
													(raidAttackType.substring(0, 1).toLocaleUpperCase() +
														raidAttackType.substring(
															1
														)) as unknown as PokemonTypes,
													currentLanguage
												)}
											</strong>
											<span>
												{raidAttackType &&
													translator(TranslatorKeys.Focused2, currentLanguage)}
											</span>
											<span>
												{raidAttackType &&
													translator(TranslatorKeys.Effective, currentLanguage)}
												,
											</span>
											<span>{` ${translator(TranslatorKeys.CanDeal, currentLanguage)}`}</span>
											<strong className='cp-container'>
												{' '}
												{Math.round(realDps.dps * 100) / 100} DPS
											</strong>
											<span>{` ${translator(TranslatorKeys.Using, currentLanguage)}`}</span>
											<strong className='cp-container'>{` ${translateMoveFromMoveId(raidComputation.fastMove, moves, currentGameLanguage)}`}</strong>
											<span>{` ${translator(TranslatorKeys.And, currentLanguage)}`}</span>
											<strong className='cp-container'>{` ${translateMoveFromMoveId(raidComputation.chargedMove, moves, currentGameLanguage)}`}</strong>
											.
										</>
									</span>
								</div>
							</>
						)}
						{league !== LeagueType.RAID && (
							<div className='menu-item centered with-padding'>
								<div className='with-padding'>
									{relevantMoveSet.length > 0 ? (
										<>
											<strong className='cp-container'>{`${translateMoveFromMoveId(relevantMoveSet[0], moves, currentGameLanguage)}`}</strong>
											<span>{` ${translator(TranslatorKeys.RecommendedFast, currentLanguage)}.`}</span>
											<strong className='cp-container'>{` ${translateMoveFromMoveId(relevantMoveSet[1], moves, currentGameLanguage)}`}</strong>
											{relevantMoveSet[2] && (
												<>
													<span>{` ${translator(TranslatorKeys.And, currentLanguage)}`}</span>
													<strong className='cp-container'>{` ${translateMoveFromMoveId(relevantMoveSet[2], moves, currentGameLanguage)}`}</strong>
												</>
											)}
											<span>{` ${translator(relevantMoveSet[2] ? TranslatorKeys.RecommendedCharged : TranslatorKeys.RecommendedChargedSingle, currentLanguage)}.`}</span>
										</>
									) : (
										`${pokemon.speciesName} ${translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} ${gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : GameTranslatorKeys.FantasyCup, currentGameLanguage)}...`
									)}
								</div>
							</div>
						)}
						<div className='moves-display-layout'>
							<Section
								title={translator(TranslatorKeys.FastMoves, currentLanguage)}
								withChevron
								chevronCollapsed={fastMovesCollapsed}
								onClickHandler={() => {
									setFastMovesCollapsed((c) => !c);
								}}
								additionalClasses={`moves-title ${fastMovesCollapsed ? 'hidden' : ''} all-moves fast-moves-section auto-margins large-title`}
								noPadding
							>
								<div className='menu-item no-margin no-border-container'>
									<ul
										className={`moves-list ${fastMovesCollapsed ? 'hidden' : ''} no-padding slim-list`}
									>
										{getAllFastMoves(pokemon, moves).length > 0 ? (
											getAllFastMoves(pokemon, moves)
												.sort(movesSorter)
												.map((m) => {
													const className = relevantMoveSet.includes(m)
														? `background-${moves[m].type}`
														: 'normal-entry';
													const typeTranslatorKey =
														TranslatorKeys[
															(moves[m].type
																.substring(0, 1)
																.toLocaleUpperCase() +
																moves[m].type.substring(
																	1
																)) as keyof typeof TranslatorKeys
														];
													const url = `/images/types/${moves[m]?.type}.png`;
													return (
														<React.Fragment key={m}>
															{renderMove(
																m,
																typeTranslatorKey,
																url,
																className,
																false,
																false
															)}
														</React.Fragment>
													);
												})
										) : (
											<span className='centered'>
												{translator(TranslatorKeys.NoResults, currentLanguage)}
											</span>
										)}
									</ul>
								</div>
							</Section>
							<Section
								title={translator(TranslatorKeys.ChargedMoves, currentLanguage)}
								withChevron
								chevronCollapsed={chargedMovesCollapsed}
								onClickHandler={() => {
									setChargedMovesCollapsed((c) => !c);
								}}
								additionalClasses={`moves-title ${chargedMovesCollapsed ? 'hidden' : ''} all-moves charged-moves-section auto-margins large-title`}
								noPadding
							>
								<div className='menu-item no-margin no-border-container'>
									<ul
										className={`moves-list ${chargedMovesCollapsed ? 'hidden' : ''} no-padding slim-list`}
									>
										{getAllChargedMoves(pokemon, moves, gamemasterPokemon)
											.length > 0 ? (
											getAllChargedMoves(pokemon, moves, gamemasterPokemon)
												.sort(movesSorter)
												.map((m) => {
													const className = relevantMoveSet.includes(m)
														? `background-${moves[m].type}`
														: 'normal-entry';
													const typeTranslatorKey =
														TranslatorKeys[
															(moves[m].type
																.substring(0, 1)
																.toLocaleUpperCase() +
																moves[m].type.substring(
																	1
																)) as keyof typeof TranslatorKeys
														];
													const url = `/images/types/${moves[m]?.type}.png`;
													return (
														<React.Fragment key={m}>
															{renderMove(
																m,
																typeTranslatorKey,
																url,
																className,
																true,
																false
															)}
														</React.Fragment>
													);
												})
										) : (
											<span className='centered'>
												{translator(TranslatorKeys.NoResults, currentLanguage)}
											</span>
										)}
									</ul>
								</div>
							</Section>
						</div>
					</div>
				)
			}
		</LoadingRenderer>
	);
};

export default PokemonMoves;
