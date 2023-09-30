import "./LeaguePanels.scss";

interface ILeaguePanelsProps {
    greatLeagueAtk: number,
    greatLeagueDef: number,
    greatLeagueSta: number,
    greatLeagueCp: number,
    greatLeagueLvl: number,
    greatLeagueRank: string,
    ultraLeagueAtk: number,
    ultraLeagueDef: number,
    ultraLeagueSta: number,
    ultraLeagueCp: number,
    ultraLeagueLvl: number,
    ultraLeagueRank: string,
    masterLeagueAtk: number,
    masterLeagueDef: number,
    masterLeagueSta: number,
    masterLeagueCp: number,
    masterLeagueLvl: number,
    masterLeagueRank: string
}

const LeaguePanels = ({
    greatLeagueAtk,
    greatLeagueDef,
    greatLeagueSta,
    greatLeagueCp,
    greatLeagueLvl,
    greatLeagueRank,
    ultraLeagueAtk,
    ultraLeagueDef,
    ultraLeagueSta,
    ultraLeagueCp,
    ultraLeagueLvl,
    ultraLeagueRank,
    masterLeagueAtk,
    masterLeagueDef,
    masterLeagueSta,
    masterLeagueCp,
    masterLeagueLvl,
    masterLeagueRank
}: ILeaguePanelsProps) => {

    const buildRankString = (rank: string) => {
        if (rank === "-") {
            return "Unranked";
        }

        return `Ranked ${rank}`;
    }
    return <div className="pvp-leagues">
        <div className="pvp-stats great">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/great.png" alt="Great League icon" loading="lazy" width={64} height={64} decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>Great League</h3>
            </section>
            <section className="pvp-stats-display">
                <section className="pvp-ivs">
                    <ul className="pokemon-ivs">
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{greatLeagueAtk}</span>
                                <strong className="pokemon-ivs-label">ATK</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{greatLeagueDef}</span>
                                <strong className="pokemon-ivs-label">DEF</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{greatLeagueSta}</span>
                                <strong className="pokemon-ivs-label">STA</strong>
                            </span>
                        </li>
                    </ul>
                </section>
                <section>
                    <strong>
                        {buildRankString(greatLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
        <div className="pvp-stats ultra">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png" alt="Ultra League icon" loading="lazy" width={64} height={64} decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>Ultra League</h3>
            </section>
            <section className="pvp-stats-display">
                <section className="pvp-ivs">
                    <ul className="pokemon-ivs">
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{ultraLeagueAtk}</span>
                                <strong className="pokemon-ivs-label">ATK</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{ultraLeagueDef}</span>
                                <strong className="pokemon-ivs-label">DEF</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{ultraLeagueSta}</span>
                                <strong className="pokemon-ivs-label">STA</strong>
                            </span>
                        </li>
                    </ul>
                </section>
                <section>
                    <strong>
                    {buildRankString(ultraLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
        <div className="pvp-stats master">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/master.png" alt="Master League icon" loading="lazy" width={64} height={64} decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>Master League</h3>
            </section>
            <section className="pvp-stats-display">
                <section className="pvp-ivs">
                    <ul className="pokemon-ivs">
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{masterLeagueAtk}</span>
                                <strong className="pokemon-ivs-label">ATK</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{masterLeagueDef}</span>
                                <strong className="pokemon-ivs-label">DEF</strong>
                            </span>
                        </li>
                        <li>
                            <span className="pokemon-ivs-item">
                                <span>{masterLeagueSta}</span>
                                <strong className="pokemon-ivs-label">STA</strong>
                            </span>
                        </li>
                    </ul>
                </section>
                <section>
                    <strong>
                    {buildRankString(masterLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
    </div>;
}

export default LeaguePanels;