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
    withChevron?: boolean;
    chevronCollapsed?: boolean;
    onClickHandler?: () => void;
    additionalClasses?: string;
}

const PokemonHeader = ({pokemonName, type1, type2, defaultTextColor, defaultBannerColor, whiteTextColor, darker, special, constrained, withChevron, chevronCollapsed, onClickHandler, additionalClasses}: IPokemonHeader) => {
    const type1Color = useMemo(() => type1 ? `var(--type-${type1})` : "var(--popup-background-color)", [type1]);
    const type2Color = useMemo(() => type2 ? `var(--type-${type2})` : type1Color, [type2, type1Color]);
    return <header className={`pokemonheader-header ${constrained ? "constrained" : ""} ${defaultBannerColor ? (darker ? "darker-banner-color" : (special ? "special-banner-color" : "banner-color")) : ""} ${additionalClasses}`} onClick={onClickHandler} style = {!defaultBannerColor ? {background: `linear-gradient(45deg, ${type1Color} 72%, ${type2Color} 72%)`} : {}}>
        <h1 className={`pokemonheader-name ellipsed ${defaultTextColor ? "text-color no-shadow" : ""} ${whiteTextColor ? "white-text-color no-shadow" : ""}`}>{pokemonName}</h1>
        {withChevron && <figure className="chevron move-card hidden-in-big-screens">
            <img className="invert-dark-mode" alt="All available Charged Moves" loading="lazy" width="18" height="18" decoding="async" src={`${process.env.PUBLIC_URL}/vectors/chevron-${chevronCollapsed ? "down" : "up"}.svg`} />
        </figure>}
    </header>;
}

export default PokemonHeader;