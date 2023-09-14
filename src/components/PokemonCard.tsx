import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";

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

interface IPokemonCardProps {
  pokemon: IGamemasterPokemon
}

const PokemonCard = ({pokemon}: IPokemonCardProps) => {
  const link = `/pokemon/${pokemon.speciesId}`;
    return (
      <Link to={link}>
        <div className="pokemon_card">
          <PokemonImage pokemon={pokemon} />
          #{pokemonNumberGenerator(pokemon.dex as number)} {pokemon.speciesName}
        </div>
      </Link>
    );
}

export default PokemonCard;