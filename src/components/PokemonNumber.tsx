import "./PokemonNumber.scss";
import { ListType } from "../views/pokedex";
import { usePokemon } from "../contexts/pokemon-context";
import { ordinal } from "../utils/conversions";
import { Language, useLanguage } from "../contexts/language-context";

type IPokemonNumberProps = {
    dex: number,
    speciesId: string,
    listType: ListType
}  

const PokemonNumber = ({ dex, speciesId, listType }: IPokemonNumberProps) => {
    const {rankLists, fetchCompleted} = usePokemon();
    const {currentLanguage} = useLanguage();

    const fetchPokemonRank = (): string => {
        const rank = fetchCompleted ? rankLists[listType - 1][speciesId].rank : 0;
        let ordinalRank = ordinal(rank);
        if (!ordinalRank) {
            return "";
        }

        if (currentLanguage === Language.Portuguese) {
            ordinalRank = ordinalRank
                .replace("st", "º")
                .replace("nd", "º")
                .replace("rd", "º")
                .replace("th", "º");
        }

        switch (rank) {
            case 1:
                return "🥇" + ordinalRank;
            case 2:
                return "🥈" + ordinalRank;
            case 3:
                return "🥉" + ordinalRank;
            default:
                return ordinalRank as string;
        }
    }

    return (
        <div className="pokemon-number">
            {listType === ListType.POKEDEX ? `#${dex}` : fetchPokemonRank()}
        </div>
    );
}

export default PokemonNumber;