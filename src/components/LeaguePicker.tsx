import "./LeaguePicker.scss";
import { useLanguage } from "../contexts/language-context";
import { ListType } from "../views/pokedex";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import useLeague from "../hooks/useLeague";

const LeaguePicker = () => {
    const [league, handleSetLeague] = useLeague();
    const {currentGameLanguage} = useLanguage();

    return <nav className="navigation-header ivs-nav">
        <ul>
            <li>
                <div onClick={() => handleSetLeague(ListType.GREAT_LEAGUE)} className={"header-tab " + (league === ListType.GREAT_LEAGUE || league === ListType.POKEDEX ? "selected" : "")}>
                    <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                    <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>
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
                    <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>
                </div>
            </li>
        </ul>
    </nav>;
}

export default LeaguePicker;