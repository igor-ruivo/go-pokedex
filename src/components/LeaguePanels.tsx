import { Language, useLanguage } from "../contexts/language-context";
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
    masterLeagueStats: LeagueStat
}

const LeaguePanels = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats
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
                        <strong className={rankClass(leagueStat.pokemonRankInLeague)}>
                            {buildRankString(leagueStat.pokemonRankInLeague)}
                        </strong>
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
                    {leagueStat.fastAttack.moveName && <strong className="pokemon-attack">
                        <div className="type-attack">{leagueStat.fastAttack.moveName && <img src={typeSrc(leagueStat.fastAttack.type)}/>}{leagueStat.fastAttack.moveName}{leagueStat.fastAttack.isElite ? "*" : leagueStat.fastAttack.isLegacy ? <sup>†</sup> : <></>}</div>
                        <div className="type-attack">{leagueStat.chargedAttack1.moveName && <img src={typeSrc(leagueStat.chargedAttack1.type)}/>}{leagueStat.chargedAttack1.moveName}{leagueStat.chargedAttack1.isElite ? "*" : leagueStat.chargedAttack1.isLegacy ? <sup>†</sup> : <></>}</div>
                        <div className="type-attack">{leagueStat.chargedAttack2.moveName && <img src={typeSrc(leagueStat.chargedAttack2.type)}/>}{leagueStat.chargedAttack2.moveName}{leagueStat.chargedAttack2.isElite ? "*" : leagueStat.chargedAttack2.isLegacy ? <sup>†</sup> : <></>}</div>
                    </strong>}
                </section>
            </div>
        );
    }

    return <div className="pvp-leagues">
        {renderPanel(greatLeagueStats)}
        {renderPanel(ultraLeagueStats)}
        {renderPanel(masterLeagueStats)}
    </div>;
}

export default LeaguePanels;