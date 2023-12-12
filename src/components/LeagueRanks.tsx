import React from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { Language, useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LeagueRanks.scss"
import ListEntry from "./ListEntry";
import PokemonImage from "./PokemonImage";
import { usePvp } from "../contexts/pvp-context";

interface LeagueStat {
    leagueTitle: string,
    bestReachablePokemon: IGamemasterPokemon,
    pokemonRankInLeague: string | undefined,
}

interface ILeaguePanelsProps {
    greatLeagueStats: LeagueStat;
    ultraLeagueStats: LeagueStat;
    masterLeagueStats: LeagueStat;
    customLeagueStats: LeagueStat;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const LeagueRanks = ({
    greatLeagueStats,
    ultraLeagueStats,
    masterLeagueStats,
    customLeagueStats,
    league,
    handleSetLeague
}: ILeaguePanelsProps) => {
    const {currentLanguage} = useLanguage();
    const {rankLists, pvpFetchCompleted} = usePvp();

    const buildRankString = (rank: string|undefined) => {
        if (!rank) {
            return translator(TranslatorKeys.Unranked, currentLanguage);
        }

        const ranked = translator(TranslatorKeys.Ranked, currentLanguage);
        return currentLanguage === Language.Portuguese ?
            `${rank.replace("st", "º").replace("nd", "º").replace("rd", "º").replace("th", "º")} ${ranked}` :
            currentLanguage === Language.Bosnian ?
            `${rank.replace("st", ".").replace("nd", ".").replace("rd", ".").replace("th", ".")} ${ranked}` :
            `Ranked ${rank}`;
    }

    const getLeagueType = (league: string) => {
        switch (league) {
            case "great":
                return LeagueType.GREAT_LEAGUE;
            case "ultra":
                return LeagueType.ULTRA_LEAGUE;
            case "master":
                return LeagueType.MASTER_LEAGUE;
            case "custom":
                return LeagueType.CUSTOM_CUP;
            default:
                throw new Error("Missing case for switch: " + league);
        }
    }

    const computeRankChange = (speciesId: string, leagueTitle: string) => {
        if (!pvpFetchCompleted) {
            return "";
        }

        return ` ${(!rankLists[getLeagueType(leagueTitle)][speciesId] || rankLists[getLeagueType(leagueTitle)][speciesId].rankChange === 0) ? "" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange < 0 ? "▾" + rankLists[getLeagueType(leagueTitle)][speciesId].rankChange * -1 : "▴" + rankLists[getLeagueType(leagueTitle)][speciesId].rankChange}`;
    }

    const rankChangeClassName = (speciesId: string, leagueTitle: string) => (!pvpFetchCompleted || !rankLists[getLeagueType(leagueTitle)][speciesId]) ? "" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange === 0 ? "neutral" : rankLists[getLeagueType(leagueTitle)][speciesId].rankChange < 0 ? "nerfed" : "buffed";


    const renderPanel = (leagueStat: LeagueStat) => {
        let logoSrc = "";
        switch (leagueStat.leagueTitle) {
            case "great":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/great.png`;
                break;
            case "ultra":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/ultra.png`;
                break;
            case "master":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/master.png`;
                break;
            case "custom":
                logoSrc = `${process.env.PUBLIC_URL}/images/leagues/retro.png`;
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
            }
        }

        return (
            <div className={leagueToLeagueName(league) !== leagueStat.leagueTitle ? "not-selected" : ""}>
                <ListEntry
                    mainIcon={{
                        imageDescription: leagueStat.leagueTitle,
                        image: <img height={28} width={28} src={logoSrc} alt={leagueStat.leagueTitle}/>,
                        withBackground: false
                    }}
                    extraIcons={[
                        {
                            imageDescription: "Most relevant Pokémon",
                            image: <PokemonImage pokemon={leagueStat.bestReachablePokemon} withName={false} specificWidth={28} specificHeight={28}/>,
                            imageSideText: leagueStat.bestReachablePokemon.speciesShortName,
                            withBackground: true
                        }
                    ]}
                    backgroundColorClassName={leagueStat.leagueTitle}
                    onClick={() => handleSetLeague(getLeagueType(leagueStat.leagueTitle))}
                    secondaryContent={[
                        <React.Fragment key={leagueStat.leagueTitle}>
                            {buildRankString(leagueStat.pokemonRankInLeague)}
                            <span className={`larger-rank-change with-brightness ${rankChangeClassName(leagueStat.bestReachablePokemon.speciesId, leagueStat.leagueTitle)}`}>{computeRankChange(leagueStat.bestReachablePokemon.speciesId, leagueStat.leagueTitle)}</span>
                        </React.Fragment>
                    ]}
                    slim
                />
            </div>
        );
    }

    return <div className="default-padding pvp-leagues-2 moves-list slim-list">
        {renderPanel(greatLeagueStats)}
        {renderPanel(ultraLeagueStats)}
        {renderPanel(masterLeagueStats)}
        {renderPanel(customLeagueStats)}
    </div>;
}

export default LeagueRanks;