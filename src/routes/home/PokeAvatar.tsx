import { useMemo } from 'react';

import { ShadowMark } from '../../components/ShadowMark';
import { SparkleIcon } from '../../components/SparkleIcon';
import { SpriteImg } from '../../components/Sprite';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { gigantamaxOf } from '../../lib/max-forms';
import { usePokemon } from '../../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';

/**
 * The round sprite of the Home page (the counter rows' plate). A Shadow Pokémon always carries the Shadow mark — also when
 * the list only gives its base species but every one of them is a Shadow (a Team GO Rocket line-up: `shadow`) — and a
 * shiny-able one the sparkle. A Max Battle Pokémon (`maxForm`) wears the Dynamax cloud over its picture, or for a Gigantamax
 * one is drawn with its own artwork (as the calendar's tiles do).
 */
export const PokeAvatar = ({
	pokemon,
	shiny,
	shadow,
	className,
	maxForm,
}: {
	pokemon: IGamemasterPokemon;
	shiny?: boolean | undefined;
	shadow?: boolean | undefined;
	className?: string | undefined;
	maxForm?: string | undefined;
}) => {
	const { gamemasterPokemon } = usePokemon();
	const { currentGameLanguage: gl } = useLanguage();
	const shown = useMemo(
		() =>
			maxForm === 'gigantamax'
				? gigantamaxOf(pokemon, gamemasterPokemon, gameTranslator(GameTranslatorKeys.GigantamaxDisplay, gl))
				: pokemon,
		[pokemon, maxForm, gamemasterPokemon, gl]
	);
	return (
		<span className={`r-ctr-art h-avatar${className ? ` ${className}` : ''}`} title={cleanName(shown.speciesName)}>
			<SpriteImg pokemon={shown} loading='lazy' />
			{maxForm === 'dynamax' && <img className='r-avatar-max' src='/images/max/dynamax.png' alt='' loading='lazy' />}
			{(shadow === true || pokemon.isShadow) && <ShadowMark />}
			{shiny && <SparkleIcon className='h-avatar-shiny' />}
		</span>
	);
};
