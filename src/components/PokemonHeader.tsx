import { PokemonTypes } from "../DTOs/PokemonTypes";
import "./PokemonHeader.scss";

interface IPokemonHeader {
    pokemonName: string;
    type1: PokemonTypes | undefined;
    type2?: PokemonTypes | undefined;
    defaultTextColor?: boolean;
}

const PokemonHeader = ({pokemonName, type1, type2, defaultTextColor}: IPokemonHeader) => {
    const type1Color = type1 ? `var(--type-${type1})` : "var(--popup-background-color)";
    const type2Color = type2 ? `var(--type-${type2})` : type1Color;
    return <header className="pokemonheader-header" style = {{background: `linear-gradient(45deg, ${type1Color} 72%, ${type2Color} 72%)`}}>
        <h1 className={`pokemonheader-name ${defaultTextColor ? "text-color no-shadow" : ""}`}>{pokemonName}</h1>
    </header>;
}

export default PokemonHeader;