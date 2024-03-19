import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, calendarCache } from '../utils/Configs';
import { mapRaidBosses } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';

interface RaidBossesContextType {
    bossesPerTier: Dictionary<IRaidBoss[]>;
    bossesFetchCompleted: boolean;
    bossesErrors: string;
}

const RaidBossesContext = createContext<RaidBossesContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<IRaidBoss[]>, boolean, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [raidBosses, fetchRaidBosses, raidBossesFetchCompleted, errorLoadingRaidBosses]: FetchData<Dictionary<IRaidBoss[]>> = useFetchUrls();

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();
        fetchRaidBosses([bossesUrl], calendarCache, {signal: controller.signal}, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon));
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchRaidBosses, fetchCompleted, gamemasterPokemon]);

    return [raidBosses[0], raidBossesFetchCompleted, errorLoadingRaidBosses];
}

export const useRaidBosses = (): RaidBossesContextType => {
    const context = useContext(RaidBossesContext);
    if (!context) {
        throw new Error("useRaidBosses must be used within a RaidBossesProvider");
    }
    return context;
};

export const RaidBossesProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, fetchCompleted, errors]: [Dictionary<IRaidBoss[]>, boolean, string] = useFetchAllData();

    return (
        <RaidBossesContext.Provider value={{
            bossesPerTier: raidBosses,
            bossesFetchCompleted: fetchCompleted,
            bossesErrors: errors
        }}
        >
            {props.children}
        </RaidBossesContext.Provider>
    );
}