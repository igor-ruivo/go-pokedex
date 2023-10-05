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
  var cp = Math.floor(((pokemon.atk + 15) * Math.pow(pokemon.def + 15, 0.5) * Math.pow(pokemon.hp + 15, 0.5) * Math.pow(0.795300006866455, 2) ) / 10);

  // too expensive
  //const [ivPercents, loading] = useComputeIVs({pokemon: pokemon, levelCap: 51, attackIV: 15, defenseIV: 15, hpIV: 15, justForSelf: true})
  const showXL = listType === ListType.GREAT_LEAGUE && cp < 1500 + 150 || listType === ListType.ULTRA_LEAGUE && cp < 2500 + 150;
  
  return (
      <Link to={link}>
        <div className="pokemon_card">
          <div className="header_container">
            <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} listType={listType} />
            <PokemonTypes types={pokemon.types} />
          </div>
          <PokemonImage pokemon={pokemon} xl={showXL}/>
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