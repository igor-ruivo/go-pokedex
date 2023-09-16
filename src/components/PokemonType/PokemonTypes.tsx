import { PokemonTypes as PokemonTypesType } from "../../DTOs/PokemonTypes";
import "./PokemonTypes.scss";

type IPokemonTypesProps = {
  types: PokemonTypesType[],
}

const PokemonTypes = ({ types }: IPokemonTypesProps) => {
  return (
      <div className="pokemon_types">
        {types.map(t => {
          const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${t}.png`;
          return <img className="type-icon" key={t} src={url} alt={t.toString()} width="20" height="20"/>
        })}
      </div>
  );
}

export default PokemonTypes;