import { useContext } from "react";
import "./PokemonNumber.scss";
import PokemonContext from "../../contexts/pokemon-context";
import { ListType } from "../../views/pokedex";

type IPokemonNumberProps = {
    dex: number,
    speciesId: string,
    listType: ListType
  }  

const PokemonNumber = ({ dex, speciesId, listType }: IPokemonNumberProps) => {
    const {rankLists} = useContext(PokemonContext);

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
        const rank = rankLists[listType - 1].find(p => p.speciesId === speciesId)!.rank;
        switch (rank) {
          case 1:
            return "🥇" + rank + "º";
          case 2:
            return "🥈" + rank + "º";
          case 3:
            return "🥉" + rank + "º";
          default:
            return rank + "º";
        }
      }

    return (
        <div className="pokemon_number">
            {listType === ListType.POKEDEX ? `#${pokemonNumberGenerator(dex)}` : fetchPokemonRank()}
        </div>

    );
}

export default PokemonNumber;