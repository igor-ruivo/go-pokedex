import { ShadowMark } from '../../components/ShadowMark';
import { SparkleIcon } from '../../components/SparkleIcon';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';

/**
 * One Pokémon, big, on a slanted panel at the end of a card's header — the same piece as the league and raid-type cards' (see
 * `.h-league-hero` in home.css). Decorative: the card's own link says where it goes. A shiny-able one keeps its sparkle and a Shadow
 * one its flame. A card with the room (the stretched Eggs one) can show `extras` beside it, all of the same size, in the order given.
 */
export const TileHero = ({
	pokemon,
	shiny,
	shadow,
	more = 0,
	extras = [],
}: {
	pokemon: IGamemasterPokemon;
	shiny?: boolean | undefined;
	shadow?: boolean | undefined;
	/** How many more Pokémon the card has besides these: a "+N" at the sprite's side. */
	more?: number | undefined;
	extras?: ReadonlyArray<{ pokemon: IGamemasterPokemon; shiny?: boolean | undefined }>;
}) => (
	<span className='h-league-hero h-tile-hero' aria-hidden='true'>
		{extras.length === 0 ? (
			<>
				<SpriteImg pokemon={pokemon} loading='lazy' />
				{(shadow === true || pokemon.isShadow) && <ShadowMark />}
				{shiny && <SparkleIcon className='h-day-shiny' />}
			</>
		) : (
			<span className='h-tile-hero-row'>
				{[{ pokemon, shiny }, ...extras].map((h) => (
					<span key={h.pokemon.speciesId} className='h-tile-hero-slot'>
						<SpriteImg pokemon={h.pokemon} loading='lazy' />
						{(shadow === true || h.pokemon.isShadow) && <ShadowMark />}
						{h.shiny && <SparkleIcon className='h-day-shiny' />}
					</span>
				))}
			</span>
		)}
		{more > 0 && <i className='h-tile-more'>+{more}</i>}
	</span>
);
