import "./PokemonNumber.scss";
import { ListType } from "../views/pokedex";
import { usePokemon } from "../contexts/pokemon-context";
import { ordinal } from "../utils/conversions";

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