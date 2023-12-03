import "./LeaguePicker.scss";
import { LeagueType } from "../hooks/useLeague";

interface ILeaguePickerProps {
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const LeaguePicker = ({league, handleSetLeague}: ILeaguePickerProps) => {
    return <nav className="navigation-header ivs-nav extra-gap">
        <ul>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.GREAT_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.GREAT_LEAGUE ? "selected" : "")}>
                    <img height="32" width="32" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.ULTRA_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.ULTRA_LEAGUE ? "selected" : "")}>
                    <img height="32" width="32" src="https://i.imgur.com/jtA6QiL.png" alt="Ultra League"/>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.MASTER_LEAGUE)} className={"header-tab league-picker selectable " + (league === LeagueType.MASTER_LEAGUE ? "selected" : "")}>
                    <img height="32" width="32" src="https://i.imgur.com/vJOBwfH.png" alt="Master League"/>
                </div>
            </li>
            <li>
                <div onClick={() => handleSetLeague(LeagueType.CUSTOM_CUP)} className={"header-tab league-picker selectable " + (league === LeagueType.CUSTOM_CUP ? "selected" : "")}>
                    <img height="32" width="32" src="https://i.imgur.com/tkaS5cs.png" alt="Retro Cup"/>
                </div>
            </li>
        </ul>
    </nav>;
}

export default LeaguePicker;