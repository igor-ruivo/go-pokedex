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

    interface PokemonLeagueMove {
        moveName: string,
        type: string,
        typeImgUrl: string,
        isElite: boolean,
        isLegacy: boolean
    }

    interface LeagueStat {
        leagueTitle: string,
        bestReachablePokemonName: string,
        pokemonRankInLeague: string,
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
                                <div className="cp-and-level">{leagueStat.pokemonCP} CP @ LVL {leagueStat.pokemonLevel}</div>
                            </div>
                </section>
                <section className="pvp-stats-display">
                    <section className="pvp-ivs">
                        <ul className="pokemon-ivs">
                            <li>
                                <span className="pokemon-ivs-item">
                                    <span>{leagueStat.atk}</span>
                                    <strong className="pokemon-ivs-label">ATK</strong>
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
                                    <strong className="pokemon-ivs-label">STA</strong>
                                </span>
                            </li>
                        </ul>
                    </section>
                    <section>
                        <div className="cp-and-level-recommended"><strong>{leagueStat.bestCP} CP @ LVL {leagueStat.bestLevel}</strong></div>
                    </section>
                    {leagueStat.fastAttack && <strong className="pokemon-attack">
                        <div className="type-attack">{leagueStat.fastAttack && <img src={typeSrc(leagueStat.fastAttack.type)}/>}{leagueStat.fastAttack.moveName}{leagueStat.fastAttack.isElite ? "*" : leagueStat.fastAttack.isLegacy ? <sup>†</sup> : <></>}</div>
                        <div className="type-attack">{leagueStat.chargedAttack1 && <img src={typeSrc(leagueStat.chargedAttack1.type)}/>}{leagueStat.chargedAttack1.moveName}{leagueStat.chargedAttack1.isElite ? "*" : leagueStat.chargedAttack1.isLegacy ? <sup>†</sup> : <></>}</div>
                        <div className="type-attack">{leagueStat.chargedAttack2 && <img src={typeSrc(leagueStat.chargedAttack2.type)}/>}{leagueStat.chargedAttack2.moveName}{leagueStat.chargedAttack2.isElite ? "*" : leagueStat.chargedAttack2.isLegacy ? <sup>†</sup> : <></>}</div>
                    </strong>}
                </section>
            </div>
        );
    }

    return <div className="pvp-leagues">
        {renderPanel({
            leagueTitle: "great",
            bestReachablePokemonName: greatLeagueBestFamilyMemberName,
            pokemonRankInLeague: greatLeagueRank,
            pokemonLeaguePercentage: greatLeaguePercent,
            pokemonLeaguePercentile: greatLeaguePercentile,
            pokemonCP: greatLeagueCP,
            pokemonLevel: greatLeagueLVL,
            atk: greatLeagueAtk,
            def: greatLeagueDef,
            hp: greatLeagueSta,
            bestCP: greatLeagueBestCP,
            bestLevel: greatLeagueBestLVL,
            fastAttack: {
                moveName: greatLeagueFastAttack,
                type: greatLeagueFastAttackType,
                typeImgUrl: greatLeagueFastAttackUrl,
                isElite: greatLeagueFastAttackIsElite,
                isLegacy: greatLeagueFastAttackIsLegacy
            },
            chargedAttack1: {
                moveName: greatLeagueCharged1,
                type: greatLeagueCharged1Type,
                typeImgUrl: greatLeagueCharged1Url,
                isElite: greatLeagueCharged1IsElite,
                isLegacy: greatLeagueCharged1IsLegacy
            },
            chargedAttack2: {
                moveName: greatLeagueCharged2,
                type: greatLeagueCharged2Type,
                typeImgUrl: greatLeagueCharged2Url,
                isElite: greatLeagueCharged2IsElite,
                isLegacy: greatLeagueCharged2IsLegacy
            }
        })}
        {renderPanel({
            leagueTitle: "ultra",
            bestReachablePokemonName: ultraLeagueBestFamilyMemberName,
            pokemonRankInLeague: ultraLeagueRank,
            pokemonLeaguePercentage: ultraLeaguePercent,
            pokemonLeaguePercentile: ultraLeaguePercentile,
            pokemonCP: ultraLeagueCP,
            pokemonLevel: ultraLeagueLVL,
            atk: ultraLeagueAtk,
            def: ultraLeagueDef,
            hp: ultraLeagueSta,
            bestCP: ultraLeagueBestCP,
            bestLevel: ultraLeagueBestLVL,
            fastAttack: {
                moveName: ultraLeagueFastAttack,
                type: ultraLeagueFastAttackType,
                typeImgUrl: ultraLeagueFastAttackUrl,
                isElite: ultraLeagueFastAttackIsElite,
                isLegacy: ultraLeagueFastAttackIsLegacy
            },
            chargedAttack1: {
                moveName: ultraLeagueCharged1,
                type: ultraLeagueCharged1Type,
                typeImgUrl: ultraLeagueCharged1Url,
                isElite: ultraLeagueCharged1IsElite,
                isLegacy: ultraLeagueCharged1IsLegacy
            },
            chargedAttack2: {
                moveName: ultraLeagueCharged2,
                type: ultraLeagueCharged2Type,
                typeImgUrl: ultraLeagueCharged2Url,
                isElite: ultraLeagueCharged2IsElite,
                isLegacy: ultraLeagueCharged2IsLegacy
            }
        })}
        {renderPanel({
            leagueTitle: "master",
            bestReachablePokemonName: masterLeagueBestFamilyMemberName,
            pokemonRankInLeague: masterLeagueRank,
            pokemonLeaguePercentage: masterLeaguePercent,
            pokemonLeaguePercentile: masterLeaguePercentile,
            pokemonCP: masterLeagueCP,
            pokemonLevel: masterLeagueLVL,
            atk: masterLeagueAtk,
            def: masterLeagueDef,
            hp: masterLeagueSta,
            bestCP: masterLeagueBestCP,
            bestLevel: masterLeagueBestLVL,
            fastAttack: {
                moveName: masterLeagueFastAttack,
                type: masterLeagueFastAttackType,
                typeImgUrl: masterLeagueFastAttackUrl,
                isElite: masterLeagueFastAttackIsElite,
                isLegacy: masterLeagueFastAttackIsLegacy
            },
            chargedAttack1: {
                moveName: masterLeagueCharged1,
                type: masterLeagueCharged1Type,
                typeImgUrl: masterLeagueCharged1Url,
                isElite: masterLeagueCharged1IsElite,
                isLegacy: masterLeagueCharged1IsLegacy
            },
            chargedAttack2: {
                moveName: masterLeagueCharged2,
                type: masterLeagueCharged2Type,
                typeImgUrl: masterLeagueCharged2Url,
                isElite: masterLeagueCharged2IsElite,
                isLegacy: masterLeagueCharged2IsLegacy
            }
        })}
    </div>;
}

export default LeaguePanels;