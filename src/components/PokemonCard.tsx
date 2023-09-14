import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"

const pokemonNumberGenerator = (dex: number): string => {
  let urlDex = "" + dex;
  const zerosToAddToUrl = 4 - urlDex.length;

  if (zerosToAddToUrl > 0) {
      for (let i = 0; i < zerosToAddToUrl; i++) {
          urlDex = "0" + urlDex;
      }
  }

  return urlDex;
}

const PokemonCard = ({dex, speciesName, imageUrl, types, isShadow} : Partial<IGamemasterPokemon>) => {
    return (
      <div className="pokemon_card">
        <div className="images_container">
          <img className="image" alt={speciesName} height={475} width={475} src={imageUrl}/>
          {isShadow && <img className='image shadow-overlay' src="https://i.imgur.com/4FYNAqX.png" alt={speciesName} height={475} width={475} />}
        </div>
        #{pokemonNumberGenerator(dex as number)} {speciesName}
      </div>
    );
}

export default PokemonCard;