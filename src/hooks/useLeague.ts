import { useEffect, useState } from "react";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";

export enum LeagueType {
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE,
    CUSTOM_CUP
}

const getDefaultLeagueType = () => {
    const cachedValue = readSessionValue(ConfigKeys.LastLeague);
    if (!cachedValue) {
        return undefined;
    }

    const typedValue = +cachedValue as LeagueType;

    return typedValue;
}

const useLeague = () => {
    const [league, setLeague] = useState<LeagueType>(getDefaultLeagueType() ?? LeagueType.GREAT_LEAGUE);

    useEffect(() => {
        writeSessionValue(ConfigKeys.LastLeague, JSON.stringify(league));
    }, [league]);

    const handleSetLeague = (newLeague: LeagueType) => {
        setLeague(newLeague);
    }

    return {
        league,
        handleSetLeague
    };
}

export default useLeague;