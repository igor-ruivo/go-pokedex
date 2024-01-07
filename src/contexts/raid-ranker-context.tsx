import { createContext, useContext, useEffect, useState } from 'react';
import Dictionary, { cloneDictionary } from '../utils/Dictionary';
import { usePokemon } from './pokemon-context';
import { computeDPSEntry, getAllChargedMoves } from '../utils/pokemon-helper';
import { useMoves } from './moves-context';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { readEntry, writeEntry } from '../utils/resource-cache';
import { cacheTtlInMillis } from '../utils/Configs';

type DPSEntry = {
    dps: number,
    fastMove: string,
    fastMoveDmg: number,
    chargedMove: string,
    chargedMoveDmg: number
}

interface RaidRankerContextType {
    raidDPS: Dictionary<Dictionary<DPSEntry>>;
    computeRaidRankerforTypes: (ensureTypeComputations?: PokemonTypes[]) => void;
    raidRankerFetchCompleted: (ensureTypeComputations?: PokemonTypes[]) => boolean;
}

const RaidRankerContext = createContext<RaidRankerContextType | undefined>(undefined);

const useRaidDPSComputations: () => [Dictionary<Dictionary<DPSEntry>>, (ensureTypeComputations?: PokemonTypes[]) => void, (ensureTypeComputations?: PokemonTypes[]) => boolean] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {moves, movesFetchCompleted} = useMoves();
    const [raidDPS, setRaidDPS] = useState<Dictionary<Dictionary<DPSEntry>>>({});
    const [computationFinished, setComputationFinished] = useState<Dictionary<boolean>>({});

    const raidRankerFetchCompleted = (ensureTypeComputations?: PokemonTypes[]) => {
        if (!ensureTypeComputations) {
            return computationFinished[""];
        }

        return Object.keys(ensureTypeComputations)
            .filter(t => !t || isNaN(Number(t)))
            .map(t => !t ? t : t.toLocaleLowerCase())
            .every(t => computationFinished[t]);
    }

    const computeRaidRankerforTypes = (ensureTypeComputations?: PokemonTypes[]) => {
        (ensureTypeComputations ? Object.keys(ensureTypeComputations)
            .filter(t => !t || isNaN(Number(t)))
            .map(t => !t ? t : t.toLocaleLowerCase()) : [""])
            .forEach(t => {
                const raidDpsKey = `raid-dps${t}`;
                const cachedData = readEntry<Dictionary<DPSEntry>>(raidDpsKey);
                if (cachedData) {
                    setRaidDPS(p => {
                        const result = cloneDictionary(p);
                        result[t] = cachedData;
                        return result;
                    });

                    setComputationFinished(p => {
                        const result = cloneDictionary(p);
                        result[t] = true;
                        return result;
                    });
                    return;
                }

                const startTime = performance.now();

                const pokemonEntries = Object.values(gamemasterPokemon)
                    .filter(p => !p.aliasId && (!t || getAllChargedMoves(p, moves, gamemasterPokemon).some(m => moves[m].type === t)))
                    .map(p => {
                        const entry = computeDPSEntry(p, gamemasterPokemon, moves, 15, 100, t);
                        return {
                            speciesId: p.speciesId,
                            dps: entry.dps,
                            fastMove: entry.fastMoveId,
                            fastMoveDmg: entry.fastMoveDamage,
                            chargedMove: entry.chargedMoveId,
                            chargedMoveDmg: entry.chargedMoveDamage
                        };
                    });
            
                pokemonEntries.sort((a, b) => b.dps - a.dps);

                const endTime = performance.now();
                console.log(`${!t ? "Overall" : t} computation took ${endTime - startTime} milliseconds.`);

                setRaidDPS(p => {
                    const result = cloneDictionary(p);
                    const parsedEntries: Dictionary<DPSEntry> = {};
                    pokemonEntries.forEach(p => {
                        parsedEntries[p.speciesId] = {
                            dps: p.dps,
                            fastMove: p.fastMove,
                            fastMoveDmg: p.fastMoveDmg,
                            chargedMove: p.chargedMove,
                            chargedMoveDmg: p.chargedMoveDmg
                        };
                    });

                    writeEntry(raidDpsKey, parsedEntries, cacheTtlInMillis);
                    result[t] = parsedEntries;
                    return result;
                });

                setComputationFinished(p => {
                    const result = cloneDictionary(p);
                    result[t] = true;
                    return result;
                });
            });
    }

    useEffect(() => {
        setComputationFinished({});
        if (!fetchCompleted || !movesFetchCompleted) {
            return;
        }
        
        computeRaidRankerforTypes();

    }, [fetchCompleted, movesFetchCompleted]);

    return [raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted];
}

export const useRaidRanker = (): RaidRankerContextType => {
    const context = useContext(RaidRankerContext);
    if (!context) {
        throw new Error("useRaidRanker must be used within a RaidRankerProvider");
    }
    return context;
};

export const RaidRankerProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted]: [Dictionary<Dictionary<DPSEntry>>, (ensureTypeComputations?: PokemonTypes[]) => void, (ensureTypeComputations?: PokemonTypes[]) => boolean] = useRaidDPSComputations();

    return (
        <RaidRankerContext.Provider value={{
            raidDPS: raidDPS,
            computeRaidRankerforTypes: computeRaidRankerforTypes,
            raidRankerFetchCompleted: raidRankerFetchCompleted
        }}>
            {props.children}
        </RaidRankerContext.Provider>
    );
}