import './PokemonMoves.scss';

import type { KeyboardEvent, MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import { useMoves } from '../contexts/moves-context';
import { usePokemon } from '../contexts/pokemon-context';
import { usePvp } from '../contexts/pvp-context';
import type { DPSEntry } from '../contexts/raid-ranker-context';
import type { IDetailItem } from '../DTOs/IDetailItem';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
// Removed unused import: MatchUp
import { LeagueType } from '../hooks/useLeague';
import useResize from '../hooks/useResize';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import { computeDPSEntry, shortName, translateMoveFromMoveId } from '../utils/pokemon-helper';
import translator, { TranslatorKeys } from '../utils/Translator';
import ListEntry from './ListEntry';
import LoadingRenderer from './LoadingRenderer';
import PokemonImage from './PokemonImage';
import Section from './Template/Section';

interface IPokemonCounters {
	pokemon: IGamemasterPokemon;
	league: LeagueType;
}

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
	const cachedValue = readPersistentValue(key);
	if (!cachedValue) {
		return defaultValue;
	}
	return +cachedValue;
};

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
	const cachedValue = readPersistentValue(key);
	if (cachedValue === null) {
		return defaultValue;
	}
	return cachedValue === 'true';
};

const PokemonCounters = ({ pokemon, league }: IPokemonCounters) => {
	const [shadow, setShadow] = useState(parsePersistentCachedBooleanValue(ConfigKeys.Shadow, true));
	const [mega, setMega] = useState(parsePersistentCachedBooleanValue(ConfigKeys.Mega, true));
	const [top, setTop] = useState(parsePersistentCachedNumberValue(ConfigKeys.ShowEntries, 10));
	const { currentLanguage, currentGameLanguage } = useLanguage();
	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
	const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
	const { moves, movesFetchCompleted, movesErrors } = useMoves();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { x } = useResize();
	const { imageSource } = useImageSource();

	const resourcesNotReady = useMemo(
		() => !fetchCompleted || !movesFetchCompleted || !pvpFetchCompleted || !gamemasterPokemon || !pokemon,
		[fetchCompleted, gamemasterPokemon, movesFetchCompleted, pokemon, pvpFetchCompleted]
	);

	useEffect(() => {
		writePersistentValue(ConfigKeys.ShowEntries, top.toString());
	}, [top]);

	useEffect(() => {
		writePersistentValue(ConfigKeys.Mega, mega.toString());
	}, [mega]);

	useEffect(() => {
		writePersistentValue(ConfigKeys.Shadow, shadow.toString());
	}, [shadow]);

	const comparisons = useMemo(() => {
		if (resourcesNotReady) {
			return [];
		}

		const comparisons: Array<DPSEntry> = [];
		Object.values(gamemasterPokemon)
			.filter((p) => !p.aliasId)
			.forEach((p) => comparisons.push(computeDPSEntry(p, gamemasterPokemon, moves, 15, 100, '', pokemon)));

		return comparisons.sort((e1: DPSEntry, e2: DPSEntry) => {
			if (e2.dps !== e1.dps) {
				return e2.dps - e1.dps;
			}

			return e1.speciesId.localeCompare(e2.speciesId);
		});
	}, [resourcesNotReady, gamemasterPokemon, moves, pokemon]);

	const greatLeagueMatchUps = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[0][pokemon.speciesId]?.matchups ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const greatLeagueCounters = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[0][pokemon.speciesId]?.counters ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const ultraLeagueMatchUps = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[1][pokemon.speciesId]?.matchups ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const ultraLeagueCounters = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[1][pokemon.speciesId]?.counters ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const masterLeagueMatchUps = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[2][pokemon.speciesId]?.matchups ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const masterLeagueCounters = useMemo(
		() => (resourcesNotReady ? [] : (rankLists[2][pokemon.speciesId]?.counters ?? [])),
		[rankLists, pokemon, resourcesNotReady]
	);
	const customLeagueMatchUps = useMemo(
		() => (resourcesNotReady ? [] : rankLists[3] ? (rankLists[3][pokemon.speciesId]?.matchups ?? []) : []),
		[rankLists, pokemon, resourcesNotReady]
	);
	const customLeagueCounters = useMemo(
		() => (resourcesNotReady ? [] : rankLists[3] ? (rankLists[3][pokemon.speciesId]?.counters ?? []) : []),
		[rankLists, pokemon, resourcesNotReady]
	);

	const relevantMatchUps = useMemo(
		() =>
			league === LeagueType.GREAT_LEAGUE
				? greatLeagueMatchUps
				: league === LeagueType.ULTRA_LEAGUE
					? ultraLeagueMatchUps
					: league === LeagueType.CUSTOM_CUP
						? customLeagueMatchUps
						: masterLeagueMatchUps,
		[customLeagueMatchUps, greatLeagueMatchUps, league, masterLeagueMatchUps, ultraLeagueMatchUps]
	);
	const relevantCounters = useMemo(
		() =>
			league === LeagueType.GREAT_LEAGUE
				? greatLeagueCounters
				: league === LeagueType.ULTRA_LEAGUE
					? ultraLeagueCounters
					: league === LeagueType.CUSTOM_CUP
						? customLeagueCounters
						: masterLeagueCounters,
		[customLeagueCounters, greatLeagueCounters, league, masterLeagueCounters, ultraLeagueCounters]
	);

	const leagueName = useMemo(
		() =>
			gameTranslator(
				league === LeagueType.GREAT_LEAGUE
					? GameTranslatorKeys.GreatLeague
					: league === LeagueType.ULTRA_LEAGUE
						? GameTranslatorKeys.UltraLeague
						: league === LeagueType.MASTER_LEAGUE
							? GameTranslatorKeys.MasterLeague
							: league === LeagueType.CUSTOM_CUP
								? GameTranslatorKeys.FantasyCup
								: GameTranslatorKeys.Raids,
				currentGameLanguage
			),
		[currentGameLanguage, league]
	);

	const renderPvPEntry = useCallback(
		(pokemon: IGamemasterPokemon, score: number, className: string) => {
			const type1 = pokemon.types[0];

			return (
				<ListEntry
					slimmer
					slim
					mainIcon={{
						imageDescription: pokemon.speciesName.replace(
							'Shadow',
							gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
						),
						image: (
							<div className={`${imageSource !== ImageSource.Official ? '' : 'img-small-padding'}`}>
								<PokemonImage
									pokemon={pokemon}
									specificHeight={imageSource !== ImageSource.Official ? 28 : 24}
									specificWidth={imageSource !== ImageSource.Official ? 28 : 24}
									withName={false}
								/>
							</div>
						),
						imageSideText: shortName(pokemon.speciesName),
						withBackground: true,
					}}
					backgroundColorClassName={className}
					secondaryContent={[
						<React.Fragment key={pokemon.speciesId}>
							{score >= 500 ? (
								<span className='win with-shadow with-brightness'>{score / 10}%</span>
							) : (
								<span className='lose with-shadow with-brightness'>{score / 10}%</span>
							)}
						</React.Fragment>,
					]}
					onClick={() => void navigate(`/pokemon/${pokemon.speciesId}${pathname.substring(pathname.lastIndexOf('/'))}`)}
					specificBackgroundStyle={`linear-gradient(45deg, var(--type-${type1}) 100%)`}
				/>
			);
		},
		[currentGameLanguage, imageSource, navigate, pathname]
	);

	const detailsClickHandler = useCallback(
		(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, elementId: string) => {
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
		(moveId: string, attack: number, speciesId: string): IDetailItem => {
			return {
				detailId: `${moveId}-${speciesId}`,
				onClick: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) =>
					detailsClickHandler(event, `${moveId}-${speciesId}`),
				summary: (
					<>
						<img
							alt='Special effects'
							className='with-img-dropShadow'
							loading='lazy'
							width='14'
							height='14'
							decoding='async'
							src={`/images/types/${moves[moveId].type}.png`}
						/>
						<span>{translateMoveFromMoveId(moveId, moves, currentGameLanguage)}</span>
					</>
				),
				content: (
					<>
						<p>
							<strong className='move-detail no-extra-padding'>
								{attack}
								<img
									className='invert-light-mode'
									alt='damage'
									src='https://i.imgur.com/uzIMRdH.png'
									width={14}
									height={16}
								/>
								{Math.abs(moves[moveId].pveEnergy)}
								<img
									className='invert-light-mode'
									alt='energy gain'
									src='https://i.imgur.com/Ztp5sJE.png'
									width={11}
									height={16}
								/>
								{moves[moveId].pveCooldown}s
								<img
									className='invert-light-mode'
									alt='cooldown'
									src='https://i.imgur.com/RIdKYJG.png'
									width={11}
									height={16}
								/>
							</strong>
						</p>
					</>
				),
			};
		},
		[detailsClickHandler, moves, currentGameLanguage]
	);

	const renderRaidEntry = useCallback(
		(
			pokemon: IGamemasterPokemon,
			dps: number,
			fastMove: string,
			chargedMove: string,
			className: string,
			fastMoveDamage: number,
			chargedMoveDamage: number
		) => {
			const type1 = pokemon.types[0];

			return (
				<ListEntry
					slimmer
					slim
					mainIcon={{
						imageDescription: pokemon.speciesName.replace(
							'Shadow',
							gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
						),
						image: (
							<div className={`${imageSource !== ImageSource.Official ? '' : 'img-small-padding'}`}>
								<PokemonImage
									pokemon={pokemon}
									specificHeight={imageSource !== ImageSource.Official ? 28 : 24}
									specificWidth={imageSource !== ImageSource.Official ? 28 : 24}
									withName={false}
								/>
							</div>
						),
						imageSideText: shortName(pokemon.speciesName),
						withBackground: true,
					}}
					backgroundColorClassName={className}
					secondaryContent={[
						<React.Fragment key={pokemon.speciesId}>
							{<span className='with-shadow with-brightness'>{Math.round(dps * 100) / 100} DPS</span>}
						</React.Fragment>,
					]}
					onClick={() => void navigate(`/pokemon/${pokemon.speciesId}${pathname.substring(pathname.lastIndexOf('/'))}`)}
					specificBackgroundStyle={`linear-gradient(45deg, var(--type-${type1}) 100%)`}
					details={[
						{
							...renderBuffDetailItem(fastMove, fastMoveDamage, pokemon.speciesId),
							onClick: (event) => {
								if ('button' in event || 'clientX' in event) {
									detailsClickHandler(
										event as unknown as React.MouseEvent<HTMLElement>,
										`${fastMove}-${pokemon.speciesId}`
									);
								}
							},
						},
						{
							...renderBuffDetailItem(chargedMove, chargedMoveDamage, pokemon.speciesId),
							onClick: (event) => {
								if ('button' in event || 'clientX' in event) {
									detailsClickHandler(
										event as unknown as React.MouseEvent<HTMLElement>,
										`${chargedMove}-${pokemon.speciesId}`
									);
								}
							},
						},
					]}
				/>
			);
		},
		[currentGameLanguage, detailsClickHandler, imageSource, navigate, pathname, renderBuffDetailItem]
	);

	return (
		<LoadingRenderer errors={pvpErrors + movesErrors + errors} completed={!resourcesNotReady}>
			{}
			{() =>
				!resourcesNotReady && (
					<div className='banner_layout normal-text'>
						{league === LeagueType.RAID && (
							<div className='extra-ivs-options item default-padding block-column'>
								<div className='centered'>
									<span className='with-padding'>
										{translator(TranslatorKeys.In, currentLanguage).substring(0, 1).toLocaleUpperCase() +
											translator(TranslatorKeys.In, currentLanguage).substring(1)}{' '}
										{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)},{' '}
										{translator(TranslatorKeys.RaidsIntro, currentLanguage)}{' '}
										{pokemon.speciesName.replace(
											'Shadow',
											gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
										)}
										:
									</span>
								</div>
								<br />
								<div className='justified'>
									{translator(TranslatorKeys.Show, currentLanguage)}&nbsp;
									<select value={top} onChange={(e) => setTop(+e.target.value)} className='select-level'>
										<option key={10} value={10}>
											{10}
										</option>
										<option key={20} value={20}>
											{20}
										</option>
										<option key={30} value={30}>
											{30}
										</option>
										<option key={50} value={50}>
											{50}
										</option>
									</select>
									&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Mega{' '}
									<input type='checkbox' checked={mega} onChange={() => setMega((p) => !p)} />
									&nbsp;&nbsp;
									{gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)}{' '}
									<input type='checkbox' checked={shadow} onChange={() => setShadow((p) => !p)} />
								</div>
							</div>
						)}
						{league !== LeagueType.RAID && (
							<div className='centered item default-padding'>
								<span className='with-padding'>
									{translator(TranslatorKeys.TopKeyCountersIntro, currentLanguage)}{' '}
									{pokemon.speciesName.replace(
										'Shadow',
										gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
									)}{' '}
									{translator(TranslatorKeys.In, currentLanguage)}{' '}
									{gameTranslator(
										league === LeagueType.GREAT_LEAGUE
											? GameTranslatorKeys.GreatLeague
											: league === LeagueType.ULTRA_LEAGUE
												? GameTranslatorKeys.UltraLeague
												: league === LeagueType.CUSTOM_CUP
													? GameTranslatorKeys.FantasyCup
													: GameTranslatorKeys.MasterLeague,
										currentGameLanguage
									)}
									:
								</span>
							</div>
						)}
						<div className='counters-display-layout'>
							{league !== LeagueType.RAID && (
								<Section
									title={`${shortName(pokemon.speciesName)} ${translator(TranslatorKeys.StrongAgainst, currentLanguage)} (${leagueName}):`}
									additionalClasses={`moves-title all-moves fast-moves-section auto-margins large-title`}
									noPadding
								>
									<div className='menu-item no-margin no-border-container'>
										<ul className={`moves-list no-padding slim-list`}>
											{rankLists[league as number][pokemon.speciesId] ? (
												relevantMatchUps.length > 0 ? (
													relevantMatchUps.map((m) => {
														const pokemon = gamemasterPokemon[m.opponent];
														const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
														return (
															<React.Fragment key={m.opponent}>
																{renderPvPEntry(pokemon, m.rating, className)}
															</React.Fragment>
														);
													})
												) : (
													<span className='centered'>{translator(TranslatorKeys.NoResults, currentLanguage)}</span>
												)
											) : (
												<span className='unavailable_moves'>
													{pokemon.speciesName.replace(
														'Shadow',
														gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
													)}{' '}
													{translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)}{' '}
													{gameTranslator(
														league === LeagueType.GREAT_LEAGUE
															? GameTranslatorKeys.GreatLeague
															: league === LeagueType.ULTRA_LEAGUE
																? GameTranslatorKeys.UltraLeague
																: league === LeagueType.CUSTOM_CUP
																	? GameTranslatorKeys.FantasyCup
																	: GameTranslatorKeys.MasterLeague,
														currentGameLanguage
													)}
												</span>
											)}
										</ul>
									</div>
								</Section>
							)}
							<Section
								title={
									league === LeagueType.RAID
										? `${shortName(pokemon.speciesName)} - ${translator(TranslatorKeys.CountersWeak, currentLanguage)}${x > 750 ? ` (1 - ${top / 2}):` : ':'}`
										: `${shortName(pokemon.speciesName)} ${translator(TranslatorKeys.WeakAgainst, currentLanguage)} (${leagueName}):`
								}
								additionalClasses={`moves-title all-moves charged-moves-section auto-margins large-title`}
								noPadding
							>
								<div className='menu-item no-margin no-border-container'>
									<ul className={`moves-list no-padding slim-list`}>
										{league === LeagueType.RAID ? (
											comparisons
												.filter(
													(o) =>
														(shadow || !gamemasterPokemon[o.speciesId].isShadow) &&
														(mega || !gamemasterPokemon[o.speciesId].isMega)
												)
												.slice(0, x > 750 ? top / 2 : top)
												.map((m) => {
													const pokemon = gamemasterPokemon[m.speciesId];
													const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
													return (
														<React.Fragment key={m.speciesId}>
															{renderRaidEntry(
																pokemon,
																m.dps,
																m.fastMove,
																m.chargedMove,
																className,
																m.fastMoveDmg,
																m.chargedMoveDmg
															)}
														</React.Fragment>
													);
												})
										) : rankLists[league as number][pokemon.speciesId] ? (
											relevantCounters.length > 0 ? (
												relevantCounters.map((m) => {
													const pokemon = gamemasterPokemon[m.opponent];
													const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
													return (
														<React.Fragment key={m.opponent}>
															{renderPvPEntry(pokemon, m.rating, className)}
														</React.Fragment>
													);
												})
											) : (
												<span className='centered'>{translator(TranslatorKeys.NoResults, currentLanguage)}</span>
											)
										) : (
											<span className='unavailable_moves'>
												{pokemon.speciesName.replace(
													'Shadow',
													gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
												)}{' '}
												{translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)}{' '}
												{gameTranslator(
													league === LeagueType.GREAT_LEAGUE
														? GameTranslatorKeys.GreatLeague
														: league === LeagueType.ULTRA_LEAGUE
															? GameTranslatorKeys.UltraLeague
															: league === LeagueType.CUSTOM_CUP
																? GameTranslatorKeys.FantasyCup
																: GameTranslatorKeys.MasterLeague,
													currentGameLanguage
												)}
											</span>
										)}
									</ul>
								</div>
							</Section>
							{x > 750 && league === LeagueType.RAID && (
								<Section
									title={`${shortName(pokemon.speciesName)} - ${translator(TranslatorKeys.CountersWeak, currentLanguage)} (${top / 2 + 1} - ${top}):`}
									additionalClasses={`moves-title all-moves charged-moves-section auto-margins large-title`}
									noPadding
								>
									<div className='menu-item no-margin no-border-container'>
										<ul className={`moves-list no-padding slim-list`}>
											{comparisons
												.filter(
													(o) =>
														(shadow || !gamemasterPokemon[o.speciesId].isShadow) &&
														(mega || !gamemasterPokemon[o.speciesId].isMega)
												)
												.slice(top / 2, top)
												.map((m) => {
													const pokemon = gamemasterPokemon[m.speciesId];
													const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
													return (
														<React.Fragment key={m.speciesId}>
															{renderRaidEntry(
																pokemon,
																m.dps,
																m.fastMove,
																m.chargedMove,
																className,
																m.fastMoveDmg,
																m.chargedMoveDmg
															)}
														</React.Fragment>
													);
												})}
										</ul>
									</div>
								</Section>
							)}
						</div>
					</div>
				)
			}
		</LoadingRenderer>
	);
};

export default PokemonCounters;
