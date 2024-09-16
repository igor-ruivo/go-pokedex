import { useCallback, useState } from "react";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ordinal } from "../utils/conversions";
import "./LeaguePanels.scss";
import { buildRankString } from "./LeagueRanks";
import RaidCard from "./RaidCard";
import { computeNeededResources } from "../utils/pokemon-helper";

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemonName: string,
    pokemonLeaguePercentage: number,
    pokemonLeaguePercentile: number,
    pokemonCP: number,
    pokemonLevel: number,
    atk: number,
    def: number,
    hp: number,
    bestCP: number,
    bestLevel: number,
    bestIsShadow: boolean
}

interface TypeRank {
    type: PokemonTypes,
    rank: number,
    dps: number
}

interface RaidStat {
    bestReachablePokemonName: string,
    rank: number,
    dps: number,
    typeRanks: TypeRank[]
    
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat,
    ultraLeagueStats: LeagueStat,
    masterLeagueStats: LeagueStat,
    customLeagueStats: LeagueStat,
    raidStats: RaidStat,
    atk: number,
    def: number,
    hp: number,
    league: LeagueType,
    level: number,
    isShadow: boolean,
    unranked: boolean
}

const LeaguePanels = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    customLeagueStats,
    raidStats,
    atk,
    def,
    hp,
    league,
    level,
    isShadow,
    unranked
}: ILeaguePanelsProps) => {
    const [toggled, setToggled] = useState(false);
    const {currentLanguage, currentGameLanguage} = useLanguage();

    const renderPanel = useCallback((leagueStat: LeagueStat) => {
        const pvpStatsClassName = `pvp-stats-column pvp-gap ${leagueStat.leagueTitle} spaced full-height`;
        const neededResources = computeNeededResources(level, leagueStat.pokemonLevel, leagueStat.bestIsShadow);

        let logoSrc = "";
        switch (leagueStat.leagueTitle) {
            case "great":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/great-big.webp`;
                break;
            case "ultra":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/ultra-big.webp`;
                break;
            case "master":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/master-big.webp`;
                break;
            case "custom":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/fantasy-cup-big.png`;
                break;
        }

        return (
            <div className={pvpStatsClassName}>
                <div>
                    <div className="pvp-entry rank-title">
                        <div className="pvp-entry-content potential">
                            <strong>{translator(TranslatorKeys.Perfection, currentLanguage)}:</strong> {unranked ? "-" : <><strong className="cp-container">{leagueStat.pokemonLeaguePercentage}%</strong> <sub className="contained-big heavy-weighted-font">(#{leagueStat.pokemonLeaguePercentile})</sub></>}
                        </div>
                    </div>
                </div>
                {unranked ? <div className="unranked-pvp-stats pvp-entry centered-text aligned unranked unranked-panel">{translator(TranslatorKeys.Unranked, currentLanguage)}</div> : <div className="pvp-stats">
                    <div className="template-pvp-labels">
                        <header>
                            {translator(TranslatorKeys.Config, currentLanguage)}:
                        </header>
                        <div>
                            <div className="pvp-entry smooth with-shadow">
                                <div className="pvp-entry-content">
                                    {translator(TranslatorKeys.Current, currentLanguage)}:
                                </div>
                            </div>
                            <div className="pvp-entry smooth with-shadow">
                                <div className="pvp-entry-content">
                                    {translator(TranslatorKeys.Best, currentLanguage)}:
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="template-pvp-labels">
                        <header>
                            IVs:
                        </header>
                        <div>
                            <div className="pvp-entry">
                                <div className="pvp-entry-content">
                                    {isShadow && !leagueStat.bestIsShadow ? Math.min(15, atk + 2) : atk} / {isShadow && !leagueStat.bestIsShadow ? Math.min(15, def + 2) : def} / {isShadow && !leagueStat.bestIsShadow ? Math.min(15, hp + 2) : hp}
                                </div>
                            </div>
                            <div className="pvp-entry">
                                <div className="pvp-entry-content">
                                    {leagueStat.atk} / {leagueStat.def} / {leagueStat.hp}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="template-pvp-labels">
                        <header>
                            {translator(TranslatorKeys.Peaks, currentLanguage)}:
                        </header>
                        <div>
                            <div className="pvp-entry clickable" onClick={() => setToggled(p => !p)}>
                                <div className="pvp-entry-content potential">
                                    <>
                                        {!toggled ? <><strong className="cp-container">{leagueStat.pokemonCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> <div className="contained-big weighted-font">@ {translator(TranslatorKeys.LVL, currentLanguage)} <strong className={`${level > leagueStat.pokemonLevel ? "higher-level" : "cp-container"}`}>{leagueStat.pokemonLevel}</strong></div></> : 
                                        level > leagueStat.pokemonLevel ? <strong className="higher-level ">{translator(TranslatorKeys.LevelExceeded, currentLanguage)}</strong> : level === leagueStat.pokemonLevel ? <strong className="buffed  with-brightness">{translator(TranslatorKeys.Reached, currentLanguage)}</strong> : <div className="needed-resources">
                                            <img src={`${process.env.PUBLIC_URL}/images/stardust.png`} alt="stardust" height={16} width={16}/><strong className=" cp-container">{neededResources.stardust > 1000 ? Math.round(Math.round(neededResources.stardust / 1000) * 10) / 10 + "K" : neededResources.stardust}</strong>
                                            {neededResources.candies !== 0 && <><img src={`${process.env.PUBLIC_URL}/images/candy.png`} alt="candy" height={16} width={16}/><strong className=" cp-container">{neededResources.candies}</strong></>}
                                            {neededResources.candiesXL !== 0 && <><img src={`${process.env.PUBLIC_URL}/images/xl-candy.png`} alt="xl-candy" height={16} width={16}/><strong className=" cp-container">{neededResources.candiesXL}</strong></>}
                                        </div>}
                                    </>
                                </div>
                            </div>
                            <div className="pvp-entry">
                                <div className="pvp-entry-content potential">
                                    <strong className="cp-container">{leagueStat.bestCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> <div className="contained-big weighted-font">@ {translator(TranslatorKeys.LVL, currentLanguage)} <strong className="cp-container">{leagueStat.bestLevel}</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>}
                <div className="centered-text fitting-content pvp-entry">... {translator(TranslatorKeys.As, currentLanguage)} {leagueStat.bestReachablePokemonName}</div>
                <img className='background-absolute-img' width="100%" height="100%" src={logoSrc} alt={leagueStat.leagueTitle} />
            </div>
        );
    }, [atk, currentGameLanguage, currentLanguage, def, hp, isShadow, level, toggled, unranked]);

    const renderRaidPanel = useCallback((raidStat: RaidStat) => {
        return (
            <div className="pvp-stats-column raid-gap raid full-height spaced">
                <div>
                    <div className="pvp-entry rank-title">
                        <div className="pvp-entry-content potential">
                            <strong className="cp-container">
                            {buildRankString(ordinal(raidStat.rank), currentLanguage)}&nbsp;
                            </strong>
                            <strong>
                                {translator(TranslatorKeys.Ranked, currentLanguage)}
                            </strong>
                            <strong>
                                {translator(TranslatorKeys.In, currentLanguage)} {gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}
                            </strong>
                            <sub className="contained-big weighted-font">{`(${Math.round(raidStat.dps * 100) / 100} DPS)`}</sub>
                        </div>
                    </div>
                </div>
                <div className={`raid-stats ${raidStat.typeRanks.length < 3 ? "double-card" : "triple-card"}`}>
                    {
                        raidStat.typeRanks.map((r, i) => (
                            <div key={!r.type ? "undefined-second-type-" + i : r.type} className="pvp-labels">
                                 <RaidCard
                                    type={r.type}
                                    rank={r.rank}
                                    dps={r.dps}
                                />
                            </div>
                        ))
                    }
                    {Array.from({ length: Math.max(0, 2 - raidStats.typeRanks.length) }).map((_, i) => (
                        <div key={"undefined-second-type-" + i} className="pvp-labels">
                            <RaidCard
                                type={PokemonTypes.Normal}
                                rank={0}
                                dps={0}
                            />
                        </div>
                    ))}
                </div>
                <div className="centered-text pvp-entry fitting-content">... {translator(TranslatorKeys.As, currentLanguage)} {raidStat.bestReachablePokemonName}</div>
                <img className='background-absolute-img-raid raid-img-with-contrast' width="100%" height="100%" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`} alt="raid" />
            </div>
        );
    }, [raidStats, currentGameLanguage, currentLanguage]);

    return <div>
        {league === LeagueType.GREAT_LEAGUE && renderPanel(greatLeagueStats)}
        {league === LeagueType.ULTRA_LEAGUE && renderPanel(ultraLeagueStats)}
        {league === LeagueType.MASTER_LEAGUE && renderPanel(masterLeagueStats)}
        {league === LeagueType.CUSTOM_CUP && renderPanel(customLeagueStats)}
        {league === LeagueType.RAID && renderRaidPanel(raidStats)}
    </div>;
}

export default LeaguePanels;