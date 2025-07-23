import './ReusableAdorners.scss';

import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Language, useLanguage } from '../contexts/language-context';
import { useMoves } from '../contexts/moves-context';
import { usePokemon } from '../contexts/pokemon-context';
import { usePvp } from '../contexts/pvp-context';
import { useRaidRanker } from '../contexts/raid-ranker-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { PokemonTypes as PType } from '../DTOs/PokemonTypes';
import useCountdown from '../hooks/useCountdown';
import useResize from '../hooks/useResize';
import { ordinal } from '../utils/conversions';
import { ConfigKeys, readPersistentValue } from '../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf, getAllChargedMoves, needsXLCandy } from '../utils/pokemon-helper';
import { ListType } from '../views/pokedex';
import PokemonImage from './PokemonImage';

interface IPokemonMiniatureProps {
	pokemon: IGamemasterPokemon;
	cpStringOverride?: string;
	withCountdown?: number | undefined;
	linkToShadowVersion?: boolean;
	forceShadowAdorner?: boolean;
	withBackground?: boolean;
	withTypes?: boolean;
	withNumber?: boolean;
	numberOverride?: number;
	listType?: number;
	megaBall?: boolean;
	megaBackground?: boolean;
}

const PokemonMiniature = ({
	pokemon,
	cpStringOverride,
	withCountdown,
	linkToShadowVersion,
	forceShadowAdorner,
	withBackground = true,
	withTypes = false,
	withNumber = false,
	numberOverride,
	listType,
	megaBall = true,
	megaBackground = false,
}: IPokemonMiniatureProps) => {
	const { days, hours, minutes, seconds } = useCountdown(withCountdown ?? 0);
	const containerWidth = useRef<HTMLDivElement>(null);
	useResize();

	const computeCountdownLabel = useCallback(() => {
		if (days > 0) {
			return `${days}d`;
		}

		if (hours > 0) {
			return `${hours}h`;
		}

		if (minutes > 0) {
			return `${minutes}m`;
		}

		return `${seconds}s`;
	}, [days, hours, minutes, seconds]);

	const { rankLists, pvpFetchCompleted } = usePvp();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { moves, movesFetchCompleted } = useMoves();
	const { raidDPSFetchCompleted, raidDPS } = useRaidRanker();
	const { currentLanguage } = useLanguage();

	const computeRankChange = useCallback(() => {
		if (!pvpFetchCompleted || listType === undefined || !rankLists[listType - 1]) {
			return '';
		}

		return ` ${rankLists[listType - 1][pokemon.speciesId].rankChange === 0 ? '' : rankLists[listType - 1][pokemon.speciesId].rankChange < 0 ? '▾' + rankLists[listType - 1][pokemon.speciesId].rankChange * -1 : '▴' + rankLists[listType - 1][pokemon.speciesId].rankChange}`;
	}, [pvpFetchCompleted, rankLists, listType, pokemon]);

	let cpThreshold = 0;
	switch (listType) {
		case ListType.GREAT_LEAGUE:
			cpThreshold = 1500;
			break;
		case ListType.ULTRA_LEAGUE:
			cpThreshold = 2500;
			break;
	}

	const fetchPokemonRank = useCallback((): string => {
		if (!pvpFetchCompleted || listType === undefined) {
			return '';
		}

		let ordinalRank = rankLists[listType - 1]
			? ordinal(rankLists[listType - 1][pokemon.speciesId].rank)
			: numberOverride
				? ordinal(numberOverride)
				: '';
		if (!ordinalRank) {
			return '';
		}

		if (currentLanguage === Language.Portuguese) {
			ordinalRank = ordinalRank.replace('st', 'º').replace('nd', 'º').replace('rd', 'º').replace('th', 'º');
		}

		if (currentLanguage === Language.Bosnian) {
			ordinalRank = ordinalRank.replace('st', '.').replace('nd', '.').replace('rd', '.').replace('th', '.');
		}

		if (numberOverride ?? rankLists[listType - 1]) {
			const effectiveRank = numberOverride ?? rankLists[listType - 1][pokemon.speciesId].rank;

			switch (effectiveRank) {
				case 1:
					return '🥇' + ordinalRank;
				case 2:
					return '🥈' + ordinalRank;
				case 3:
					return '🥉' + ordinalRank;
				default:
					return ordinalRank;
			}
		}

		return ordinalRank;
	}, [currentLanguage, listType, pvpFetchCompleted, rankLists, numberOverride, pokemon]);

	const idToUse = useMemo(() => {
		if (!fetchCompleted) {
			return pokemon.speciesId;
		}

		const potentialId = pokemon.speciesId + '_shadow';

		if (forceShadowAdorner && !!gamemasterPokemon[potentialId]) {
			return potentialId;
		}

		return pokemon.speciesId;
	}, [pokemon, fetchCompleted, forceShadowAdorner, gamemasterPokemon]);

	const pkmToUse = useMemo(() => {
		if (!fetchCompleted) {
			return pokemon;
		}

		const potentialId = pokemon.speciesId + '_shadow';

		if (forceShadowAdorner && !!gamemasterPokemon[potentialId]) {
			return gamemasterPokemon[potentialId];
		}

		return pokemon;
	}, [pokemon, fetchCompleted, forceShadowAdorner, gamemasterPokemon]);

	const allRelevantChargedMoveTypes = useMemo(() => {
		if (!fetchCompleted || !movesFetchCompleted) {
			return [];
		}

		const reachablePokemon = Array.from(
			fetchReachablePokemonIncludingSelf(pkmToUse, gamemasterPokemon, undefined, true)
		);

		return Array.from(
			new Set(
				reachablePokemon.flatMap((f) => getAllChargedMoves(f, moves, gamemasterPokemon).map((m) => moves[m].type))
			)
		)
			.filter((t) => t !== 'normal')
			.map((t) => (t.substring(0, 1).toLocaleUpperCase() + t.substring(1).toLocaleLowerCase()) as unknown as PType);
	}, [fetchCompleted, movesFetchCompleted, moves, gamemasterPokemon, pkmToUse, idToUse]);

	const link = useMemo(() => `/pokemon/${idToUse}/info`, [idToUse]);

	const raidRank = useCallback(() => {
		if (allRelevantChargedMoveTypes.length === 0) {
			return { minRaidRank: Infinity, actualType: '' };
		}

		if (!fetchCompleted || !raidDPSFetchCompleted) {
			return { minRaidRank: Infinity, actualType: '' };
		}

		const reachablePokemon = Array.from(
			fetchReachablePokemonIncludingSelf(pkmToUse, gamemasterPokemon, undefined, true)
		);

		let minRaidRank = Infinity;
		let actualType = '';
		allRelevantChargedMoveTypes.forEach((t) => {
			reachablePokemon.forEach((pk) => {
				const rank = Object.keys(raidDPS[t.toString().toLocaleLowerCase()]).indexOf(pk.speciesId);
				if (rank !== -1) {
					if (rank + 1 < minRaidRank) {
						minRaidRank = rank + 1;
						actualType = t.toString().toLocaleLowerCase();
					}
				}
			});
		});

		return { minRaidRank: minRaidRank, actualType: actualType };
	}, [
		allRelevantChargedMoveTypes,
		fetchCompleted,
		gamemasterPokemon,
		pkmToUse,
		raidDPS,
		raidDPSFetchCompleted,
		idToUse,
	]);

	const rankForLeague = useCallback(
		(leagueIdx: number) => {
			if (!pvpFetchCompleted || !fetchCompleted) {
				return Infinity;
			}
			const reachable = fetchReachablePokemonIncludingSelf(pkmToUse, gamemasterPokemon);
			return Math.min(...Array.from(reachable).map((r) => rankLists[leagueIdx][r.speciesId]?.rank ?? Infinity));
		},
		[pvpFetchCompleted, pkmToUse, gamemasterPokemon, rankLists, fetchCompleted]
	);

	const relevantLeagueElement = useCallback((mapper: Record<string, ReactNode>) => {
		const minimum = String(Math.min(...Object.keys(mapper).map((t) => +t)));
		if (!mapper[minimum]) {
			return <></>;
		}
		return mapper[minimum];
	}, []);

	const mapper = useMemo(() => {
		const dic: Record<string, ReactNode> = {};
		const great = rankForLeague(0);
		const ultra = rankForLeague(1);
		const master = rankForLeague(2);

		if (great <= +(readPersistentValue(ConfigKeys.TrashGreat) ?? 50)) {
			dic[great] = <img alt='Great League' className='is-great' src={`/images/leagues/great-big.webp`} />;
		}

		if (ultra <= +(readPersistentValue(ConfigKeys.TrashUltra) ?? 50)) {
			dic[ultra] = <img alt='Ultra League' className='is-ultra' src={`/images/leagues/ultra-big.webp`} />;
		}

		if (master <= +(readPersistentValue(ConfigKeys.TrashMaster) ?? 110)) {
			dic[master] = <img alt='Master League' className='is-master' src={`/images/leagues/master-big.webp`} />;
		}
		return dic;
	}, [rankForLeague]);

	const raidRaking = useMemo(() => raidRank(), [raidRank]);

	const rankChangeClassName = useMemo(
		() =>
			!pvpFetchCompleted || listType === undefined || listType === +ListType.POKEDEX || !rankLists[listType - 1]
				? ''
				: rankLists[listType - 1][pokemon.speciesId].rankChange === 0
					? 'neutral'
					: rankLists[listType - 1][pokemon.speciesId].rankChange < 0
						? 'nerfed'
						: 'buffed',
		[listType, pvpFetchCompleted, rankLists, pokemon]
	);

	return (
		<Link to={link}>
			<div ref={containerWidth} className='pokemon-miniature'>
				{withTypes && (
					<div className='type-corner-container'>
						{pokemon.types[1] !== undefined ? (
							<>
								<div
									className='type-corner-half type-corner-part1'
									style={{ background: `var(--type-${pokemon.types[0]})` }}
								/>
								<div
									className='type-corner-half type-corner-part2'
									style={{ background: `var(--type-${pokemon.types[1]})` }}
								/>
							</>
						) : (
							<div className='type-corner-full' style={{ background: `var(--type-${pokemon.types[0]})` }} />
						)}
					</div>
				)}
				{withCountdown && (
					<div className='notifications-counter heavy-weight miniature-notification'>{computeCountdownLabel()}</div>
				)}
				{withNumber && (
					<div className='rank-container miniature-notification'>
						<>
							<span>{listType === ListType.POKEDEX ? `#${pokemon.dex}` : fetchPokemonRank()}</span>
							<br className='break-line' />
							<span className={`rank-change with-brightness ${rankChangeClassName}`}>{computeRankChange()}</span>
						</>
					</div>
				)}
				{withBackground && (
					<div className={`miniature-tooltip`}>
						{pvpFetchCompleted &&
							fetchCompleted &&
							(raidRaking.minRaidRank <= +(readPersistentValue(ConfigKeys.TrashRaid) ?? 5) ? (
								<img
									className='padded-img raid-img-with-contrast hyper-size is-raid'
									alt='Raids'
									src={`/images/types/${raidRaking.actualType}.png`}
								/>
							) : (
								relevantLeagueElement(mapper)
							))}
					</div>
				)}
				{megaBackground && (
					<div className={`miniature-tooltip`}>
						{pokemon.isMega && (
							<img className='padded-img raid-img-with-contrast hyper-size' alt='Mega' src={`/images/mega.webp`} />
						)}
					</div>
				)}
				<span className='mini-card-content'>
					<PokemonImage
						withClassname={`with-img-dropShadow`}
						pokemon={pkmToUse}
						withName
						xl={cpThreshold !== 0 && needsXLCandy(pokemon, cpThreshold)}
						lazy
						specificNameContainerWidth={containerWidth.current?.clientWidth}
						forceShadowAdorner={forceShadowAdorner && !pkmToUse.speciesId.endsWith('_shadow')}
						megaBall={megaBall}
						allowHyperSize
					/>
				</span>
			</div>
		</Link>
	);
};

export default PokemonMiniature;
