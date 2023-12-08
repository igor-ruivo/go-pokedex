import { PokemonTypes as PokemonTypesType } from "../DTOs/PokemonTypes";
import "./PokemonTypes.scss";

type IPokemonTypesProps = {
    types: PokemonTypesType[],
}

const PokemonTypes = ({ types }: IPokemonTypesProps) => {
    return (
        <div className="pokemon-types">
            {types.map(t => {
                const url = `${process.env.PUBLIC_URL}/images/types/${t.toString().toLocaleLowerCase()}.webp`;
                return <img key={t} src={url} alt={t.toString()} width="100%" height="100%"/>
            })}
        </div>
    );
}

export default PokemonTypes;