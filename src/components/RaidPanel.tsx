import { useCallback, useMemo } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import { useMoves } from "../contexts/moves-context";
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ordinal } from "../utils/conversions";
import { Effectiveness, calculateDamage, fetchReachablePokemonIncludingSelf, pveDPS } from "../utils/pokemon-helper";
import RaidCard from "./RaidCard";
import "./RaidPanel.scss"
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { buildRankString } from "./LeagueRanks";
import { PokemonTypes } from "../DTOs/PokemonTypes";

interface IRaidPanelProps {
    pokemon: IGamemasterPokemon;
    level: number;
    atkIV: number;
}

const RaidPanel = ({ pokemon, level, atkIV }: IRaidPanelProps) => {
    const {moves} = useMoves();
    const {gamemasterPokemon} = usePokemon();
    const {currentLanguage, currentGameLanguage} = useLanguage();

    return <div className="pvp-stats-column raid-background">
        <div>
            <div className="pvp-entry smooth with-border">
                <div className="pvp-entry-content potential">
                    <strong className="cp-container with-brightness">
                        {buildRankString(ordinal(9), currentLanguage)}&nbsp;
                    </strong>
                    <strong>
                        {translator(TranslatorKeys.Ranked, currentLanguage)}
                    </strong>
                    <strong>
                        {translator(TranslatorKeys.In, currentLanguage)} {gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}
                    </strong>
                    <sub className="contained-big weighted-font">{`(${Math.round(9 * 100) / 100} DPS)`}</sub>
                </div>
            </div>
        </div>
        <div className={`contain`}>
           
        </div>
        <div className="centered-text">... </div>
    </div>;
}

export default RaidPanel;