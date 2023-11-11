import "./LeaguePicker.scss";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import { ListType } from "../views/pokedex";

interface ILeaguePickerProps {
    league: ListType;
    handleSetLeague: (newLeague: ListType) => void;
}

const LeaguePicker = ({league, handleSetLeague}: ILeaguePickerProps) => {
    const {currentLanguage} = useLanguage();

    return <nav className="navigation-header ivs-nav">
        <ul>
            <li>
                <div onClick={() => handleSetLeague(ListType.GREAT_LEAGUE)} className={"header-tab " + (league === ListType.GREAT_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                    <span>{translator(TranslatorKeys.Great, currentLanguage)}</span>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(ListType.ULTRA_LEAGUE)} className={"header-tab " + (league === ListType.ULTRA_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/jtA6QiL.png" alt="Ultra League"/>
                    <span>Ultra</span>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(ListType.MASTER_LEAGUE)} className={"header-tab " + (league === ListType.MASTER_LEAGUE ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/vJOBwfH.png" alt="Master League"/>
                    <span>{translator(TranslatorKeys.Master, currentLanguage)}</span>
                </div>
            </li>
        </ul>
    </nav>;
}

export default LeaguePicker;