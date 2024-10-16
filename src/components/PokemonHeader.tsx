import { useMemo } from "react";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import "./PokemonHeader.scss";

interface IPokemonHeader {
    pokemonName: string;
    type1: PokemonTypes | undefined;
    type2?: PokemonTypes | undefined;
    defaultTextColor?: boolean;
    defaultBannerColor?: boolean;
    whiteTextColor?: boolean;
    darker?: boolean;
    special?: boolean;
    constrained?: boolean;
}

const PokemonHeader = ({pokemonName, type1, type2, defaultTextColor, defaultBannerColor, whiteTextColor, darker, special, constrained}: IPokemonHeader) => {
    const type1Color = useMemo(() => type1 ? `var(--type-${type1})` : "var(--popup-background-color)", [type1]);
    const type2Color = useMemo(() => type2 ? `var(--type-${type2})` : type1Color, [type2, type1Color]);
    return <header className={`pokemonheader-header ${constrained ? "constrained" : ""} ${defaultBannerColor ? (darker ? "darker-banner-color" : (special ? "special-banner-color" : "banner-color")) : ""}`} style = {!defaultBannerColor ? {background: `linear-gradient(45deg, ${type1Color} 72%, ${type2Color} 72%)`} : {}}>
        <h1 className={`pokemonheader-name ellipsed ${defaultTextColor ? "text-color no-shadow" : ""} ${whiteTextColor ? "white-text-color no-shadow" : ""}`}>{pokemonName}</h1>
    </header>;
}

export default PokemonHeader;