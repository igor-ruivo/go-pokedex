import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { Language, useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LeagueRanks.scss"
import PokemonImage from "./PokemonImage";

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemon: IGamemasterPokemon,
    pokemonRankInLeague: string | undefined,
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat;
    ultraLeagueStats: LeagueStat;
    masterLeagueStats: LeagueStat;
    customLeagueStats: LeagueStat;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const LeagueRanks = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    customLeagueStats,
    league,
    handleSetLeague
}: ILeaguePanelsProps) => {
    const {currentLanguage} = useLanguage();

    const buildRankString = (rank: string|undefined) => {
        if (!rank) {
            return translator(TranslatorKeys.Unranked, currentLanguage);
        }

        const ranked = translator(TranslatorKeys.Ranked, currentLanguage);
        return currentLanguage === Language.Portuguese ?
            `${rank.replace("st", "º").replace("nd", "º").replace("rd", "º").replace("th", "º")} ${ranked}` :
            currentLanguage === Language.Bosnian ?
            `${rank.replace("st", ".").replace("nd", ".").replace("rd", ".").replace("th", ".")} ${ranked}` :
            `Ranked ${rank}`;
    }

    const rankClass = (rank: string|undefined) => "pokemon-ivs-ranked-2" + (!rank ? " unranked" : "");

    const getLeagueName = (league: LeagueType) => {
        switch (league) {
            case LeagueType.GREAT_LEAGUE:
                return "great";
            case LeagueType.ULTRA_LEAGUE:
                return "ultra";
            case LeagueType.MASTER_LEAGUE:
                return "master";
            case LeagueType.CUSTOM_CUP:
                return "custom";
        }
    }

    const getLeagueType = (league: string) => {
        switch (league) {
            case "great":
                return LeagueType.GREAT_LEAGUE;
            case "ultra":
                return LeagueType.ULTRA_LEAGUE;
            case "master":
                return LeagueType.MASTER_LEAGUE;
            case "custom":
                return LeagueType.CUSTOM_CUP;
            default:
                throw new Error("Missing case for switch: " + league);
        }
    }

    const renderPanel = (leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats-2 selectable ${leagueStat.leagueTitle} ` + (getLeagueName(league) === leagueStat.leagueTitle ? "selected" : "");
        
        let logoSrc = "";
        switch (leagueStat.leagueTitle) {
            case "great":
                logoSrc = "https://i.imgur.com/JFlzLTU.png";
                break;
            case "ultra":
                logoSrc = "https://i.imgur.com/jtA6QiL.png";
                break;
            case "master":
                logoSrc = "https://i.imgur.com/vJOBwfH.png";
                break;
            case "custom":
                logoSrc = "https://i.imgur.com/tkaS5cs.png";
                break;
        }

        return (
            <div className={pvpStatsClassName}>
                <section className="pvp-title-2" onClick={() => handleSetLeague(getLeagueType(leagueStat.leagueTitle))}>
                    <img src={logoSrc} alt="League icon" loading="lazy" decoding="async" className="pvp-title-item-small pvp-img-2" height="100%" width="100%"/>
                    <div className="pvp-title-item">
                        {leagueStat.bestReachablePokemon && <PokemonImage pokemon={leagueStat.bestReachablePokemon} withName={false} withMetadata={false}/>}
                    </div>
                    <div className={rankClass(leagueStat.pokemonRankInLeague)}>
                        {buildRankString(leagueStat.pokemonRankInLeague)}
                    </div>
                </section>
            </div>
        );
    }

    return <div className="pvp-leagues-2">
        {renderPanel(greatLeagueStats)}
        {renderPanel(ultraLeagueStats)}
        {renderPanel(masterLeagueStats)}
        {renderPanel(customLeagueStats)}
    </div>;
}

export default LeagueRanks;