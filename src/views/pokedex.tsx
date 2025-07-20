import './pokedex.scss';

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';

import PokemonHeader from '../components/PokemonHeader';
import { translatedType } from '../components/PokemonInfoImagePlaceholder';
import PokemonMiniature from '../components/PokemonMiniature';
import type { Entry } from '../components/Template/Navbar';
import { Language, useLanguage } from '../contexts/language-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { usePokemon } from '../contexts/pokemon-context';
import { customCupCPLimit, usePvp } from '../contexts/pvp-context';
import { useRaidRanker } from '../contexts/raid-ranker-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../DTOs/IRankedPokemon';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { fetchPokemonFamily, needsXLCandy } from '../utils/pokemon-helper';
import translator, { TranslatorKeys } from '../utils/Translator';
import '../components/PokemonNumber.scss'

export enum ListType {
	POKEDEX,
	GREAT_LEAGUE,
	ULTRA_LEAGUE,
	MASTER_LEAGUE,
	RAID,
}

const Pokedex = () => {
	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
	const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { inputText, familyTree, showShadow, showMega, showXL, type1Filter, type2Filter, updateType1 } =
		useNavbarSearchInput();

	const { currentLanguage, currentGameLanguage } = useLanguage();
	const navigate = useNavigate();

	const { listTypeArg } = useParams();

	const pageToLeague = (page: string | undefined) => {
		switch (page) {
			case undefined:
				return ListType.POKEDEX;
			case 'great':
				return ListType.GREAT_LEAGUE;
			case 'ultra':
				return ListType.ULTRA_LEAGUE;
			case 'master':
				return ListType.MASTER_LEAGUE;
			case 'raid':
				return ListType.RAID;
			default:
				throw Error('404 not found!');
		}
	};

	const pageToCPThreshold = (page: string | undefined) => {
		switch (page) {
			case undefined:
				return 0;
			case 'great':
				return 1500;
			case 'ultra':
				return 2500;
			case 'master':
				return 0;
			case 'custom':
				return customCupCPLimit;
			case 'raid':
				return 0;
			default:
				throw Error('404 not found!');
		}
	};

	const listType = pageToLeague(listTypeArg);
	const cpThreshold = pageToCPThreshold(listTypeArg);

	const pokemonByDex = useMemo(() => {
		if (!fetchCompleted) {
			return {};
		}

		const dict: Record<string, Array<IGamemasterPokemon>> = {};

		Object.values(gamemasterPokemon)
			.filter((p) => !p.aliasId)
			.forEach((p) => {
				if (!dict[p.dex]) {
					dict[p.dex] = [p];
				} else {
					dict[p.dex].push(p);
				}
			});

		return dict;
	}, [gamemasterPokemon, fetchCompleted]);

	const pokemonByFamilyId = useMemo(() => {
		if (!fetchCompleted) {
			return {};
		}

		const dict: Record<string, Array<IGamemasterPokemon>> = {};

		Object.values(gamemasterPokemon)
			.filter((p) => !p.aliasId)
			.forEach((p) => {
				if (!p.family?.id) {
					return;
				}

				if (!dict[p.family.id]) {
					dict[p.family.id] = [p];
				} else {
					dict[p.family.id].push(p);
				}
			});

		return dict;
	}, [gamemasterPokemon, fetchCompleted]);

	type DataType = {
		processedList: Array<IGamemasterPokemon>;
		cpStringOverrides: Record<string, string>;
		rankOverrides: Record<string, number>;
	};

	const data: DataType = useMemo(() => {
		if (!fetchCompleted || !pvpFetchCompleted) {
			return {
				processedList: [],
				cpStringOverrides: {},
				rankOverrides: {},
			};
		}

		let processedList: Array<IGamemasterPokemon> = [];
		const cpStringOverrides: Record<string, string> = {};
		const rankOverrides: Record<string, number> = {};

		const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon[r.speciesId];

		const inputFilter = (p: IGamemasterPokemon, domainFilter: (pokemon: IGamemasterPokemon) => boolean) => {
			if (!inputText) {
				return true;
			}

			if (!familyTree) {
				return baseFilter(p);
			}

			const family = fetchPokemonFamily(p, gamemasterPokemon, domainFilter, pokemonByDex, pokemonByFamilyId);
			return Array.from(family).some(baseFilter);
		};

		const baseFilter = (p: IGamemasterPokemon) =>
			p.speciesName
				.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))
				.toLowerCase()
				.includes(inputText.toLowerCase().trim());

		switch (listType) {
			case ListType.POKEDEX:
				const pokedexDomainFilter = (pokemon: IGamemasterPokemon) =>
					!pokemon.isShadow &&
					!pokemon.aliasId &&
					(showMega || !pokemon.isMega) &&
					(type1Filter === undefined || pokemon.types.includes(type1Filter)) &&
					(type2Filter === undefined || pokemon.types.includes(type2Filter));
				const pokedexDomainFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.isShadow && !pokemon.aliasId;
				processedList = Object.values(gamemasterPokemon)
					.filter((p) => pokedexDomainFilter(p) && inputFilter(p, pokedexDomainFilterForFamily))
					.sort((p1: IGamemasterPokemon, p2: IGamemasterPokemon) => {
						// Sort by dex number first
						if (p1.dex !== p2.dex) {
							return p1.dex - p2.dex;
						}

						// Sort Megas higher
						if (p1.isMega !== p2.isMega) {
							return p1.isMega ? 1 : -1;
						}

						// Cache lowercase species names
						const p1Name = p1.speciesName.toLocaleLowerCase();
						const p2Name = p2.speciesName.toLocaleLowerCase();

						// Handle '(small)', '(average)', '(large)', '(super)' sizes
						const sizePriority = ['small', 'average', 'large', 'super'];

						const p1SizeIndex = sizePriority.findIndex((size) => p1Name.includes(`(${size})`));
						const p2SizeIndex = sizePriority.findIndex((size) => p2Name.includes(`(${size})`));

						if (p1SizeIndex !== p2SizeIndex) {
							return p1SizeIndex - p2SizeIndex;
						}

						// Default to alphabetical order by species name (meaning the forms come at the end, but before the megas, and that the forms are ordered alphabetically)
						return p1Name.localeCompare(p2Name);
					});
				break;
			case ListType.GREAT_LEAGUE:
			case ListType.ULTRA_LEAGUE:
			case ListType.MASTER_LEAGUE:
				const leaguePool = rankLists[listType - 1] ? Object.values(rankLists[listType - 1]).map(mapper) : [];
				const cupDomainFilter = (pokemon: IGamemasterPokemon) =>
					!pokemon.aliasId &&
					!pokemon.isMega &&
					(showShadow || !pokemon.isShadow) &&
					(showXL || !needsXLCandy(pokemon, cpThreshold)) &&
					(type1Filter === undefined || pokemon.types.includes(type1Filter)) &&
					(type2Filter === undefined || pokemon.types.includes(type2Filter));
				const cupDomainFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.aliasId && !pokemon.isMega;
				processedList = leaguePool.filter((p) => cupDomainFilter(p) && inputFilter(p, cupDomainFilterForFamily));
				break;
			case ListType.RAID:
				const preProcessedList: Array<IGamemasterPokemon> = [];
				if (!raidDPSFetchCompleted) {
					processedList = [];
					break;
				}

				Object.entries(raidDPS[type1Filter ? type1Filter.toString().toLocaleLowerCase() : '']).forEach(
					([speciesId, e], idx) => {
						const raidFilter = (pokemon: IGamemasterPokemon) =>
							!pokemon.aliasId && (showMega || !pokemon.isMega) && (showShadow || !pokemon.isShadow);
						const raidFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.aliasId;
						if (
							!raidFilter(gamemasterPokemon[speciesId]) ||
							!inputFilter(gamemasterPokemon[speciesId], raidFilterForFamily)
						) {
							return;
						}

						preProcessedList.push(gamemasterPokemon[speciesId]);
						cpStringOverrides[speciesId] = `${Math.round(e.dps * 100) / 100} DPS`;
						rankOverrides[speciesId] = idx + 1;
					}
				);

				processedList = preProcessedList;
				break;
			default:
				throw new Error(`Missing case in switch for ${listType}`);
		}

		return {
			processedList,
			cpStringOverrides,
			rankOverrides,
		};
	}, [
		gamemasterPokemon,
		listType,
		familyTree,
		showShadow,
		raidDPS,
		raidDPSFetchCompleted,
		showMega,
		showXL,
		cpThreshold,
		type1Filter,
		type2Filter,
		rankLists,
		inputText,
		fetchCompleted,
		pvpFetchCompleted,
		currentGameLanguage,
		pokemonByDex,
		pokemonByFamilyId,
	]);

	type LeagueOption = {
		label: ListType;
		value: string;
	};

	const leagueOptions: Array<LeagueOption> = useMemo(() => {
		return Object.entries(ListType)
			.filter(([, value]) => typeof value === 'number')
			.map(([key, value]) => {
				const pageValue = key.toLowerCase().replace('_league', '').replace('_', '');
				return { label: value as ListType, value: pageValue };
			});
	}, []);

	const typesOptions: Array<Entry<PokemonTypes | undefined>> = useMemo(() => {
		const base: Entry<PokemonTypes | undefined> = {
			label: translator(TranslatorKeys.Any, currentLanguage),
			value: undefined,
			hint: '',
		};
		return [
			base,
			...Object.keys(PokemonTypes)
				.filter((key) => isNaN(Number(PokemonTypes[key as keyof typeof PokemonTypes])))
				.map((k) => ({
					label: translatedType(PokemonTypes[k as keyof typeof PokemonTypes], currentLanguage),
					value: PokemonTypes[k as keyof typeof PokemonTypes],
					hint: `/images/types/${PokemonTypes[k as keyof typeof PokemonTypes].toString().toLocaleLowerCase()}.png`,
				})),
		];
	}, [currentLanguage]);

	return (
		<main className='pokedex-layout'>
			<PokemonHeader
				pokemonName={
					listType !== ListType.RAID && listType !== ListType.POKEDEX
						? `${translator(TranslatorKeys.Best1, currentLanguage)} ${gameTranslator(listType === ListType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : listType === ListType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : GameTranslatorKeys.MasterLeague, currentGameLanguage)} ${translator(TranslatorKeys.Best2, currentLanguage)}`
						: listType === ListType.RAID
							? `${translator(TranslatorKeys.BestRaids1, currentLanguage)} ${type1Filter ? translator(TranslatorKeys.BestRaids15, currentLanguage) : ''} ${type1Filter ? translatedType(type1Filter, currentLanguage) : ''} ${translator(TranslatorKeys.BestRaids2, currentLanguage)} ${gameTranslator(currentLanguage === Language.English ? GameTranslatorKeys.Raid : GameTranslatorKeys.Raids, currentGameLanguage)} ${translator(TranslatorKeys.BestRaids3, currentLanguage)}`
							: 'Pokédex'
				}
				type1={undefined}
				type2={undefined}
				defaultTextColor
				defaultBannerColor
				constrained
			/>
			<nav className='navigation-header padded-on-top extra-gap leagues'>
				<div className='row justified aligned with-big-gap full-width'>
					<div className='nav-dropdown-width'>
						<Select
							className={`navbar-dropdown-family`}
							isSearchable={false}
							value={leagueOptions.find((o) => o.value === (listTypeArg ?? 'pokedex')) ?? null}
							options={leagueOptions}
							onChange={(option) => {
								const selected = option as LeagueOption | null;
								if (selected) {
									void navigate(`/${(selected.value === 'pokedex' ? '' : selected.value) ?? ''}`);
								}
							}}
							formatOptionLabel={(data: LeagueOption) => (
								<div className='hint-container'>
									<div className='img-padding'>
										<img
											alt='egg'
											className='with-img-dropShadow'
											src={
												data.value === 'pokedex'
													? 'https://i.imgur.com/eBscnsv.png'
													: data.value === 'raid'
														? '/images/tx_raid_coin.png'
														: `/images/leagues/${data.value}.png`
											}
											style={{ width: 'auto' }}
											height={22}
											width={22}
										/>
									</div>
									<strong className='aligned-block ellipsed normal-text'>
										{data.value === 'pokedex'
											? 'Pokédex'
											: data.value === 'raid'
												? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)
												: (() => {
														const leagueKey = (data.value.substring(0, 1).toLocaleUpperCase() +
															data.value.substring(1) +
															'League') as keyof typeof GameTranslatorKeys;
														return gameTranslator(GameTranslatorKeys[leagueKey], currentGameLanguage);
													})()}
									</strong>
								</div>
							)}
						/>
					</div>
					<div className='smaller-nav-dropdown-width'>
						<Select
							className='navbar-dropdown-family'
							isSearchable={false}
							options={typesOptions}
							value={type1Filter === undefined ? typesOptions[0] : typesOptions.find((l) => l.value === type1Filter)}
							onChange={(v) => updateType1(v!.value)}
							formatOptionLabel={(data) => (
								<div className='hint-container'>
									{data?.hint && (
										<div className='img-padding'>
											<img
												alt='flag'
												style={{ width: 'auto' }}
												className='with-img-dropShadow'
												src={data.hint}
												height={22}
												width={22}
											/>
										</div>
									)}
									<strong className='aligned-block ellipsed normal-text'>{data?.label}</strong>
								</div>
							)}
						/>
					</div>
				</div>
			</nav>
			<div className='pokedex'>
				<div className={`with-flex contained padding-bar-bottom`}>
					{data.processedList
						.map((p) => (
							<div key={p.speciesId} className='mini-card-wrapper-padding dynamic-size'>
								<div className={`mini-card-wrapper`}>
									<PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} withBackground={false} withNumber numberOverride={data.rankOverrides[p.speciesId]} listType={listType}/>
								</div>
							</div>
						))}
				</div>
			</div>
		</main>
	);
};
export default Pokedex;
