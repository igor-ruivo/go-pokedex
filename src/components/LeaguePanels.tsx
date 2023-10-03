import "./LeaguePanels.scss";

interface ILeaguePanelsProps {
    greatLeagueAtk: number,
    greatLeagueDef: number,
    greatLeagueSta: number,
    greatLeaguePercent: number,
    greatLeaguePercentile: number,
    greatLeagueRank: string,
    greatLeagueBestFamilyMemberName: string,
    greatLeagueFastAttack: string,
    greatLeagueFastAttackIsLegacy: boolean,
    greatLeagueFastAttackType: string,
    greatLeagueCharged1: string,
    greatLeagueCharged1IsLegacy: boolean,
    greatLeagueCharged1Type: string,
    greatLeagueCharged2: string,
    greatLeagueCharged2IsLegacy: boolean,
    greatLeagueCharged2Type: string,
    ultraLeagueAtk: number,
    ultraLeagueDef: number,
    ultraLeagueSta: number,
    ultraLeagueRank: string,
    ultraLeagueBestFamilyMemberName: string,
    ultraLeaguePercent: number,
    ultraLeaguePercentile: number,
    ultraLeagueFastAttack: string,
    ultraLeagueFastAttackIsLegacy: boolean,
    ultraLeagueFastAttackType: string,
    ultraLeagueCharged1: string,
    ultraLeagueCharged1IsLegacy: boolean,
    ultraLeagueCharged1Type: string,
    ultraLeagueCharged2: string,
    ultraLeagueCharged2IsLegacy: boolean,
    ultraLeagueCharged2Type: string,
    masterLeagueAtk: number,
    masterLeagueDef: number,
    masterLeagueSta: number,
    masterLeagueRank: string
    masterLeagueBestFamilyMemberName: string,
    masterLeaguePercent: number,
    masterLeaguePercentile: number,
    masterLeagueFastAttack: string,
    masterLeagueFastAttackIsLegacy: boolean,
    masterLeagueFastAttackType: string,
    masterLeagueCharged1: string,
    masterLeagueCharged1IsLegacy: boolean,
    masterLeagueCharged1Type: string,
    masterLeagueCharged2: string,
    masterLeagueCharged2IsLegacy: boolean,
    masterLeagueCharged2Type: string,
}

const LeaguePanels = ({
    greatLeagueAtk,
    greatLeagueDef,
    greatLeagueSta,
    greatLeaguePercent,
    greatLeaguePercentile,
    greatLeagueRank,
    greatLeagueBestFamilyMemberName,
    greatLeagueFastAttack,
    greatLeagueFastAttackIsLegacy,
    greatLeagueFastAttackType,
    greatLeagueCharged1,
    greatLeagueCharged1IsLegacy,
    greatLeagueCharged1Type,
    greatLeagueCharged2,
    greatLeagueCharged2IsLegacy,
    greatLeagueCharged2Type,
    ultraLeagueAtk,
    ultraLeagueDef,
    ultraLeagueSta,
    ultraLeaguePercent,
    ultraLeaguePercentile,
    ultraLeagueRank,
    ultraLeagueBestFamilyMemberName,
    ultraLeagueFastAttack,
    ultraLeagueFastAttackIsLegacy,
    ultraLeagueFastAttackType,
    ultraLeagueCharged1,
    ultraLeagueCharged1IsLegacy,
    ultraLeagueCharged1Type,
    ultraLeagueCharged2,
    ultraLeagueCharged2IsLegacy,
    ultraLeagueCharged2Type,
    masterLeagueAtk,
    masterLeagueDef,
    masterLeagueSta,
    masterLeaguePercent,
    masterLeaguePercentile,
    masterLeagueRank,
    masterLeagueBestFamilyMemberName,
    masterLeagueFastAttack,
    masterLeagueFastAttackIsLegacy,
    masterLeagueFastAttackType,
    masterLeagueCharged1,
    masterLeagueCharged1IsLegacy,
    masterLeagueCharged1Type,
    masterLeagueCharged2,
    masterLeagueCharged2IsLegacy,
    masterLeagueCharged2Type
}: ILeaguePanelsProps) => {

    const buildRankString = (rank: string) => {
        if (rank === "-") {
            return "Unranked";
        }

        return `Ranked ${rank}`;
    }

    const greatLeagueRankClass = (rank: string) => "pokemon-ivs-ranked" + (rank === "-" ? " unranked" : "");

    const greatLeagueFastAttackUrl = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${greatLeagueFastAttackType}.png`;
    const greatLeagueCharged1Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${greatLeagueCharged1Type}.png`;
    const greatLeagueCharged2Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${greatLeagueCharged2Type}.png`;
    const ultraLeagueFastAttackUrl = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${ultraLeagueFastAttackType}.png`;
    const ultraLeagueCharged1Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${ultraLeagueCharged1Type}.png`;
    const ultraLeagueCharged2Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${ultraLeagueCharged2Type}.png`;
    const masterLeagueFastAttackUrl = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${masterLeagueFastAttackType}.png`;
    const masterLeagueCharged1Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${masterLeagueCharged1Type}.png`;
    const masterLeagueCharged2Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${masterLeagueCharged2Type}.png`;

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
                    <strong className={greatLeagueRankClass(greatLeagueRank)}>
                        {buildRankString(greatLeagueRank)}
                    </strong>
                </section>
                <strong className="pokemon-attack">
                    <div className="type-attack">{greatLeagueFastAttack && <img src={greatLeagueFastAttackUrl}/>}{greatLeagueFastAttack}{greatLeagueFastAttackIsLegacy && "*"}</div>
                    <div className="type-attack">{greatLeagueCharged1 && <img src={greatLeagueCharged1Url}/>}{greatLeagueCharged1}{greatLeagueCharged1IsLegacy && "*"}</div>
                    <div className="type-attack">{greatLeagueCharged2 && <img src={greatLeagueCharged2Url}/>}{greatLeagueCharged2}{greatLeagueCharged2IsLegacy && "*"}</div>
                </strong>
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
                    <strong className={greatLeagueRankClass(ultraLeagueRank)}>
                        {buildRankString(ultraLeagueRank)}
                    </strong>
                </section>
                <section>
                <strong className="pokemon-attack">
                    <div className="type-attack">{ultraLeagueFastAttack && <img src={ultraLeagueFastAttackUrl}/>}{ultraLeagueFastAttack}{ultraLeagueFastAttackIsLegacy && "*"}</div>
                    <div className="type-attack">{ultraLeagueCharged1 && <img src={ultraLeagueCharged1Url}/>}{ultraLeagueCharged1}{ultraLeagueCharged1IsLegacy && "*"}</div>
                    <div className="type-attack">{ultraLeagueCharged2 && <img src={ultraLeagueCharged2Url}/>}{ultraLeagueCharged2}{ultraLeagueCharged2IsLegacy && "*"}</div>
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
                    <strong className={greatLeagueRankClass(masterLeagueRank)}>
                        {buildRankString(masterLeagueRank)}
                    </strong>
                </section>
                <strong className="pokemon-attack">
                    <div className="type-attack">{masterLeagueFastAttack && <img src={masterLeagueFastAttackUrl}/>}{masterLeagueFastAttack}{masterLeagueFastAttackIsLegacy && "*"}</div>
                    <div className="type-attack">{masterLeagueCharged1 && <img src={masterLeagueCharged1Url}/>}{masterLeagueCharged1}{masterLeagueCharged1IsLegacy && "*"}</div>
                    <div className="type-attack">{masterLeagueCharged2 && <img src={masterLeagueCharged2Url}/>}{masterLeagueCharged2}{masterLeagueCharged2IsLegacy && "*"}</div>
                </strong>
            </section>
        </div>
    </div>;
}

export default LeaguePanels;