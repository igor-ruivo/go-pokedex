import { ImageSource, useImageSource } from '../../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { ShadowMark } from './ShadowMark';

export const spriteUrl = (pokemon: IGamemasterPokemon, source: ImageSource): string => {
	if (source === ImageSource.Shiny) {
		return pokemon.shinyGoImageUrl || pokemon.goImageUrl || pokemon.imageUrl;
	}
	if (source === ImageSource.GO) {
		return pokemon.goImageUrl || pokemon.imageUrl;
	}
	return pokemon.imageUrl || pokemon.goImageUrl;
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
			<img src={src ?? spriteUrl(pokemon, imageSource)} alt={alt ?? pokemon.speciesName} decoding='async' />
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
