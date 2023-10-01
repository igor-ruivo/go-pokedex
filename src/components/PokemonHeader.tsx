import { PokemonTypes } from "../DTOs/PokemonTypes";
import "./PokemonHeader.scss";

interface IPokemonHeader {
    pokemonName: string;
    type1: PokemonTypes;
    type2?: PokemonTypes | undefined
}

const PokemonHeader = ({pokemonName, type1, type2}: IPokemonHeader) => {
    return <header className="pokemonheader-header" style = {{background: `linear-gradient(45deg, var(--type-${type1}) 80%, var(--type-${type2 ?? type1}) 80%)`}}>
        <h1 className="pokemonheader-name">{pokemonName}</h1>
    </header>;
}

export default PokemonHeader;