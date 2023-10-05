import { forwardRef } from "react";
import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
    xl?: boolean;
    buddy?: boolean;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(({pokemon, xl, buddy}: IPokemonImage, ref) => {
    return (
        <div className="images_info_container">
            <img ref={ref} alt={pokemon.speciesName} src={pokemon.imageUrl} width="100%" height="100%"/>
            {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName} />}
            {xl && <img className='image xl-overlay' src='https://i.imgur.com/NTtZq10.png' width="100%" height="100%"/>}
            {buddy && <img className='image buddy-overlay' src='https://i.imgur.com/MGCXGl0.png' width="100%" height="100%"/>}
        </div>
    );
});

export default PokemonImage;