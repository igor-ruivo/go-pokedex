import { useEffect, useState } from "react";
import { ListType } from "../views/pokedex";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";

const getDefaultListType = () => {
    const cachedValue = readSessionValue(ConfigKeys.LastListType);
    if (!cachedValue) {
        return undefined;
    }

    const typedValue = +cachedValue as ListType;

    return typedValue === ListType.POKEDEX ? ListType.GREAT_LEAGUE : typedValue;
}

const useLeague = () => {
    const [league, setLeague] = useState<ListType>(getDefaultListType() ?? ListType.GREAT_LEAGUE);

    useEffect(() => {
        writeSessionValue(ConfigKeys.LastListType, JSON.stringify(league));
    }, [league]);

    const handleSetLeague = (newLeague: ListType) => {
        setLeague(newLeague);
    }

    const result: [ListType, (newLeague: ListType) => void] = [league, handleSetLeague];
    return result;
}

export default useLeague;