import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber/PokemonNumber";
import PokemonTypes from "./PokemonType/PokemonTypes";

interface IPokemonCardProps {
  pokemon: IGamemasterPokemon
}

const PokemonCard = ({pokemon}: IPokemonCardProps) => {
  const link = `/pokemon/${pokemon.speciesId}`;

    return (
      <Link to={link}>
        <div className="pokemon_card">
          <div className="header_container">
            <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} />
            <PokemonTypes types={pokemon.types} />
          </div>
          <PokemonImage pokemon={pokemon} />
          <div className="header_footer">
            {pokemon.speciesName}
          </div>
        </div>
      </Link>
    );
}

export default PokemonCard;