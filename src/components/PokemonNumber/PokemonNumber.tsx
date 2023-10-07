import { useContext } from "react";
import "./PokemonNumber.scss";
import { ListType } from "../../views/pokedex";
import { usePokemon } from "../../contexts/pokemon-context";
import Dictionary from "../../utils/Dictionary";

type IPokemonNumberProps = {
    dex: number,
    speciesId: string,
    listType: ListType
  }  

const PokemonNumber = ({ dex, speciesId, listType }: IPokemonNumberProps) => {
    const {rankLists, fetchCompleted} = usePokemon();

    const pokemonNumberGenerator = (dex: number): string => {
        let urlDex = "" + dex;
        const zerosToAddToUrl = 4 - urlDex.length;
    
        if (zerosToAddToUrl > 0) {
            for (let i = 0; i < zerosToAddToUrl; i++) {
                urlDex = "0" + urlDex;
            }
        }
    
        return urlDex;
    }

    const english_ordinal_rules = new Intl.PluralRules("en", {type: "ordinal"});
    const suffixes: Dictionary<string> = {
        one: "st",
        two: "nd",
        few: "rd",
        other: "th"
    };

    const ordinal = (number: number) => {
        if (number < 1) {
            return undefined;
        }
        const category = english_ordinal_rules.select(number);
        const suffix = suffixes[category];
        return number + suffix;
    }

    const fetchPokemonRank = (): string => {
        const rank = fetchCompleted ? rankLists[listType - 1][speciesId].rank : 0;
        switch (rank) {
          case 1:
            return "🥇" + ordinal(rank);
          case 2:
            return "🥈" + ordinal(rank);
          case 3:
            return "🥉" + ordinal(rank);
          default:
            return ordinal(rank) as string;
        }
      }

    return (
        <div className="pokemon_number">
            {listType === ListType.POKEDEX ? `#${pokemonNumberGenerator(dex)}` : fetchPokemonRank()}
        </div>

    );
}

export default PokemonNumber;