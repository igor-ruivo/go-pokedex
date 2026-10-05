import type { CSSProperties } from 'react';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { ShadowMark } from './ShadowMark';
import { SparkleIcon } from './SparkleIcon';
import { SpriteImg } from './Sprite';

/**
 * A Pokémon's sprite with its adorners: the Shadow mark when it is a Shadow Pokémon and the sparkle when it can be shiny. The
 * box takes the size its parent gives it (`className`), the sprite fills it.
 */
export const AdornedSprite = ({
	pokemon,
	shiny,
	className,
	style,
}: {
	pokemon: IGamemasterPokemon;
	shiny?: boolean | undefined;
	className?: string | undefined;
	style?: CSSProperties | undefined;
}) => (
	<span className={className ? `r-adorned ${className}` : 'r-adorned'} style={style}>
		<SpriteImg pokemon={pokemon} loading='lazy' />
		{pokemon.isShadow && <ShadowMark className='r-adorned-shadow' />}
		{shiny && <SparkleIcon className='r-adorned-sparkle' />}
	</span>
);
