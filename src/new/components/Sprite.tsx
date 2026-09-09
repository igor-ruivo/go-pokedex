import { ImageSource, useImageSource } from '../../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { goBaseUrl } from '../../utils/Configs';
import { ShadowMark } from './ShadowMark';

/**
 * `goImageUrl` / `shinyGoImageUrl` in the game-master are repo-relative
 * (e.g. "248.icon.png") — they must be prefixed with the PokeMiners asset base.
 * `imageUrl` is already an absolute pokemon.com URL.
 */
export const goSpriteUrl = (relativePath: string): string => (relativePath ? goBaseUrl + relativePath : '');

export const spriteUrl = (pokemon: IGamemasterPokemon, source: ImageSource): string => {
	if (source === ImageSource.Shiny && pokemon.shinyGoImageUrl) {
		return goSpriteUrl(pokemon.shinyGoImageUrl);
	}
	if ((source === ImageSource.Shiny || source === ImageSource.GO) && pokemon.goImageUrl) {
		return goSpriteUrl(pokemon.goImageUrl);
	}
	return pokemon.imageUrl || goSpriteUrl(pokemon.goImageUrl);
};

export const Sprite = ({
	pokemon,
	alt,
	src,
	onTap,
	hint,
}: {
	pokemon: IGamemasterPokemon;
	alt?: string;
	/** Override the computed sprite URL (for the hero sprite carousel). */
	src?: string;
	/** Makes the sprite tappable (cycles the sprite source on the hero). */
	onTap?: () => void;
	/** Carousel position hint dots under the sprite. */
	hint?: { count: number; active: number };
}) => {
	const { imageSource } = useImageSource();
	const resolved = src ?? spriteUrl(pokemon, imageSource);
	return (
		<div
			className='r-sprite'
			data-tappable={onTap ? '' : undefined}
			{...(onTap
				? {
						role: 'button',
						tabIndex: 0,
						onClick: onTap,
						onKeyDown: (e: React.KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onTap();
							}
						},
					}
				: {})}
		>
			{pokemon.isShadow && <ShadowMark className='r-shadow-mark r-sprite-shadow' />}
			<img
				src={resolved}
				alt={alt ?? pokemon.speciesName}
				decoding='async'
				onError={(e) => {
					// a missing GO / shiny asset falls back to the official artwork
					const img = e.currentTarget;
					if (pokemon.imageUrl && img.src !== pokemon.imageUrl) {
						img.src = pokemon.imageUrl;
					}
				}}
			/>
			{hint && hint.count > 1 && (
				<span className='r-sprite-dots' aria-hidden='true'>
					{Array.from({ length: hint.count }, (_, i) => (
						<i key={i} data-on={i === hint.active} />
					))}
				</span>
			)}
		</div>
	);
};
