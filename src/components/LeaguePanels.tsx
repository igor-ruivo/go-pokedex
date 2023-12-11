import { useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LeaguePanels.scss";

interface PokemonLeagueMove {
    moveName: string,
    type: string,
    isElite: boolean,
    isLegacy: boolean
}

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemonName: string,
    pokemonRankInLeague: string | undefined,
    pokemonLeaguePercentage: number,
    pokemonLeaguePercentile: number,
    pokemonCP: number,
    pokemonLevel: number,
    atk: number,
    def: number,
    hp: number,
    bestCP: number,
    bestLevel: number,
    fastAttack: PokemonLeagueMove,
    chargedAttack1: PokemonLeagueMove,
    chargedAttack2: PokemonLeagueMove,
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat,
    ultraLeagueStats: LeagueStat,
    masterLeagueStats: LeagueStat,
    customLeagueStats: LeagueStat,
    atk: number,
    def: number,
    hp: number,
    league: LeagueType
}

const LeaguePanels = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    customLeagueStats,
    atk,
    def,
    hp,
    league
}: ILeaguePanelsProps) => {

    const {currentLanguage, currentGameLanguage} = useLanguage();

    const renderPanel = (leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats-column ${leagueStat.leagueTitle}`;

        let logoSrc = "";
        switch (leagueStat.leagueTitle) {
            case "great":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/great.png`;
                break;
            case "ultra":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/ultra.png`;
                break;
            case "master":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/master.png`;
                break;
            case "custom":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/retro.png`;
                break;
        }

        return (
            <div className={pvpStatsClassName}>
                <div>
                    <div className="pvp-entry rank-title">
                        <div className="pvp-entry-content potential">
                            <strong>{translator(TranslatorKeys.Perfection, currentLanguage)}:</strong> <strong className="cp-container with-brightness">{leagueStat.pokemonLeaguePercentage}%</strong> <sub className="contained-big weighted-font">(#{leagueStat.pokemonLeaguePercentile})</sub>
                        </div>
                    </div>
                </div>
                <div className="pvp-stats">
                    <div className="pvp-labels">
                        <header>
                            {translator(TranslatorKeys.Config, currentLanguage)}:
                        </header>
                        <div className="pvp-entry smooth">
                            <div className="pvp-entry-content">
                                {translator(TranslatorKeys.Current, currentLanguage)}:
                            </div>
                        </div>
                        <div className="pvp-entry smooth">
                            <div className="pvp-entry-content">
                                {translator(TranslatorKeys.Best, currentLanguage)}:
                            </div>
                        </div>
                    </div>
                    <div className="pvp-labels">
                        <header>
                            IVs:
                        </header>
                        <div className="pvp-entry">
                            <div className="pvp-entry-content">
                                {atk} / {def} / {hp}
                            </div>
                        </div>
                        <div className="pvp-entry">
                            <div className="pvp-entry-content">
                                {leagueStat.atk} / {leagueStat.def} / {leagueStat.hp}
                            </div>
                        </div>
                    </div>
                    <div className="pvp-labels">
                        <header>
                            {translator(TranslatorKeys.Peaks, currentLanguage)}:
                        </header>
                        <div className="pvp-entry">
                            <div className="pvp-entry-content potential">
                            <strong className="cp-container with-brightness">{leagueStat.pokemonCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> <div className="contained-big weighted-font">@ {translator(TranslatorKeys.LVL, currentLanguage)} {leagueStat.pokemonLevel}</div>
                            </div>
                        </div>
                        <div className="pvp-entry">
                            <div className="pvp-entry-content potential">
                                <strong className="cp-container with-brightness">{leagueStat.bestCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> <div className="contained-big weighted-font">@ {translator(TranslatorKeys.LVL, currentLanguage)} {leagueStat.bestLevel}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="centered-text">... {translator(TranslatorKeys.As, currentLanguage)} {leagueStat.bestReachablePokemonName}</div>
                <img className='background-absolute-img' width="100%" height="100%" src={logoSrc} alt={leagueStat.leagueTitle} />
            </div>
        );
    }

    return <div>
        {league === LeagueType.GREAT_LEAGUE && renderPanel(greatLeagueStats)}
        {league === LeagueType.ULTRA_LEAGUE && renderPanel(ultraLeagueStats)}
        {league === LeagueType.MASTER_LEAGUE && renderPanel(masterLeagueStats)}
        {league === LeagueType.CUSTOM_CUP && renderPanel(customLeagueStats)}
    </div>;
}

export default LeaguePanels;