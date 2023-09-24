import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon,
    height: number,
    width: number
}

const PokemonImage = ({pokemon, height, width}: IPokemonImage) => {
    return (
        <div className="images_container">
            <img alt={pokemon.speciesName} height={height} width={width} src={pokemon.imageUrl}/>
            {pokemon.isShadow && <img className='image shadow-overlay' src="https://i.imgur.com/iQGDV5T.png" alt={pokemon.speciesName} height={height} width={width} />}
        </div>
    );
}

export default PokemonImage;