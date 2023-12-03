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

interface IPokemonCardProps {
    pokemon: IGamemasterPokemon,
    listType: ListType
}

const PokemonCard = ({pokemon, listType}: IPokemonCardProps) => {
    const {currentGameLanguage} = useLanguage();
    const link = `/pokemon/${pokemon.speciesId}/info`;
    var cp = Math.floor(((pokemon.atk + 15) * Math.pow(pokemon.def + 15, 0.5) * Math.pow(pokemon.hp + 15, 0.5) * Math.pow(0.795300006866455, 2) ) / 10);

    const showXL = (listType === ListType.GREAT_LEAGUE && cp < 1500 + 150) || (listType === ListType.CUSTOM_CUP && cp < 1500 + 150) || (listType === ListType.ULTRA_LEAGUE && cp < 2500 + 150);
  
    return (
        <Link to={link}>
            <div className="pokemon-card">
                <span className="header-container">
                    <PokemonNumber dex={pokemon.dex} speciesId={pokemon.speciesId} listType={listType} />
                    <PokemonTypes types={pokemon.types} />
                </span>
                <span className="card-content">
                    <PokemonImage pokemon={pokemon} xl={showXL} withName  withMetadata={false}/>
                </span>
                <span className="header-footer">
                    <strong className="cp-container">
                        {calculateCP(pokemon.atk, 15, pokemon.def, 15, pokemon.hp, 15, 100)} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}
                    </strong>
                </span>
            </div>
        </Link>
    );
}

export default PokemonCard;