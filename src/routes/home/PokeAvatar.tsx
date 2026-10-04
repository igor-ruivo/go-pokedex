import { ShadowMark } from '../../components/ShadowMark';
import { SparkleIcon } from '../../components/SparkleIcon';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';

/**
 * The round sprite of the Home page (the counter rows' plate). A Shadow Pokémon always carries the Shadow mark — also when
 * the list only gives its base species but every one of them is a Shadow (a Team GO Rocket line-up: `shadow`) — and a
 * shiny-able one the sparkle.
 */
export const PokeAvatar = ({
	pokemon,
	shiny,
	shadow,
	className,
}: {
	pokemon: IGamemasterPokemon;
	shiny?: boolean | undefined;
	shadow?: boolean | undefined;
	className?: string | undefined;
}) => (
	<span className={`r-ctr-art h-avatar${className ? ` ${className}` : ''}`} title={cleanName(pokemon.speciesName)}>
		<SpriteImg pokemon={pokemon} loading='lazy' />
		{(shadow === true || pokemon.isShadow) && <ShadowMark />}
		{shiny && <SparkleIcon className='h-avatar-shiny' />}
	</span>
);
