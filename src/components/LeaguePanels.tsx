import "./LeaguePanels.scss";

interface ILeaguePanelsProps {
    greatLeagueAtk: number,
    greatLeagueDef: number,
    greatLeagueSta: number,
    greatLeaguePercent: number,
    greatLeaguePercentile: number,
    greatLeagueRank: string,
    greatLeagueBestFamilyMemberName: string,
    ultraLeagueAtk: number,
    ultraLeagueDef: number,
    ultraLeagueSta: number,
    ultraLeagueRank: string,
    ultraLeagueBestFamilyMemberName: string,
    ultraLeaguePercent: number,
    ultraLeaguePercentile: number,
    masterLeagueAtk: number,
    masterLeagueDef: number,
    masterLeagueSta: number,
    masterLeagueRank: string
    masterLeagueBestFamilyMemberName: string,
    masterLeaguePercent: number,
    masterLeaguePercentile: number,
}

const LeaguePanels = ({
    greatLeagueAtk,
    greatLeagueDef,
    greatLeagueSta,
    greatLeaguePercent,
    greatLeaguePercentile,
    greatLeagueRank,
    greatLeagueBestFamilyMemberName,
    ultraLeagueAtk,
    ultraLeagueDef,
    ultraLeagueSta,
    ultraLeaguePercent,
    ultraLeaguePercentile,
    ultraLeagueRank,
    ultraLeagueBestFamilyMemberName,
    masterLeagueAtk,
    masterLeagueDef,
    masterLeagueSta,
    masterLeaguePercent,
    masterLeaguePercentile,
    masterLeagueRank,
    masterLeagueBestFamilyMemberName
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
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/great.png" alt="Great League icon" loading="lazy" decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>
                    {greatLeaguePercent}% <span className="percentile">(#{greatLeaguePercentile})</span>
                </h3>
                {greatLeagueBestFamilyMemberName && <h4>({greatLeagueBestFamilyMemberName})</h4>}
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
                    <strong className="pokemon-ivs-ranked">
                        {buildRankString(greatLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
        <div className="pvp-stats ultra">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png" alt="Ultra League icon" loading="lazy" decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>
                    {ultraLeaguePercent}% <span className="percentile">(#{ultraLeaguePercentile})</span>
                </h3>
                {ultraLeagueBestFamilyMemberName && <h4>({ultraLeagueBestFamilyMemberName})</h4>}
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
                    <strong className="pokemon-ivs-ranked">
                    {buildRankString(ultraLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
        <div className="pvp-stats master">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/master.png" alt="Master League icon" loading="lazy" decoding="async" data-nimg="1" className="pvp-img"/>
                <h3>
                    {masterLeaguePercent}% <span className="percentile">(#{masterLeaguePercentile})</span>
                </h3>
                {masterLeagueBestFamilyMemberName && <h4>({masterLeagueBestFamilyMemberName})</h4>}
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
                    <strong className="pokemon-ivs-ranked">
                    {buildRankString(masterLeagueRank)}
                    </strong>
                </section>
            </section>
        </div>
    </div>;
}

export default LeaguePanels;