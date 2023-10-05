import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber/PokemonNumber";
import PokemonTypes from "./PokemonType/PokemonTypes";
import { ListType } from "../views/pokedex";
import useComputeIVs from "../hooks/useComputeIVs";

interface IPokemonCardProps {
  pokemon: IGamemasterPokemon,
  listType: ListType
}

const PokemonCard = ({pokemon, listType}: IPokemonCardProps) => {
  const link = `/pokemon/${pokemon.speciesId}`;

  const pokemonNeedsToSurpassLevel = (level: number) => {
    if (loading) {
      return false;
    }
    return listType === ListType.GREAT_LEAGUE && ivPercents[pokemon.speciesId].greatLeagueLvl > level || listType === ListType.ULTRA_LEAGUE && ivPercents[pokemon.speciesId].ultraLeagueLvl > level;
  }

  const [ivPercents, loading] = useComputeIVs({pokemon: pokemon, levelCap: 51, attackIV: 15, defenseIV: 15, hpIV: 15})
  const showXL = pokemonNeedsToSurpassLevel(40);
  const showBuddy = pokemonNeedsToSurpassLevel(50);
  return (
      <Link to={link}>
        <div className="pokemon_card">
          <div className="header_container">
            <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} listType={listType} />
            <PokemonTypes types={pokemon.types} />
          </div>
          <PokemonImage pokemon={pokemon} xl={showXL} buddy={showBuddy}/>
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