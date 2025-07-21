import './PokemonCard.scss';

import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import { usePvp } from '../contexts/pvp-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import useCountdown from '../hooks/useCountdown';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { calculateCP, needsXLCandy } from '../utils/pokemon-helper';
import { ListType } from '../views/pokedex';
import PokemonImage from './PokemonImage';
import PokemonNumber from './PokemonNumber';
import PokemonTypes from './PokemonTypes';

interface IPokemonCardProps {
	pokemon: IGamemasterPokemon;
	listType: ListType;
	cpStringOverride?: string;
	rankOverride?: number;
	shinyBadge?: boolean;
	withCountdown?: number;
}

const PokemonCard = ({
	pokemon,
	listType,
	cpStringOverride,
	rankOverride,
	shinyBadge,
	withCountdown,
}: IPokemonCardProps) => {
	const { days, hours, minutes, seconds } = useCountdown(withCountdown ?? 0);
	const { currentGameLanguage } = useLanguage();
	const { rankLists } = usePvp();

	const link = `/pokemon/${pokemon.speciesId}/info`;

	let cpThreshold = 0;
	switch (listType) {
		case ListType.GREAT_LEAGUE:
			cpThreshold = 1500;
			break;
		case ListType.ULTRA_LEAGUE:
			cpThreshold = 2500;
			break;
	}

	const getCPContainerString = useCallback(() => {
		if (withCountdown) {
			if (!days && !hours && !minutes && !seconds) {
				return 'Expired';
			}

			return days > 0 ? `${days} day${days > 1 ? 's' : ''} left` : `${hours}h:${minutes}m:${seconds}s`;
		}

		if (cpStringOverride) {
			return cpStringOverride;
		}

		if (listType === ListType.POKEDEX) {
			return `${calculateCP(pokemon.baseStats.atk, 15, pokemon.baseStats.def, 15, pokemon.baseStats.hp, 15, 100)} ${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}`;
		}

		if (listType !== ListType.RAID) {
			if (!rankLists[listType - 1]) {
				return '0';
			}

			return `${rankLists[listType - 1][pokemon.speciesId].score}%`;
		}
	}, [
		days,
		cpStringOverride,
		currentGameLanguage,
		hours,
		listType,
		minutes,
		pokemon,
		rankLists,
		seconds,
		withCountdown,
	]);

	return (
		<Link to={link}>
			<div className='pokemon-card'>
				<span className='header-container'>
					<PokemonNumber
						dex={pokemon.dex}
						speciesId={pokemon.speciesId}
						listType={listType}
						rankOverride={rankOverride}
					/>
					<PokemonTypes types={pokemon.types} />
				</span>
				<span className='card-content'>
					<PokemonImage
						pokemon={pokemon}
						xl={needsXLCandy(pokemon, cpThreshold)}
						shiny={shinyBadge}
						withName
						lazy
						allowHyperSize
					/>
				</span>
				<span className='header-footer'>
					<span className='cp-container heavy-weighted-font'>{getCPContainerString()}</span>
				</span>
			</div>
		</Link>
	);
};

export default PokemonCard;
