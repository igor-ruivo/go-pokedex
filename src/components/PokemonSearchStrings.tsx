import './PokemonSearchStrings.scss';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLanguage } from '../contexts/language-context';
import { usePokemon } from '../contexts/pokemon-context';
import { customCupCPLimit } from '../contexts/pvp-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { LeagueType } from '../hooks/useLeague';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import {
	calculateCP,
	calculateHP,
	computeBestIVs,
	fetchPredecessorPokemonIncludingSelf,
	sortPokemonByBattlePowerAsc,
} from '../utils/pokemon-helper';
import translator, { TranslatorKeys } from '../utils/Translator';
import LoadingRenderer from './LoadingRenderer';

interface IPokemonSearchStringsProps {
	pokemon: IGamemasterPokemon;
	league: LeagueType;
}

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number): number => {
	const cachedValue = readPersistentValue(key);
	if (!cachedValue) {
		return defaultValue;
	}
	return +cachedValue;
};

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean): boolean => {
	const cachedValue = readPersistentValue(key);
	if (cachedValue === null) {
		return defaultValue;
	}
	return cachedValue === 'true';
};

const PokemonSearchStrings = ({ pokemon, league }: IPokemonSearchStringsProps) => {
	const [top, setTop] = useState<number>(parsePersistentCachedNumberValue(ConfigKeys.TopPokemonInSearchString, 10));
	const [trash, setTrash] = useState<boolean>(parsePersistentCachedBooleanValue(ConfigKeys.TrashString, false));

	const { gamemasterPokemon, fetchCompleted } = usePokemon();

	const predecessorPokemon = useMemo(
		() => fetchPredecessorPokemonIncludingSelf(pokemon, gamemasterPokemon),
		[pokemon, gamemasterPokemon]
	);
	const predecessorPokemonArray = useMemo(() => Array.from(predecessorPokemon), [predecessorPokemon]);

	const { currentLanguage, currentGameLanguage } = useLanguage();

	useEffect(() => {
		writePersistentValue(ConfigKeys.TopPokemonInSearchString, top.toString());
	}, [top]);

	useEffect(() => {
		writePersistentValue(ConfigKeys.TrashString, trash.toString());
	}, [trash]);

	useEffect(() => {
		const textAreas: Array<HTMLTextAreaElement> = predecessorPokemonArray
			.map((p) => document.getElementById(p.speciesId + '-textarea'))
			.filter((e): e is HTMLTextAreaElement => e instanceof HTMLTextAreaElement);

		const eventListener = (event: MouseEvent) => {
			const target = event.target as HTMLTextAreaElement;
			target.select();
			document.execCommand('copy');
			alert('Copied to clipboard.');
		};

		textAreas.forEach((t) => {
			t.addEventListener('click', eventListener);
		});

		return () => {
			textAreas.forEach((t) => {
				t.removeEventListener('click', eventListener);
			});
		};
	}, [pokemon, predecessorPokemonArray]);

	let cpCap = Number.MAX_VALUE;

	switch (league) {
		case LeagueType.GREAT_LEAGUE:
			cpCap = 1500;
			break;
		case LeagueType.ULTRA_LEAGUE:
			cpCap = 2500;
			break;
		case LeagueType.MASTER_LEAGUE:
			cpCap = Number.MAX_VALUE;
			break;
		case LeagueType.RAID:
			cpCap = Number.MAX_VALUE;
			break;
		case LeagueType.CUSTOM_CUP:
			cpCap = customCupCPLimit;
			break;
	}

	// getRanges: Accepts an array of numbers, returns an array of string ranges
	const getRanges = useCallback((array: Array<number>): Array<string> => {
		if (array.length === 0) return [];

		const sorted = [...array].sort((a, b) => a - b);
		const result: Array<string> = [];

		let start = sorted[0];
		let end = sorted[0];

		for (let i = 1; i < sorted.length; i++) {
			const current = sorted[i];
			if (current === end + 1) {
				end = current;
			} else {
				result.push(start === end ? `${start}` : `${start}-${end}`);
				start = end = current;
			}
		}

		result.push(start === end ? `${start}` : `${start}-${end}`);
		return result;
	}, []);

	// groupAttr: Accepts a set of numbers and a language string, returns a formatted string
	const groupAttr = useCallback(
		(input: Set<number>, lang: string): string => {
			const output = Array.from(input);
			output.sort((a, b) => a - b);
			const ranges = getRanges(output);
			if (ranges.length < 1) {
				console.log('groupAttr: No output(' + JSON.stringify(ranges) + "), returning empty string('')");
				return '';
			}
			let checkStr = ranges.join(',') + lang;
			const splitStr = checkStr.split(',');
			if (splitStr.length > 1) {
				for (let i = 0; i < splitStr.length; i++) {
					if (!splitStr[i].includes(lang)) {
						splitStr[i] = splitStr[i] + lang;
					}
				}
				checkStr = splitStr.join(',');
			}
			return ',' + checkStr;
		},
		[getRanges]
	);

	// get_matching_string: Accepts an array of numbers and a string, returns a formatted string
	const get_matching_string = useCallback((a: Array<number>, t: string): string => {
		let list = '';
		let last = -1;
		for (let i = 0; i < a.length; i++) {
			if (a[i] === last + 1) {
				list += '-';
				last = a[i];
				while (++i < a.length) {
					if (a[i] !== last + 1) break;
					last = a[i];
				}
				if (a[--i] < 9999) {
					list += a[i];
				}
			} else {
				list += ',' + t + a[i];
				last = a[i];
			}
		}
		return list.substring(1);
	}, []);

	// trashFlip: Accepts a set of numbers, a max value, and a boolean, returns a set of numbers
	const trashFlip = useCallback((cps: Set<number>, maxCP: number, attr: boolean): Set<number> => {
		for (let i = attr ? 0 : 10; i <= maxCP; i++) {
			if (cps.has(i)) {
				cps.delete(i);
			} else {
				cps.add(i);
			}
		}
		return cps;
	}, []);

	const computeSearchString = useCallback(
		(predecessorPokemon: IGamemasterPokemon): string => {
			if (!pokemon) {
				return '';
			}

			const cps: Array<Set<number>> = [];
			const hps: Array<Set<number>> = [];
			const atkivs: Array<Set<number>> = [];
			const defivs: Array<Set<number>> = [];
			const hpivs: Array<Set<number>> = [];

			for (let i = 0; i <= 4; i++) {
				cps[i] = new Set<number>();
				hps[i] = new Set<number>();
				atkivs[i] = new Set<number>();
				defivs[i] = new Set<number>();
				hpivs[i] = new Set<number>();
			}

			const maxCP: Array<number> = Array.from({ length: 5 }, () => 0);
			const maxHP: Array<number> = Array.from({ length: 5 }, () => 0);

			const topIVCombinations = Object.values(
				computeBestIVs(pokemon.baseStats.atk, pokemon.baseStats.def, pokemon.baseStats.hp, cpCap)
			).flat();

			for (let i = 0; i < top; i++) {
				const topIVCombination = topIVCombinations[i];
				const maxLevel = topIVCombination.L;

				const atkBucket = topIVCombination.IVs.A === 15 ? 4 : Math.ceil(topIVCombination.IVs.A / 5);
				const defBucket = topIVCombination.IVs.D === 15 ? 4 : Math.ceil(topIVCombination.IVs.D / 5);
				const hpBucket = topIVCombination.IVs.S === 15 ? 4 : Math.ceil(topIVCombination.IVs.S / 5);

				const star = topIVCombination.IVs.star;

				const baseatk = predecessorPokemon.baseStats.atk;
				const basedef = predecessorPokemon.baseStats.def;
				const basesta = predecessorPokemon.baseStats.hp;

				for (let j = 0; j <= (Math.min(35, maxLevel) - 1) * 2; j += 2) {
					const cp = calculateCP(
						baseatk,
						topIVCombination.IVs.A,
						basedef,
						topIVCombination.IVs.D,
						basesta,
						topIVCombination.IVs.S,
						j
					);
					const hp = calculateHP(basesta, topIVCombination.IVs.S, j);
					cps[star].add(cp);
					hps[star].add(hp);
					atkivs[star].add(atkBucket);
					defivs[star].add(defBucket);
					hpivs[star].add(hpBucket);

					if (maxCP[star] < cp) {
						maxCP[star] = cp;
					}

					if (maxHP[star] < hp) {
						maxHP[star] = hp;
					}
				}
			}

			let result = predecessorPokemon.dex.toString();

			if (trash) {
				for (let i = 0; i < atkivs.length; i++) {
					atkivs[i] = trashFlip(atkivs[i], 4, true);
					defivs[i] = trashFlip(defivs[i], 4, true);
					hpivs[i] = trashFlip(hpivs[i], 4, true);
				}
			}

			let emptyBuf = '';

			for (let i = 0; i < 4; i++) {
				if (cps[i].size > 0) {
					if (trash) {
						cps[i] = trashFlip(cps[i], maxCP[i], false);

						/* skip empty hps */
						if (hps[i].size > 0) {
							hps[i] = trashFlip(hps[i], maxHP[i], false);
						}
					}

					const sortedCps = Array.from(cps[i]).sort((a, b) => a - b);
					result +=
						'&!' + i + '*' + groupAttr(atkivs[i], gameTranslator(GameTranslatorKeys.AttackSearch, currentGameLanguage));
					if (!trash) {
						result += '&!' + i + '*';
					}
					result += groupAttr(defivs[i], gameTranslator(GameTranslatorKeys.DefenseSearch, currentGameLanguage));
					if (!trash) {
						result += '&!' + i + '*';
					}
					result += groupAttr(hpivs[i], gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage));
					if (!trash) {
						result += '&!' + i + '*';
					}
					result += ',' + get_matching_string(sortedCps, gameTranslator(GameTranslatorKeys.CP, currentGameLanguage));
					if (!trash) {
						result += '&!' + i + '*';
					} else {
						result += ',' + gameTranslator(GameTranslatorKeys.CP, currentGameLanguage) + String(maxCP[i] + 1) + '-';
					}
					if (hps[i].size > 0) {
						const sortedHps = Array.from(hps[i]).sort((a, b) => a - b);
						result +=
							',' + get_matching_string(sortedHps, gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage));
						if (trash) {
							result +=
								',' + gameTranslator(GameTranslatorKeys.HPSearch, currentGameLanguage) + String(maxHP[i] + 1) + '-';
						}
					}
				} else if (!trash) {
					emptyBuf += '&!' + i + '*';
				}
			}

			result += emptyBuf;

			if (trash) {
				result += '&!4*';
			} else {
				if (cps[4].size > 0) {
					result += ',4*';
				}
			}

			return result;
		},
		[cpCap, currentGameLanguage, get_matching_string, groupAttr, pokemon, top, trash, trashFlip]
	);

	return (
		<LoadingRenderer errors={''} completed={fetchCompleted && !!gamemasterPokemon}>
			{() =>
				fetchCompleted &&
				!!gamemasterPokemon &&
				(league !== LeagueType.RAID ? (
					<div className='banner_layout normal-text'>
						<div className='extra-ivs-options item default-padding'>
							<div className='with-padding'>
								Top{' '}
								<select value={top} onChange={(e) => setTop(Number(e.target.value))} className='select-level'>
									{Array.from({ length: 4096 }, (_x, i) => i + 1).map((e) => (
										<option key={e} value={e}>
											{e}
										</option>
									))}
								</select>
								&nbsp;&nbsp;&nbsp;
								{translator(TranslatorKeys.TrashString, currentLanguage)}{' '}
								<input type='checkbox' checked={trash} onChange={(_) => setTrash((previous) => !previous)} />
							</div>
						</div>

						{predecessorPokemonArray.sort(sortPokemonByBattlePowerAsc).map((p) => (
							<div key={p.speciesId} className='textarea-label item default-padding'>
								<span>
									{p.speciesId === pokemon.speciesId
										? `${translator(TranslatorKeys.Find, currentLanguage)} ${!trash ? '' : translator(TranslatorKeys.AllExcept, currentLanguage)} ${translator(TranslatorKeys.FindTop, currentLanguage)} ${top} ${p.speciesName.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} (${translator(TranslatorKeys.WildUnpowered, currentLanguage)}) ${translator(TranslatorKeys.ForLeague, currentLanguage)} ${league === LeagueType.GREAT_LEAGUE ? gameTranslator(GameTranslatorKeys.GreatLeague, currentGameLanguage) : league === LeagueType.ULTRA_LEAGUE ? gameTranslator(GameTranslatorKeys.UltraLeague, currentGameLanguage) : league === LeagueType.CUSTOM_CUP ? gameTranslator(GameTranslatorKeys.FantasyCup, currentGameLanguage) : gameTranslator(GameTranslatorKeys.MasterLeague, currentGameLanguage)}:`
										: `${translator(TranslatorKeys.Find, currentLanguage)} ${p.speciesName.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} (${translator(TranslatorKeys.WildUnpowered, currentLanguage)}) ${translator(TranslatorKeys.ThatResultIn, currentLanguage)} ${!trash ? '' : translator(TranslatorKeys.AllExcept, currentLanguage)} ${translator(TranslatorKeys.FindTop, currentLanguage)} ${top} ${pokemon.speciesName.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} ${translator(TranslatorKeys.ForLeague, currentLanguage)} ${league === LeagueType.GREAT_LEAGUE ? gameTranslator(GameTranslatorKeys.GreatLeague, currentGameLanguage) : league === LeagueType.ULTRA_LEAGUE ? gameTranslator(GameTranslatorKeys.UltraLeague, currentGameLanguage) : league === LeagueType.CUSTOM_CUP ? gameTranslator(GameTranslatorKeys.FantasyCup, currentGameLanguage) : gameTranslator(GameTranslatorKeys.MasterLeague, currentGameLanguage)}:`}
								</span>
								<textarea
									id={p.speciesId + '-textarea'}
									className='search-strings-container'
									value={computeSearchString(p)}
									readOnly
								/>
							</div>
						))}
					</div>
				) : (
					<div className='item default-padding centered normal-text'>
						<span className='with-padding'>
							{translator(TranslatorKeys.NotAvailableForRaids, currentLanguage)}{' '}
							{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}.
						</span>
					</div>
				))
			}
		</LoadingRenderer>
	);
};

export default PokemonSearchStrings;
