import React, { useCallback } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { Language, useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LeagueRanks.scss"
import ListEntry from "./ListEntry";
import PokemonImage from "./PokemonImage";
import { usePvp } from "../contexts/pvp-context";
import { shortName } from "../utils/pokemon-helper";

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemon: IGamemasterPokemon,
    pokemonRankInLeague: string | undefined,
    type?: string | undefined
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat;
    ultraLeagueStats: LeagueStat;
    masterLeagueStats: LeagueStat;
    customLeagueStats: LeagueStat;
    raidsStats: LeagueStat;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

export const buildRankString = (rank: string|undefined, language: Language) => {
    if (!rank) {
        return undefined;
    }

    return language === Language.Portuguese ?
        `${rank.replace("st", "º").replace("nd", "º").replace("rd", "º").replace("th", "º")}` :
        language === Language.Bosnian ?
        `${rank.replace("st", ".").replace("nd", ".").replace("rd", ".").replace("th", ".")}` :
        `${rank}`;
}

const LeagueRanks = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    customLeagueStats,
    raidsStats,
    league,
    handleSetLeague
}: ILeaguePanelsProps) => {
    const {currentLanguage} = useLanguage();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const renderCustom = false;

    const getLeagueType = useCallback((league: string) => {
        switch (league) {
            case "great":
                return LeagueType.GREAT_LEAGUE;
            case "ultra":
                return LeagueType.ULTRA_LEAGUE;
            case "master":
                return LeagueType.MASTER_LEAGUE;
            case "custom":
                return LeagueType.CUSTOM_CUP;
            case "raid":
                return LeagueType.RAID;
            default:
                throw new Error("Missing case for switch: " + league);
        }
    }, []);

    const computeRankChange = useCallback((speciesId: string, leagueTitle: string) => {
        if (!pvpFetchCompleted || leagueTitle === "raid") {
            return "";
        }

        return ` ${(!rankLists[getLeagueType(leagueTitle)][speciesId] || rankLists[getLeagueType(leagueTitle)][speciesId].rankChange === 0) ? "" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange < 0 ? "▾" + rankLists[getLeagueType(leagueTitle)][speciesId].rankChange * -1 : "▴" + rankLists[getLeagueType(leagueTitle)][speciesId].rankChange}`;
    }, [pvpFetchCompleted, rankLists, getLeagueType]);

    const rankChangeClassName = useCallback((speciesId: string, leagueTitle: string) => (!pvpFetchCompleted || !rankLists[getLeagueType(leagueTitle)][speciesId]) ? "" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange === 0 ? "neutral" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange < 0 ? "nerfed" : "buffed"
    , [pvpFetchCompleted, rankLists, getLeagueType]);


    const renderPanel = useCallback((leagueStat: LeagueStat) => {
        let logoSrc = "";
        switch (leagueStat.leagueTitle) {
            case "great":
                logoSrc = `/images/leagues/great.png`;
                break;
            case "ultra":
                logoSrc = `/images/leagues/ultra.png`;
                break;
            case "master":
                logoSrc = `/images/leagues/master.png`;
                break;
            case "custom":
                logoSrc = `/images/leagues/fantasy-cup.png`;
                break;
            case "raid":
                logoSrc = `/images/tx_raid_coin.png`;
                break;
        }

        const leagueToLeagueName = (league: LeagueType) => {
            switch (league) {
                case LeagueType.GREAT_LEAGUE:
                    return "great";
                case LeagueType.ULTRA_LEAGUE:
                    return "ultra";
                case LeagueType.MASTER_LEAGUE:
                    return "master";
                case LeagueType.CUSTOM_CUP:
                    return "custom";
                case LeagueType.RAID:
                    return "raid";
            }
        }

        const defaultBackgroundStyle = "normal-entry";

        const rankString = buildRankString(leagueStat.pokemonRankInLeague, currentLanguage);
        
        return (
            <ListEntry
                mainIcon={{
                    imageDescription: leagueStat.leagueTitle,
                    image: <div className={leagueStat.leagueTitle === "raid" ? "img-padding-extra" : ""}><img className = {leagueStat.leagueTitle === "raid" ? "raid-img-with-contrast" : ""} height={leagueStat.leagueTitle === "raid" ? 20 : 28} width={leagueStat.leagueTitle === "raid" ? 20 : 28} src={logoSrc} alt={leagueStat.leagueTitle}/></div>,
                    withBackground: false
                }}
                extraIcons={[
                    {
                        imageDescription: "Most relevant Pokémon",
                        image: <PokemonImage pokemon={leagueStat.bestReachablePokemon} withName={false} specificWidth={28} specificHeight={28}/>,
                        imageSideText: shortName(leagueStat.bestReachablePokemon.speciesName),
                        withBackground: true
                    }
                ]}
                backgroundColorClassName={leagueToLeagueName(league) === leagueStat.leagueTitle ? leagueStat.leagueTitle : defaultBackgroundStyle}
                onClick={() => handleSetLeague(getLeagueType(leagueStat.leagueTitle))}
                secondaryContent={[
                    <React.Fragment key={leagueStat.leagueTitle}>
                        {rankString && <div className="cp-container">{rankString}</div>}
                        {rankString ? translator(TranslatorKeys.Ranked, currentLanguage) : <div className="unranked">{translator(TranslatorKeys.Unranked, currentLanguage)}</div>}
                        {leagueStat.type && <img alt='type' className="with-img-dropShadow" src={`/images/types/${leagueStat.type}.png`} height={20} width={20}/>}
                        <span className={`larger-rank-change with-brightness ${leagueStat.leagueTitle !== "raid" && rankChangeClassName(leagueStat.bestReachablePokemon.speciesId, leagueStat.leagueTitle)}`}>{computeRankChange(leagueStat.bestReachablePokemon.speciesId, leagueStat.leagueTitle)}</span>
                    </React.Fragment>
                ]}
                slim
                soft
                defaultBackgroundStyle={defaultBackgroundStyle}
            />
        );
    }, [computeRankChange, currentLanguage, getLeagueType, handleSetLeague, league, rankChangeClassName]);

    return <div className="default-padding pvp-leagues-2 moves-list slim-list">
        {renderPanel(greatLeagueStats)}
        {renderPanel(ultraLeagueStats)}
        {renderPanel(masterLeagueStats)}
        {renderCustom && renderPanel(customLeagueStats)}
        {renderPanel(raidsStats)}
    </div>;
}

export default LeagueRanks;