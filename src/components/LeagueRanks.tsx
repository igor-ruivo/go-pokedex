import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { Language, useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ListType } from "../views/pokedex";
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
    currentLeague: ListType
}

const LeagueRanks = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    currentLeague
}: ILeaguePanelsProps) => {
    const {currentLanguage} = useLanguage();

    const buildRankString = (rank: string|undefined) => {
        if (!rank) {
            return translator(TranslatorKeys.Unranked, currentLanguage);
        }

        const ranked = translator(TranslatorKeys.Ranked, currentLanguage);
        return currentLanguage === Language.Portuguese ? `${rank.replace("st", "º").replace("nd", "º").replace("rd", "º").replace("th", "º")} ${ranked}` :  `Ranked ${rank}`;
    }

    const rankClass = (rank: string|undefined) => "pokemon-ivs-ranked-2" + (!rank ? " unranked" : "");

    const getLeagueName = (league: ListType) => {
        switch (league) {
            case ListType.GREAT_LEAGUE:
                return "great";
            case ListType.ULTRA_LEAGUE:
                return "ultra";
            case ListType.MASTER_LEAGUE:
                return "master";
        }
    }

    const renderPanel = (leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats-2 ${leagueStat.leagueTitle} ` + (getLeagueName(currentLeague) === leagueStat.leagueTitle ? "selected" : "");
        const logoSrc = `https://www.stadiumgaming.gg/frontend/assets/img/${leagueStat.leagueTitle}.png`;

        return (
            <div className={pvpStatsClassName}>
                <section className="pvp-title-2">
                    <img src={logoSrc} alt="League icon" loading="lazy" decoding="async" className="pvp-title-item-small pvp-img-2" height="100%" width="100%"/>
                    <div className="pvp-title-item">
                        {leagueStat.bestReachablePokemon && <PokemonImage pokemon={leagueStat.bestReachablePokemon} withName={false}/>}
                    </div>
                    <strong className={rankClass(leagueStat.pokemonRankInLeague)}>
                        {buildRankString(leagueStat.pokemonRankInLeague)}
                    </strong>
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