import "./LeaguePicker.scss";
import { LeagueType } from "../hooks/useLeague";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { useLanguage } from "../contexts/language-context";

interface ILeaguePickerProps {
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const LeaguePicker = ({league, handleSetLeague}: ILeaguePickerProps) => {
    const { currentGameLanguage } = useLanguage();
    const renderCustom = false;

    return <nav className="navigation-header ivs-nav extra-gap">
        <ul>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.GREAT_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.GREAT_LEAGUE ? "soft" : "baby-soft")}>
                    <img height="28" width="28" src={`${process.env.PUBLIC_URL}/images/leagues/great.png`} alt="Great League"/>
                    {league === LeagueType.GREAT_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>}
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.ULTRA_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.ULTRA_LEAGUE ? "soft" : "baby-soft")}>
                    <img height="28" width="28" src={`${process.env.PUBLIC_URL}/images/leagues/ultra.png`} alt="Ultra League"/>
                    {league === LeagueType.ULTRA_LEAGUE && <span>Ultra</span>}
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.MASTER_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.MASTER_LEAGUE ? "soft" : "baby-soft")}>
                    <img height="28" width="28" src={`${process.env.PUBLIC_URL}/images/leagues/master.png`} alt="Master League"/>
                    {league === LeagueType.MASTER_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>}
                </div>
            </li>
            {renderCustom && <li>
                <div onClick={() => handleSetLeague(LeagueType.CUSTOM_CUP)} className={"header-tab league-picker selectable " + (league === LeagueType.CUSTOM_CUP ? "soft" : "baby-soft")}>
                    <img height="28" width="28" src={`${process.env.PUBLIC_URL}/images/leagues/fantasy-cup.png`} alt="Fantasy Cup"/>
                    {league === LeagueType.CUSTOM_CUP && <span className="league-tooltip">{gameTranslator(GameTranslatorKeys.Fantasy, currentGameLanguage)}</span>}
                </div>
            </li>}
            <li>
                <div onClick={() => handleSetLeague(LeagueType.RAID)} className={"header-tab league-picker selectable " + (league === LeagueType.RAID ? "soft" : "baby-soft")}>
                    <div className="img-padding raid-img-with-contrast"><img height="20" width="20" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`} alt="Raids"/></div>
                    {league === LeagueType.RAID && <span className="league-tooltip">{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}</span>}
                </div>
            </li>
        </ul>
    </nav>;
}

export default LeaguePicker;