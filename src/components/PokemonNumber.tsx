import "./PokemonNumber.scss";
import { ListType } from "../views/pokedex";
import { ordinal } from "../utils/conversions";
import { Language, useLanguage } from "../contexts/language-context";
import { usePvp } from "../contexts/pvp-context";
import { useCallback, useMemo } from "react";

type IPokemonNumberProps = {
    dex: number,
    speciesId: string,
    listType: ListType,
    rankOverride?: number
}  

const PokemonNumber = ({ dex, speciesId, listType, rankOverride }: IPokemonNumberProps) => {
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {currentLanguage} = useLanguage();

    const fetchPokemonRank = useCallback((): string => {
        if (!pvpFetchCompleted) {
            return "";
        }

        let ordinalRank = rankLists[listType - 1] ? ordinal(rankLists[listType - 1][speciesId].rank) : rankOverride ? ordinal(rankOverride) : "";
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

        if (rankOverride ?? rankLists[listType - 1]) {
            const effectiveRank = rankOverride ?? rankLists[listType - 1][speciesId].rank;

            switch (effectiveRank) {
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
        
        return ordinalRank as string;        
    }, [currentLanguage, listType, pvpFetchCompleted, rankLists, rankOverride, speciesId]);

    const computeRankChange = useCallback(() => {
        if (!pvpFetchCompleted || !rankLists[listType - 1]) {
            return "";
        }

        return ` ${rankLists[listType - 1][speciesId].rankChange === 0 ? "" : rankLists[listType - 1][speciesId].rankChange < 0 ? "▾" + rankLists[listType - 1][speciesId].rankChange * -1 : "▴" + rankLists[listType - 1][speciesId].rankChange}`;
    }, [pvpFetchCompleted, rankLists, listType, speciesId]);

    const rankChangeClassName = useMemo(() => (!pvpFetchCompleted || listType === ListType.POKEDEX || !rankLists[listType - 1]) ? "" : rankLists[listType - 1][speciesId].rankChange === 0 ? "neutral" : rankLists[listType - 1][speciesId].rankChange < 0 ? "nerfed" : "buffed"
    , [listType, pvpFetchCompleted, rankLists, speciesId]);

    return (
        <div className="pokemon-number">
            {listType === ListType.POKEDEX ? <span>#{dex}</span> : <><span>{fetchPokemonRank()}</span><br className="break-line"/><span className={`rank-change with-brightness ${rankChangeClassName}`}>{computeRankChange()}</span></>}
        </div>
    );
}

export default PokemonNumber;