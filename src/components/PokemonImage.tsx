import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon
}

const PokemonImage = ({pokemon}: IPokemonImage) => {
    return (
        <div className="images_container">
            <img className="grid-image" alt={pokemon.speciesName} height={475} width={475} src={pokemon.imageUrl}/>
            {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName} />}
        </div>
    );
}

export default PokemonImage;