import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import { useContext } from "react";
import PokemonContext from "../contexts/pokemon-context";
import { ListType } from "./ControlPanel";

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
  pokemon: IGamemasterPokemon,
  type: ListType
}

const PokemonCard = ({pokemon, type}: IPokemonCardProps) => {
  const {rankLists} = useContext(PokemonContext);
  const fetchPokemonRank = (): string => {
    const rank = rankLists[type - 1].find(p => p.speciesId === pokemon.speciesId)!.rank;
    switch (rank) {
      case 1:
        return "🥇" + rank + "º";
      case 2:
        return "🥈" + rank + "º";
      case 3:
        return "🥉" + rank + "º";
      default:
        return rank + "º";
    }
  }

  const link = `/pokemon/${pokemon.speciesId}`;
    return (
      <Link to={link}>
        <div className="pokemon_card">
          <PokemonImage pokemon={pokemon} />
          {type === ListType.POKEDEX ? "#" + pokemonNumberGenerator(pokemon.dex as number) : fetchPokemonRank()} {pokemon.speciesName}
        </div>
      </Link>
    );
}

export default PokemonCard;