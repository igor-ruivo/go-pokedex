import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber";
import PokemonTypes from "./PokemonTypes";
import { ListType } from "../views/pokedex";
import { calculateCP, needsXLCandy } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { customCupCPLimit, usePvp } from "../contexts/pvp-context";
import useCountdown from "../hooks/useCountdown";
import { useRef } from "react";

interface IPokemonMiniatureProps {
    pokemon: IGamemasterPokemon,
    cpStringOverride?: string,
    withCountdown?: number,
    linkToShadowVersion?: boolean,
    forceShadowAdorner?: boolean
}

const PokemonMiniature = ({pokemon, cpStringOverride, withCountdown, linkToShadowVersion, forceShadowAdorner}: IPokemonMiniatureProps) => {
    const {days, hours, minutes, seconds} = useCountdown(withCountdown ?? 0);
    const {currentGameLanguage} = useLanguage();
    const containerWidth = useRef<HTMLDivElement>(null);

    const link = `/pokemon/${pokemon.speciesId + (linkToShadowVersion ? "_shadow" : "")}/info`;

    const getCPContainerString = () => {
        if (withCountdown) {
            if (!days && !hours && !minutes && !seconds) {
                return "Expired";
            }

            return days > 0 ? `${days} day${days > 1 ? "s" : ""} left` : `${hours}h:${minutes}m:${seconds}s`;
        }

        if (cpStringOverride) {
            return cpStringOverride;
        }

        return `${calculateCP(pokemon.atk, 15, pokemon.def, 15, pokemon.hp, 15, 100)} ${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}`;
    }

    return (
        <Link to={link}>
            <div ref={containerWidth} className="pokemon-miniature">
                <span className="mini-card-content">
                    <PokemonImage pokemon={pokemon} withName lazy specificNameContainerWidth={containerWidth.current?.clientWidth} forceShadowAdorner={forceShadowAdorner} />
                </span>
                <span className="header-footer">
                    <strong className="cp-container">
                        {getCPContainerString()}
                    </strong>
                </span>
            </div>
        </Link>
    );
}

export default PokemonMiniature;