import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { Language, useLanguage } from "../contexts/language-context";
import useLeague, { LeagueType } from "../hooks/useLeague";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LeagueRanks.scss"
import PokemonImage from "./PokemonImage";

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemon: IGamemasterPokemon,
    pokemonRankInLeague: string | undefined,
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat,
    ultraLeagueStats: LeagueStat,
    masterLeagueStats: LeagueStat,
}

const LeagueRanks = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats
}: ILeaguePanelsProps) => {
    const {currentLanguage} = useLanguage();
    const {league, handleSetLeague} = useLeague();

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
            default:
                throw new Error("Missing case for switch: " + league);
        }
    }

    const renderPanel = (leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats-2 ${leagueStat.leagueTitle} ` + (getLeagueName(league) === leagueStat.leagueTitle ? "selected" : "");
        const logoSrc = `https://www.stadiumgaming.gg/frontend/assets/img/${leagueStat.leagueTitle}.png`;

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
    </div>;
}

export default LeagueRanks;