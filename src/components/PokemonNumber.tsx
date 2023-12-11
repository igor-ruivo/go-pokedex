import "./PokemonNumber.scss";
import { ListType } from "../views/pokedex";
import { ordinal } from "../utils/conversions";
import { Language, useLanguage } from "../contexts/language-context";
import { usePvp } from "../contexts/pvp-context";

type IPokemonNumberProps = {
    dex: number,
    speciesId: string,
    listType: ListType
}  

const PokemonNumber = ({ dex, speciesId, listType }: IPokemonNumberProps) => {
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {currentLanguage} = useLanguage();

    const fetchPokemonRank = (): string => {
        if (!pvpFetchCompleted) {
            return "";
        }

        let ordinalRank = ordinal(rankLists[listType - 1][speciesId].rank);
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

        if (currentLanguage === Language.Bosnian) {
            ordinalRank = ordinalRank
                .replace("st", ".")
                .replace("nd", ".")
                .replace("rd", ".")
                .replace("th", ".");
        }

        switch (rankLists[listType - 1][speciesId].rank) {
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

    const computeRankChange = () => {
        if (!pvpFetchCompleted) {
            return "";
        }

        return ` ${rankLists[listType - 1][speciesId].rankChange === 0 ? "" : rankLists[listType - 1][speciesId].rankChange < 0 ? "▾" + rankLists[listType - 1][speciesId].rankChange * -1 : "▴" + rankLists[listType - 1][speciesId].rankChange}`;
    }

    const rankChangeClassName = (!pvpFetchCompleted || listType === ListType.POKEDEX) ? "" : rankLists[listType - 1][speciesId].rankChange === 0 ? "neutral" : rankLists[listType - 1][speciesId].rankChange < 0 ? "nerfed" : "buffed";

    return (
        <div className="pokemon-number">
            {listType === ListType.POKEDEX ? <span>#{dex}</span> : <><span>{fetchPokemonRank()}</span><br className="break-line"/><span className={`rank-change with-brightness ${rankChangeClassName}`}>{computeRankChange()}</span></>}
        </div>
    );
}

export default PokemonNumber;