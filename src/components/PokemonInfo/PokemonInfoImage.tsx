import { forwardRef } from "react";
import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(({pokemon}: IPokemonImage, ref) => {
    return (
        <div className="images_info_container">
            <img ref={ref} alt={pokemon.speciesName} src={pokemon.imageUrl} width="100%" height="100%"/>
            {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName} />}
        </div>
    );
});

export default PokemonImage;