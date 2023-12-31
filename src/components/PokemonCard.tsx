import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonCard.scss"
import PokemonImage from "./PokemonImage";
import PokemonNumber from "./PokemonNumber";
import PokemonTypes from "./PokemonTypes";
import { ListType } from "../views/pokedex";
import { calculateCP } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { usePvp } from "../contexts/pvp-context";

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
    var cp = Math.floor(((pokemon.atk + 15) * Math.pow(pokemon.def + 15, 0.5) * Math.pow(pokemon.hp + 15, 0.5) * Math.pow(0.795300006866455, 2) ) / 10);

    const showXL = (listType === ListType.GREAT_LEAGUE && cp < 1500 + 150) || (listType === ListType.CUSTOM_CUP && cp < 500 + 150) || (listType === ListType.ULTRA_LEAGUE && cp < 2500 + 150);
  
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
                    <PokemonImage pokemon={pokemon} xl={showXL} withName lazy lowRes/>
                </span>
                <span className="header-footer">
                    <strong className="cp-container with-brightness">
                        {getCPContainerString()}
                    </strong>
                </span>
            </div>
        </Link>
    );
}

export default PokemonCard;