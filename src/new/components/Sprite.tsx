import { ImageSource, useImageSource } from '../../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';

export const spriteUrl = (pokemon: IGamemasterPokemon, source: ImageSource): string => {
	if (source === ImageSource.Shiny) {
		return pokemon.shinyGoImageUrl || pokemon.goImageUrl || pokemon.imageUrl;
	}
	if (source === ImageSource.GO) {
		return pokemon.goImageUrl || pokemon.imageUrl;
	}
	return pokemon.imageUrl || pokemon.goImageUrl;
};

export const Sprite = ({ pokemon, alt }: { pokemon: IGamemasterPokemon; alt?: string }) => {
	const { imageSource } = useImageSource();
	return (
		<div className='r-sprite'>
			<img src={spriteUrl(pokemon, imageSource)} alt={alt ?? pokemon.speciesName} decoding='async' />
		</div>
	);
};
