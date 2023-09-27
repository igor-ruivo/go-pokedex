import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon
}

const PokemonImage = ({pokemon}: IPokemonImage) => {
    return (
        <div className="images_info_container">
            <img alt={pokemon.speciesName} src={pokemon.imageUrl} width="100%" height="100%"/>
            {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/iQGDV5T.png" alt={pokemon.speciesName} />}
        </div>
    );
}

export default PokemonImage;