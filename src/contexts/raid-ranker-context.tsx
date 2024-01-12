import { createContext, useCallback, useContext, useState } from 'react';
import Dictionary, { cloneDictionary } from '../utils/Dictionary';
import { computeDPSEntry, getAllChargedMoves } from '../utils/pokemon-helper';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { readEntry, writeEntry } from '../utils/resource-cache';
import { cacheTtlInMillis } from '../utils/Configs';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IGameMasterMove } from '../DTOs/IGameMasterMove';

type DPSEntry = {
    dps: number,
    fastMove: string,
    fastMoveDmg: number,
    chargedMove: string,
    chargedMoveDmg: number
}

interface RaidRankerContextType {
    raidDPS: Dictionary<Dictionary<DPSEntry>>;
    computeRaidRankerforTypes: (gamemasterPokemon: Dictionary<IGamemasterPokemon>, moves: Dictionary<IGameMasterMove>, ensureTypeComputations?: PokemonTypes[]) => void;
    raidRankerFetchCompleted: (ensureTypeComputations?: PokemonTypes[]) => boolean;
}

const RaidRankerContext = createContext<RaidRankerContextType | undefined>(undefined);

const useRaidDPSComputations: () => [Dictionary<Dictionary<DPSEntry>>, (gamemasterPokemon: Dictionary<IGamemasterPokemon>, moves: Dictionary<IGameMasterMove>, ensureTypeComputations?: PokemonTypes[]) => void, (ensureTypeComputations?: PokemonTypes[]) => boolean] = () => {
    const [raidDPS, setRaidDPS] = useState<Dictionary<Dictionary<DPSEntry>>>({});
    const [computationFinished, setComputationFinished] = useState<Dictionary<boolean>>({});

    const raidRankerFetchCompleted = useCallback((ensureTypeComputations?: PokemonTypes[]) => {
        if (!ensureTypeComputations) {
            return computationFinished[""];
        }

        return ensureTypeComputations
            .every(t => computationFinished[t.toString().toLocaleLowerCase()]);
    }, [computationFinished]);

    const computeRaidRankerforTypes = useCallback((gamemasterPokemon: Dictionary<IGamemasterPokemon>, moves: Dictionary<IGameMasterMove>, ensureTypeComputations?: PokemonTypes[]) => {
        (ensureTypeComputations ? ensureTypeComputations
            .map(t => t.toString().toLocaleLowerCase()) : [""])
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
    }, [setRaidDPS, setComputationFinished]);
    
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
    const [raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted]: [Dictionary<Dictionary<DPSEntry>>, (gamemasterPokemon: Dictionary<IGamemasterPokemon>, moves: Dictionary<IGameMasterMove>, ensureTypeComputations?: PokemonTypes[]) => void, (ensureTypeComputations?: PokemonTypes[]) => boolean] = useRaidDPSComputations();

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