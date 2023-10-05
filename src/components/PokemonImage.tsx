import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonImage.css";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
    xl?: boolean;
    buddy?: boolean;
}

const PokemonImage = ({pokemon, xl, buddy}: IPokemonImage) => {
    return (
        <div className="images_container">
            <img className="grid-image" alt={pokemon.speciesName} height={475} width={475} src={pokemon.imageUrl}/>
            {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName} />}
            {xl && <img className='image xl-overlay' src='https://i.imgur.com/NTtZq10.png' width="100%" height="100%"/>}
            {buddy && <img className='image buddy-overlay' src='https://i.imgur.com/MGCXGl0.png' width="100%" height="100%"/>}
        </div>
    );
}

export default PokemonImage;