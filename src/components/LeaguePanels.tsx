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
    league: ListType
}

const LeaguePanels = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    league
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
                <section className="pvp-title">
                    <img src={logoSrc} alt="League icon" loading="lazy" decoding="async" className="pvp-img"/>
                    
                    {leagueStat.bestReachablePokemonName && <h4>({leagueStat.bestReachablePokemonName})</h4>}
                            <div className="custom-pokemon">
                                <h3>
                                    <div>{leagueStat.pokemonLeaguePercentage}% <span className="percentile">(#{leagueStat.pokemonLeaguePercentile})</span></div>
                                </h3>
                                <div className="cp-and-level">{leagueStat.pokemonCP} {translator(TranslatorKeys.CP, currentLanguage)} @ {translator(TranslatorKeys.LVL, currentLanguage)} {leagueStat.pokemonLevel}</div>
                            </div>
                </section>
                <section className="pvp-stats-display">
                    <section className="pvp-ivs">
                        <ul className="pokemon-ivs">
                            <li>
                                <span className="pokemon-ivs-item">
                                    <span>{leagueStat.atk}</span>
                                    <strong className="pokemon-ivs-label">{translator(TranslatorKeys.ATK, currentLanguage).toLocaleUpperCase()}</strong>
                                </span>
                            </li>
                            <li>
                                <span className="pokemon-ivs-item">
                                    <span>{leagueStat.def}</span>
                                    <strong className="pokemon-ivs-label">DEF</strong>
                                </span>
                            </li>
                            <li>
                                <span className="pokemon-ivs-item">
                                    <span>{leagueStat.hp}</span>
                                    <strong className="pokemon-ivs-label">{translator(TranslatorKeys.STA, currentLanguage).toLocaleUpperCase()}</strong>
                                </span>
                            </li>
                        </ul>
                    </section>
                    <section>
                        <div className="cp-and-level-recommended"><strong>{leagueStat.bestCP} {translator(TranslatorKeys.CP, currentLanguage)} @ {translator(TranslatorKeys.LVL, currentLanguage)} {leagueStat.bestLevel}</strong></div>
                    </section>
                </section>
            </div>
        );
    }

    return <div className="pvp-leagues">
        {league === ListType.GREAT_LEAGUE && renderPanel(greatLeagueStats)}
        {league === ListType.ULTRA_LEAGUE && renderPanel(ultraLeagueStats)}
        {league === ListType.MASTER_LEAGUE && renderPanel(masterLeagueStats)}
    </div>;
}

export default LeaguePanels;