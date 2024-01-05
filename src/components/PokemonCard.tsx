import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber";
import PokemonTypes from "./PokemonTypes";
import { ListType } from "../views/pokedex";
import { calculateCP, needsXLCandy } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { customCupCPLimit, usePvp } from "../contexts/pvp-context";

interface IPokemonCardProps {
    pokemon: IGamemasterPokemon,
    listType: ListType,
    cpStringOverride?: string;
    rankOverride?: number;
}

const PokemonCard = ({pokemon, listType, cpStringOverride, rankOverride}: IPokemonCardProps) => {
    const {currentGameLanguage} = useLanguage();
    const {rankLists} = usePvp();

    const link = `/pokemon/${pokemon.speciesId}/info`;

    let cpThreshold = 0;
    switch (listType) {
        case ListType.GREAT_LEAGUE:
            cpThreshold = 1500;
            break;
        case ListType.ULTRA_LEAGUE:
            cpThreshold = 2500;
            break;
        case ListType.CUSTOM_CUP:
            cpThreshold = customCupCPLimit;
            break;
    }

    const getCPContainerString = () => {
        if (cpStringOverride) {
            return cpStringOverride;
        }

        if (listType === ListType.POKEDEX) {
            return `${calculateCP(pokemon.atk, 15, pokemon.def, 15, pokemon.hp, 15, 100)} ${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}`;
        }

        if (listType !== ListType.RAID) {
            if (!rankLists[listType - 1]) {
                return "0";
            }

            return `${rankLists[listType - 1][pokemon.speciesId].score}%`;
        }
    }

    return (
        <Link to={link}>
            <div className="pokemon-card">
                <span className="header-container">
                    <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} listType={listType} rankOverride={rankOverride} />
                    <PokemonTypes types={pokemon.types} />
                </span>
                <span className="card-content">
                    <PokemonImage pokemon={pokemon} xl={needsXLCandy(pokemon, cpThreshold)} withName lazy/>
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

export default PokemonCard;