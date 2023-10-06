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
    greatLeagueFastAttackIsElite: boolean,
    greatLeagueFastAttackType: string,
    greatLeagueCharged1: string,
    greatLeagueCharged1IsLegacy: boolean,
    greatLeagueCharged1IsElite: boolean,
    greatLeagueCharged1Type: string,
    greatLeagueCharged2: string,
    greatLeagueCharged2IsLegacy: boolean,
    greatLeagueCharged2IsElite: boolean,
    greatLeagueCharged2Type: string,
    greatLeagueCP: number,
    greatLeagueLVL: number,
    greatLeagueBestCP: number,
    greatLeagueBestLVL: number,
    ultraLeagueAtk: number,
    ultraLeagueDef: number,
    ultraLeagueSta: number,
    ultraLeagueRank: string,
    ultraLeagueBestFamilyMemberName: string,
    ultraLeaguePercent: number,
    ultraLeaguePercentile: number,
    ultraLeagueFastAttack: string,
    ultraLeagueFastAttackIsLegacy: boolean,
    ultraLeagueFastAttackIsElite: boolean,
    ultraLeagueFastAttackType: string,
    ultraLeagueCharged1: string,
    ultraLeagueCharged1IsLegacy: boolean,
    ultraLeagueCharged1IsElite: boolean,
    ultraLeagueCharged1Type: string,
    ultraLeagueCharged2: string,
    ultraLeagueCharged2IsLegacy: boolean,
    ultraLeagueCharged2IsElite: boolean,
    ultraLeagueCharged2Type: string,
    ultraLeagueCP: number,
    ultraLeagueLVL: number,
    ultraLeagueBestCP: number,
    ultraLeagueBestLVL: number,
    masterLeagueAtk: number,
    masterLeagueDef: number,
    masterLeagueSta: number,
    masterLeagueRank: string
    masterLeagueBestFamilyMemberName: string,
    masterLeaguePercent: number,
    masterLeaguePercentile: number,
    masterLeagueFastAttack: string,
    masterLeagueFastAttackIsLegacy: boolean,
    masterLeagueFastAttackIsElite: boolean,
    masterLeagueFastAttackType: string,
    masterLeagueCharged1: string,
    masterLeagueCharged1IsLegacy: boolean,
    masterLeagueCharged1IsElite: boolean,
    masterLeagueCharged1Type: string,
    masterLeagueCharged2: string,
    masterLeagueCharged2IsLegacy: boolean,
    masterLeagueCharged2IsElite: boolean,
    masterLeagueCharged2Type: string,
    masterLeagueCP: number,
    masterLeagueLVL: number,
    masterLeagueBestCP: number,
    masterLeagueBestLVL: number
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
    greatLeagueFastAttackIsElite,
    greatLeagueFastAttackType,
    greatLeagueCharged1,
    greatLeagueCharged1IsLegacy,
    greatLeagueCharged1IsElite,
    greatLeagueCharged1Type,
    greatLeagueCharged2,
    greatLeagueCharged2IsLegacy,
    greatLeagueCharged2IsElite,
    greatLeagueCharged2Type,
    greatLeagueCP,
    greatLeagueLVL,
    greatLeagueBestCP,
    greatLeagueBestLVL,
    ultraLeagueAtk,
    ultraLeagueDef,
    ultraLeagueSta,
    ultraLeaguePercent,
    ultraLeaguePercentile,
    ultraLeagueRank,
    ultraLeagueBestFamilyMemberName,
    ultraLeagueFastAttack,
    ultraLeagueFastAttackIsLegacy,
    ultraLeagueFastAttackIsElite,
    ultraLeagueFastAttackType,
    ultraLeagueCharged1,
    ultraLeagueCharged1IsLegacy,
    ultraLeagueCharged1IsElite,
    ultraLeagueCharged1Type,
    ultraLeagueCharged2,
    ultraLeagueCharged2IsLegacy,
    ultraLeagueCharged2IsElite,
    ultraLeagueCharged2Type,
    ultraLeagueCP,
    ultraLeagueLVL,
    ultraLeagueBestCP,
    ultraLeagueBestLVL,
    masterLeagueAtk,
    masterLeagueDef,
    masterLeagueSta,
    masterLeaguePercent,
    masterLeaguePercentile,
    masterLeagueRank,
    masterLeagueBestFamilyMemberName,
    masterLeagueFastAttack,
    masterLeagueFastAttackIsLegacy,
    masterLeagueFastAttackIsElite,
    masterLeagueFastAttackType,
    masterLeagueCharged1,
    masterLeagueCharged1IsLegacy,
    masterLeagueCharged1IsElite,
    masterLeagueCharged1Type,
    masterLeagueCharged2,
    masterLeagueCharged2IsLegacy,
    masterLeagueCharged2IsElite,
    masterLeagueCharged2Type,
    masterLeagueCP,
    masterLeagueLVL,
    masterLeagueBestCP,
    masterLeagueBestLVL
}: ILeaguePanelsProps) => {

    const buildRankString = (rank: string) => {
        if (rank === "-") {
            return "Unranked";
        }

        return `Ranked ${rank}`;
    }

    const rankClass = (rank: string) => "pokemon-ivs-ranked" + (rank === "-" ? " unranked" : "");

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
                    {greatLeagueBestFamilyMemberName && <h4>({greatLeagueBestFamilyMemberName})</h4>}
                    <strong className={rankClass(greatLeagueRank)}>
                        {buildRankString(greatLeagueRank)}
                    </strong>
                        <div className="custom-pokemon">
                            <h3>
                                <div>{greatLeaguePercent}% <span className="percentile">(#{greatLeaguePercentile})</span></div>
                            </h3>
                            <div className="cp-and-level">{greatLeagueCP} CP @ LVL {greatLeagueLVL}</div>
                        </div>
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
                    <div className="cp-and-level-recommended"><strong>{greatLeagueBestCP} CP @ LVL {greatLeagueBestLVL}</strong></div>
                </section>
                {greatLeagueFastAttack && <strong className="pokemon-attack">
                    <div className="type-attack">{greatLeagueFastAttack && <img src={greatLeagueFastAttackUrl}/>}{greatLeagueFastAttack}{greatLeagueFastAttackIsElite ? "*" : greatLeagueFastAttackIsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{greatLeagueCharged1 && <img src={greatLeagueCharged1Url}/>}{greatLeagueCharged1}{greatLeagueCharged1IsElite ? "*" : greatLeagueCharged1IsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{greatLeagueCharged2 && <img src={greatLeagueCharged2Url}/>}{greatLeagueCharged2}{greatLeagueCharged2IsElite ? "*" : greatLeagueCharged2IsLegacy ? <sup>†</sup> : <></>}</div>
                </strong>}
            </section>
            
        </div>
        <div className="pvp-stats ultra">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png" alt="Ultra League icon" loading="lazy" decoding="async" data-nimg="1" className="pvp-img"/>
                    {ultraLeagueBestFamilyMemberName && <h4>({ultraLeagueBestFamilyMemberName})</h4>}
                    <strong className={rankClass(ultraLeagueRank)}>
                        {buildRankString(ultraLeagueRank)}
                    </strong>
                    <div className="custom-pokemon">
                        <h3>
                            <div>{ultraLeaguePercent}% <span className="percentile">(#{ultraLeaguePercentile})</span></div>     
                        </h3>
                        <div className="cp-and-level">{ultraLeagueCP} CP @ LVL {ultraLeagueLVL}</div>
                    </div>
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
                    <div className="cp-and-level-recommended"><strong>{ultraLeagueBestCP} CP @ LVL {ultraLeagueBestLVL}</strong></div>
                </section>
                {ultraLeagueFastAttack && <strong className="pokemon-attack">
                    <div className="type-attack">{ultraLeagueFastAttack && <img src={ultraLeagueFastAttackUrl}/>}{ultraLeagueFastAttack}{ultraLeagueFastAttackIsElite ? "*" : ultraLeagueFastAttackIsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{ultraLeagueCharged1 && <img src={ultraLeagueCharged1Url}/>}{ultraLeagueCharged1}{ultraLeagueCharged1IsElite ? "*" : ultraLeagueCharged1IsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{ultraLeagueCharged2 && <img src={ultraLeagueCharged2Url}/>}{ultraLeagueCharged2}{ultraLeagueCharged2IsElite ? "*" : ultraLeagueCharged2IsLegacy ? <sup>†</sup> : <></>}</div>
                </strong>}
            </section>
        </div>
        <div className="pvp-stats master">
            <section className="pvp-title">
                <img src="https://www.stadiumgaming.gg/frontend/assets/img/master.png" alt="Master League icon" loading="lazy" decoding="async" data-nimg="1" className="pvp-img"/>
                    {masterLeagueBestFamilyMemberName && <h4>({masterLeagueBestFamilyMemberName})</h4>}
                    <strong className={rankClass(masterLeagueRank)}>
                        {buildRankString(masterLeagueRank)}
                    </strong>
                    <div className="custom-pokemon">
                        <h3>
                            <div>{masterLeaguePercent}% <span className="percentile">(#{masterLeaguePercentile})</span></div>
                        </h3>
                        <div className="cp-and-level">{masterLeagueCP} CP @ LVL {masterLeagueLVL}</div>
                    </div>
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
                    <div className="cp-and-level-recommended"><strong>{masterLeagueBestCP} CP @ LVL {masterLeagueBestLVL}</strong></div>
                </section>
                {masterLeagueFastAttack && <strong className="pokemon-attack">
                    <div className="type-attack">{masterLeagueFastAttack && <img src={masterLeagueFastAttackUrl}/>}{masterLeagueFastAttack}{masterLeagueFastAttackIsElite ? "*" : masterLeagueFastAttackIsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{masterLeagueCharged1 && <img src={masterLeagueCharged1Url}/>}{masterLeagueCharged1}{masterLeagueCharged1IsElite ? "*" : masterLeagueCharged1IsLegacy ? <sup>†</sup> : <></>}</div>
                    <div className="type-attack">{masterLeagueCharged2 && <img src={masterLeagueCharged2Url}/>}{masterLeagueCharged2}{masterLeagueCharged2IsElite ? "*" : masterLeagueCharged2IsLegacy ? <sup>†</sup> : <></>}</div>
                </strong>}
            </section>
        </div>
    </div>;
}

export default LeaguePanels;