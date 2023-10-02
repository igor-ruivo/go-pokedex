import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber/PokemonNumber";
import PokemonTypes from "./PokemonType/PokemonTypes";
import { ListType } from "../views/pokedex";

interface IPokemonCardProps {
  pokemon: IGamemasterPokemon,
  listType: ListType
}

const PokemonCard = ({pokemon, listType}: IPokemonCardProps) => {
  const link = `/pokemon/${pokemon.speciesId}`;

    return (
      <Link to={link}>
        <div className="pokemon_card">
          <div className="header_container">
            <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} listType={listType} />
            <PokemonTypes types={pokemon.types} />
          </div>
          <PokemonImage pokemon={pokemon} />
          <div className="header_footer">
            {pokemon.speciesName
              .replace("(Alolan)", "(A)")
              .replace("(Galarian)", "(G)")
              .replace("(Mega)", "(M)")
              .replace("(Shadow)", "(S)")
              .replace("(Complete Forme)", "(CF)")
              .replace("(50% Forme)", "(50% F)")
              .replace("(10% Forme)", "(10% F)")
              .replace("(Hisuian)", "(H)")
              .replace("(Standard)", "(Std.)")
              .replace("(Incarnate)", "(Inc.)")
              .replace("(Average)", "(Avg.)")
              .replace("Male", "♂")
              .replace("Female", "♀")}
          </div>
        </div>
      </Link>
    );
}

export default PokemonCard;