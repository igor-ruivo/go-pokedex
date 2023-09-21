import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon
}

const PokemonImage = ({pokemon}: IPokemonImage) => {
    return (
        <div className="images_container">
            <img className="image" alt={pokemon.speciesName} height={64} width={64} src={pokemon.imageUrl}/>
            {pokemon.isShadow && <img className='image shadow-overlay' src="https://i.imgur.com/iQGDV5T.png" alt={pokemon.speciesName} height={475} width={475} />}
        </div>
    );
}

export default PokemonImage;