import { Language, useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ListType } from "../views/pokedex";
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
    league: ListType,
    atk: number,
    def: number,
    hp: number
}

const LeaguePanels = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    league,
    atk,
    def,
    hp
}: ILeaguePanelsProps) => {

    const {currentLanguage} = useLanguage();

    const buildRankString = (rank: string|undefined) => {
        if (!rank) {
            return translator(TranslatorKeys.Unranked, currentLanguage);
        }

        const ranked = translator(TranslatorKeys.Ranked, currentLanguage);
        return currentLanguage === Language.Portuguese ? `${rank.replace("st", "º").replace("nd", "º").replace("rd", "º").replace("th", "º")} ${ranked}` :  `Ranked ${rank}`;
    }

    const rankClass = (rank: string|undefined) => "pokemon-ivs-ranked" + (!rank ? " unranked" : "");

    const renderPanel = (leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats ${leagueStat.leagueTitle}`;
        const logoSrc = `https://www.stadiumgaming.gg/frontend/assets/img/${leagueStat.leagueTitle}.png`;
        const typeSrc = (type: string) => `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${type}.png`;

        return (
            <div className={pvpStatsClassName}>
                <div className="pvp-labels">
                    <header>
                        Config:
                    </header>
                    <div className="pvp-entry smooth">
                        <div className="pvp-entry-content">
                            Current
                        </div>
                    </div>
                    <div className="pvp-entry smooth">
                        <div className="pvp-entry-content">
                            Best
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
                        Peaks at:
                    </header>
                    <div className="pvp-entry">
                        <div className="pvp-entry-content">
                            {leagueStat.pokemonCP} CP @ LVL {leagueStat.pokemonLevel}
                        </div>
                    </div>
                    <div className="pvp-entry">
                        <div className="pvp-entry-content">
                            {leagueStat.bestCP} CP @ LVL {leagueStat.bestLevel}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <div>
        {league === ListType.GREAT_LEAGUE && renderPanel(greatLeagueStats)}
        {league === ListType.ULTRA_LEAGUE && renderPanel(ultraLeagueStats)}
        {league === ListType.MASTER_LEAGUE && renderPanel(masterLeagueStats)}
    </div>;
}

export default LeaguePanels;