import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import Dictionary from '../utils/Dictionary';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { dpsUrl } from '../utils/Configs';

export type DPSEntry = {
    dps: number,
    fastMove: string,
    fastMoveDmg: number,
    chargedMove: string,
    chargedMoveDmg: number,
    speciesId: string,
    rank: number
}

interface RaidRankerContextType {
    raidDPS: Dictionary<Dictionary<DPSEntry>>;
    raidDPSFetchCompleted: boolean;
    raidDPSErrors: string
}

const RaidRankerContext = createContext<RaidRankerContextType | undefined>(undefined);

const useFetchAllData: () => [Dictionary<DPSEntry>[], boolean, string] = () => {
    const [moves, fetchMoves, fetchMovesCompleted, errorLoadingMovesData]: FetchData<Dictionary<DPSEntry>> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchMoves([...Object.values(PokemonTypes).filter(v => typeof v === "string").map(type => { return typeof type === 'string' ? dpsUrl(type.toLocaleLowerCase()) : 'default'}), dpsUrl('default')], 0, {signal: controller.signal});
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchMoves]);

    return [moves, fetchMovesCompleted, errorLoadingMovesData];
}

export const useRaidRanker = (): RaidRankerContextType => {
    const context = useContext(RaidRankerContext);
    if (!context) {
        throw new Error("useRaidRanker must be used within a RaidRankerProvider");
    }
    return context;
};

export const RaidRankerProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidDPSArray, raidDPSFetchCompleted, raidDPSErrors]: [Array<Dictionary<DPSEntry>>, boolean, string] = useFetchAllData();

    const raidDPS: Dictionary<Dictionary<DPSEntry>> = {};
    [...Object.values(PokemonTypes).filter(v => typeof v === "string"), ''].map(type => { return typeof type === 'string' ? type.toLocaleLowerCase() : 'default'}).forEach((type, index) => {
        raidDPS[type] = raidDPSArray[index];
    });

    return (
        <RaidRankerContext.Provider value={{
            raidDPS,
            raidDPSFetchCompleted,
            raidDPSErrors }}
        >
            {props.children}
        </RaidRankerContext.Provider>
    );
}