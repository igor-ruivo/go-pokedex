import "./LeaguePicker.scss";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";

interface ILeaguePickerProps {
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const LeaguePicker = ({league, handleSetLeague}: ILeaguePickerProps) => {
    const {currentGameLanguage} = useLanguage();

    return <nav className="navigation-header ivs-nav">
        <ul>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.GREAT_LEAGUE)} className={"header-tab " + (league === LeagueType.GREAT_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                    <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.ULTRA_LEAGUE)} className={"header-tab " + (league === LeagueType.ULTRA_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/jtA6QiL.png" alt="Ultra League"/>
                    <span>Ultra</span>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.MASTER_LEAGUE)} className={"header-tab " + (league === LeagueType.MASTER_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/vJOBwfH.png" alt="Master League"/>
                    <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>
                </div>
            </li>
        </ul>
    </nav>;
}

export default LeaguePicker;