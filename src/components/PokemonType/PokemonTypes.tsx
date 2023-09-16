import { PokemonTypes as PokemonTypesType } from "../../DTOs/PokemonTypes";
import "./PokemonTypes.scss";

type IPokemonTypesProps = {
  types: PokemonTypesType[],
}

const PokemonTypes = ({ types }: IPokemonTypesProps) => {
  return (
      <div className="pokemon_types">
      {`${types[0].toString().substring(0, 1)} ${types[1].toString().substring(0, 1)}`}
      </div>
  );
}

export default PokemonTypes;