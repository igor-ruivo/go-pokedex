import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import "./PokemonInfoBanner.scss";
import LeaguePanels from "./LeaguePanels";
import React, { useCallback, useMemo } from "react";
import AppraisalBar from "./AppraisalBar";
import { ordinal } from "../utils/conversions";
import { Effectiveness, calculateDamage, fetchReachablePokemonIncludingSelf, pveDPS } from "../utils/pokemon-helper";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import LeagueRanks from "./LeagueRanks";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";

interface IPokemonInfoBanner {
    pokemon: IGamemasterPokemon;
    ivPercents: Dictionary<IIvPercents>;
    attack: number;
    setAttack: (_: React.SetStateAction<number>) => void;
    defense: number;
    setDefense: (_: React.SetStateAction<number>) => void;
    hp: number;
    setHP: (_: React.SetStateAction<number>) => void;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
    level: number;
}

export interface IIvPercents {
    greatLeagueRank: number,
    greatLeagueLvl: number,
    greatLeagueCP: number,
    greatLeagueAttack: number,
    greatLeagueDefense: number,
    greatLeagueHP: number,
    greatLeaguePerfect: any,
    greatLeaguePerfectLevel: number,
    greatLeaguePerfectCP: number,
    ultraLeagueRank: number,
    ultraLeagueLvl: number,
    ultraLeagueCP: number,
    ultraLeagueAttack: number,
    ultraLeagueDefense: number,
    ultraLeagueHP: number,
    ultraLeaguePerfect: any,
    ultraLeaguePerfectLevel: number,
    ultraLeaguePerfectCP: number,
    masterLeagueRank: number,
    masterLeagueLvl: number,
    masterLeagueCP: number,
    masterLeagueAttack: number,
    masterLeagueDefense: number,
    masterLeagueHP: number,
    masterLeaguePerfect: any,
    masterLeaguePerfectLevel: number,
    masterLeaguePerfectCP: number,
    customLeagueRank: number,
    customLeagueLvl: number,
    customLeagueCP: number,
    customLeagueAttack: number,
    customLeagueDefense: number,
    customLeagueHP: number,
    customLeaguePerfect: any,
    customLeaguePerfectLevel: number,
    customLeaguePerfectCP: number
}

type dpsEntry = {
    fastMoveId: string;
    chargedMoveId: string;
    dps: number;
    speciesId: string;
}

const PokemonInfoBanner = ({pokemon, ivPercents, attack, setAttack, defense, setDefense, hp, setHP, league, handleSetLeague, level}: IPokemonInfoBanner) => {
    const {currentLanguage} = useLanguage();
    const {gameTranslationFetchCompleted} = useGameTranslation();

    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists} = usePvp();
    const {moves} = useMoves();

    const rankOnlyFilteredTypePokemon = true; //TODO: connect to settings

    const getAllFastMoves = useCallback((p: IGamemasterPokemon) => {
        return Array.from(new Set(p.fastMoves.concat(p.eliteMoves.filter(m => moves[m].isFast))));
    }, [moves]);

    const getAllChargedMoves = useCallback((p: IGamemasterPokemon) => {
        return Array.from(new Set(p.chargedMoves.concat(p.eliteMoves.filter(m => !moves[m].isFast))));
    }, [moves]);

    const computeDPSEntry = useCallback((p: IGamemasterPokemon, attackIV = 15, level = 100, forcedType = "") => {
        const fastMoves = getAllFastMoves(p);
        const chargedMoves = getAllChargedMoves(p);
        let higherDPS = 0;
        let higherFast = "";
        let higherCharged = "";
        for(let i = 0; i < fastMoves.length; i++) {
            for(let j = 0; j < chargedMoves.length; j++) {
                const fastMove = moves[fastMoves[i]];
                const chargedMove = moves[chargedMoves[j]];
                if (forcedType && chargedMove.type !== forcedType) {
                    continue;
                }
                const fastMoveDmg = calculateDamage(p.atk, fastMove.pvePower, p.types.map(t => t.toString().toLocaleLowerCase()).includes(fastMove.type.toLocaleLowerCase()), p.isShadow, (forcedType && fastMove.type !== forcedType) ? Effectiveness.Normal : Effectiveness.Effective, attackIV, level);
                const chargedMoveDmg = calculateDamage(p.atk, chargedMove.pvePower, p.types.map(t => t.toString().toLocaleLowerCase()).includes(chargedMove.type.toLocaleLowerCase()), p.isShadow, Effectiveness.Effective, attackIV, level);
                const dps = pveDPS(chargedMoveDmg, fastMoveDmg, fastMove.pveDuration, chargedMove.pveEnergyDelta * -1, fastMove.pveEnergyDelta, chargedMove.pveDuration);
                if (dps > higherDPS) {
                    higherDPS = dps;
                    higherFast = fastMove.moveId;
                    higherCharged = chargedMove.moveId;
                }
            }
        }
        return {
            fastMoveId: higherFast,
            chargedMoveId: higherCharged,
            dps: higherDPS,
            speciesId: p.speciesId
        };
    }, [getAllFastMoves, getAllChargedMoves, moves]);

    const typeFilter = useCallback((p: IGamemasterPokemon, forcedType: string) => {
        if (!forcedType) {
            return true;
        }

        if (rankOnlyFilteredTypePokemon) {
            if (!p.types.map(t => t.toString().toLocaleLowerCase()).includes(forcedType.toLocaleLowerCase())) {
                return false;
            }
        }

        return getAllChargedMoves(p).some(m => moves[m].type === forcedType);
    }, [rankOnlyFilteredTypePokemon, getAllChargedMoves, moves]);

    const resourcesNotReady = !fetchCompleted || !pokemon || !gameTranslationFetchCompleted || !gamemasterPokemon || !moves || Object.keys(moves).length === 0 || rankLists.length === 0 || Object.keys(ivPercents).length === 0;

    const computeComparisons = useCallback((forcedType = "") => {
        if (resourcesNotReady) {
            return [];
        }

        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && typeFilter(p, forcedType))
            .forEach(p => comparisons.push(computeDPSEntry(p, 15, 100, forcedType)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }, [gamemasterPokemon, typeFilter, computeDPSEntry, resourcesNotReady]);

    const getBestReachableVersion = useCallback((comparisons: dpsEntry[]) => {
        const reachableExcludingMega = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
        const mega = pokemon.isMega ? [] : Object.values(gamemasterPokemon).filter(p => !p.aliasId && Array.from(reachableExcludingMega).map(pk => pk.dex).includes(p.dex) && p.isMega);

        const allPokemon = [...reachableExcludingMega, ...mega];

        const sortedPokemon = allPokemon.sort((a, b) => {
            const dpsA = comparisons.find(c => c.speciesId === a.speciesId)?.dps ?? 0;
            const dpsB = comparisons.find(c => c.speciesId === b.speciesId)?.dps ?? 0;
            return dpsB - dpsA;
        });

        return sortedPokemon[0].speciesId;
    }, [gamemasterPokemon, pokemon]);

    const globalComparisons = useMemo(() => computeComparisons(), [computeComparisons]);
    const bestReachable = useMemo(() => !resourcesNotReady ? gamemasterPokemon[getBestReachableVersion(globalComparisons)] : undefined, [gamemasterPokemon, globalComparisons, getBestReachableVersion, resourcesNotReady]);

    const rank1Comparisons = useMemo(() => resourcesNotReady ? [] : computeComparisons(bestReachable!.types[0].toString().toLocaleLowerCase()), [computeComparisons, bestReachable, resourcesNotReady]);
    const rank2Comparisons = useMemo(() => !resourcesNotReady && bestReachable!.types.length > 1 ? computeComparisons(bestReachable!.types[1].toString().toLocaleLowerCase()) : [], [bestReachable, computeComparisons, resourcesNotReady]);

    const rank = useMemo(() => resourcesNotReady ? 0 : globalComparisons.findIndex(c => c.speciesId === bestReachable!.speciesId) + 1, [globalComparisons, bestReachable, resourcesNotReady]);
    const type1Rank = useMemo(() => resourcesNotReady ? 0 : rank1Comparisons.findIndex(c => c.speciesId === bestReachable!.speciesId) + 1, [rank1Comparisons, bestReachable, resourcesNotReady]);
    const type2Rank = useMemo(() => resourcesNotReady ? 0 : bestReachable!.types.length > 1 ? rank2Comparisons.findIndex(c => c.speciesId === bestReachable!.speciesId) + 1 : 0, [bestReachable, rank2Comparisons, resourcesNotReady]);
    
    const ranks = [rank, type1Rank, type2Rank];

    const selfRealDPS = useMemo(() => resourcesNotReady ? {fastMoveId: "", chargedMoveId: "", speciesId: "", dps: 0} : computeDPSEntry(bestReachable as IGamemasterPokemon, attack, (level - 1) * 2), [bestReachable, attack, level, computeDPSEntry]);

    if (resourcesNotReady) {
        return <></>;
    }

    let bestInFamilyForGreatLeague = pokemon;
    let bestInFamilyForGreatLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForUltraLeague = pokemon;
    let bestInFamilyForUltraLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForMasterLeague = pokemon;
    let bestInFamilyForMasterLeagueRank = Number.MAX_VALUE;
    let bestInFamilyForCustomLeague = pokemon;
    let bestInFamilyForCustomLeagueRank = Number.MAX_VALUE;

    const reachablePokemons = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);

    reachablePokemons.forEach(member => {
        const rankInGreat = rankLists[0][member.speciesId]?.rank;
        const rankInUltra = rankLists[1][member.speciesId]?.rank;
        const rankInMaster = rankLists[2][member.speciesId]?.rank;
        const rankInCustom = rankLists[3][member.speciesId]?.rank;
        if (!isNaN(rankInGreat) && rankInGreat < bestInFamilyForGreatLeagueRank) {
            bestInFamilyForGreatLeagueRank = rankInGreat;
            bestInFamilyForGreatLeague = member;
        }
        if (!isNaN(rankInUltra) && rankInUltra < bestInFamilyForUltraLeagueRank) {
            bestInFamilyForUltraLeagueRank = rankInUltra;
            bestInFamilyForUltraLeague = member;
        }
        if (!isNaN(rankInMaster) && rankInMaster < bestInFamilyForMasterLeagueRank) {
            bestInFamilyForMasterLeagueRank = rankInMaster;
            bestInFamilyForMasterLeague = member;
        }
        if (!isNaN(rankInCustom) && rankInCustom < bestInFamilyForCustomLeagueRank) {
            bestInFamilyForCustomLeagueRank = rankInCustom;
            bestInFamilyForCustomLeague = member;
        }
    });

    const bestReachableGreatLeagueIvs = ivPercents[bestInFamilyForGreatLeague.speciesId];
    const bestReachableUltraLeagueIvs = ivPercents[bestInFamilyForUltraLeague.speciesId];
    const bestReachableMasterLeagueIvs = ivPercents[bestInFamilyForMasterLeague.speciesId];
    const bestReachableCustomLeagueIvs = ivPercents[bestInFamilyForCustomLeague.speciesId];

    const getRankPercentage = (rank: number) => Math.round(((1 - (rank / 4095)) * 100 + Number.EPSILON) * 100) / 100;

    return <div className="banner_layout">
        <div className="pokemon_with_ivs">
            <div className="item aligned">
                <LeagueRanks
                    greatLeagueStats={
                        {
                            leagueTitle: "great",
                            bestReachablePokemon: bestInFamilyForGreatLeague,
                            pokemonRankInLeague: ordinal(rankLists[0][bestInFamilyForGreatLeague.speciesId]?.rank)
                        }
                    }
                    ultraLeagueStats={
                        {
                            leagueTitle: "ultra",
                            bestReachablePokemon: bestInFamilyForUltraLeague,
                            pokemonRankInLeague: ordinal(rankLists[1][bestInFamilyForUltraLeague.speciesId]?.rank)
                        }
                    }
                    masterLeagueStats={
                        {
                            leagueTitle: "master",
                            bestReachablePokemon: bestInFamilyForMasterLeague,
                            pokemonRankInLeague: ordinal(rankLists[2][bestInFamilyForMasterLeague.speciesId]?.rank)
                        }
                    }
                    customLeagueStats={
                        {
                            leagueTitle: "custom",
                            bestReachablePokemon: bestInFamilyForCustomLeague,
                            pokemonRankInLeague: ordinal(rankLists[3][bestInFamilyForCustomLeague.speciesId]?.rank)
                        }
                    }
                    raidsStats={
                        {
                            leagueTitle: "raid",
                            bestReachablePokemon: bestReachable as IGamemasterPokemon,
                            pokemonRankInLeague: ordinal(rank)
                        }
                    }
                    league={league}
                    handleSetLeague={handleSetLeague}
                />
            </div>
                <AppraisalBar
                    attack = {attack}
                    setAttack={setAttack}
                    defense={defense}
                    setDefense={setDefense}
                    hp={hp}
                    setHP={setHP}
                />
                    <LeaguePanels
                        league={league}
                        atk={attack}
                        def={defense}
                        hp={hp}
                        greatLeagueStats={
                            {
                                leagueTitle: "great",
                                bestReachablePokemonName: bestInFamilyForGreatLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableGreatLeagueIvs.greatLeagueRank),
                                pokemonLeaguePercentile: bestReachableGreatLeagueIvs.greatLeagueRank + 1,
                                pokemonCP: bestReachableGreatLeagueIvs.greatLeagueCP,
                                pokemonLevel: bestReachableGreatLeagueIvs.greatLeagueLvl,
                                atk: bestReachableGreatLeagueIvs.greatLeaguePerfect.A,
                                def: bestReachableGreatLeagueIvs.greatLeaguePerfect.D,
                                hp: bestReachableGreatLeagueIvs.greatLeaguePerfect.S,
                                bestCP: bestReachableGreatLeagueIvs.greatLeaguePerfectCP,
                                bestLevel: bestReachableGreatLeagueIvs.greatLeaguePerfectLevel
                            }
                        }
                        ultraLeagueStats={
                            {
                                leagueTitle: "ultra",
                                bestReachablePokemonName: bestInFamilyForUltraLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableUltraLeagueIvs.ultraLeagueRank),
                                pokemonLeaguePercentile: bestReachableUltraLeagueIvs.ultraLeagueRank + 1,
                                pokemonCP: bestReachableUltraLeagueIvs.ultraLeagueCP,
                                pokemonLevel: bestReachableUltraLeagueIvs.ultraLeagueLvl,
                                atk: bestReachableUltraLeagueIvs.ultraLeaguePerfect.A,
                                def: bestReachableUltraLeagueIvs.ultraLeaguePerfect.D,
                                hp: bestReachableUltraLeagueIvs.ultraLeaguePerfect.S,
                                bestCP: bestReachableUltraLeagueIvs.ultraLeaguePerfectCP,
                                bestLevel: bestReachableUltraLeagueIvs.ultraLeaguePerfectLevel
                            }
                        }
                        masterLeagueStats={
                            {
                                leagueTitle: "master",
                                bestReachablePokemonName: bestInFamilyForMasterLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableMasterLeagueIvs.masterLeagueRank),
                                pokemonLeaguePercentile: bestReachableMasterLeagueIvs.masterLeagueRank + 1,
                                pokemonCP: bestReachableMasterLeagueIvs.masterLeagueCP,
                                pokemonLevel: bestReachableMasterLeagueIvs.masterLeagueLvl,
                                atk: bestReachableMasterLeagueIvs.masterLeaguePerfect.A,
                                def: bestReachableMasterLeagueIvs.masterLeaguePerfect.D,
                                hp: bestReachableMasterLeagueIvs.masterLeaguePerfect.S,
                                bestCP: bestReachableMasterLeagueIvs.masterLeaguePerfectCP,
                                bestLevel: bestReachableMasterLeagueIvs.masterLeaguePerfectLevel
                            }
                        }
                        customLeagueStats={
                            {
                                leagueTitle: "custom",
                                bestReachablePokemonName: bestInFamilyForCustomLeague.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                pokemonLeaguePercentage: getRankPercentage(bestReachableCustomLeagueIvs.customLeagueRank),
                                pokemonLeaguePercentile: bestReachableCustomLeagueIvs.customLeagueRank + 1,
                                pokemonCP: bestReachableCustomLeagueIvs.customLeagueCP,
                                pokemonLevel: bestReachableCustomLeagueIvs.customLeagueLvl,
                                atk: bestReachableCustomLeagueIvs.customLeaguePerfect.A,
                                def: bestReachableCustomLeagueIvs.customLeaguePerfect.D,
                                hp: bestReachableCustomLeagueIvs.customLeaguePerfect.S,
                                bestCP: bestReachableCustomLeagueIvs.customLeaguePerfectCP,
                                bestLevel: bestReachableCustomLeagueIvs.customLeaguePerfectLevel
                            }
                        }
                        raidStats={
                            {
                                bestReachablePokemonName: (bestReachable as IGamemasterPokemon).speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)),
                                rank: rank,
                                dps: selfRealDPS.dps,
                                typeRanks: [
                                    {
                                        type: pokemon.types[0],
                                        rank: ranks[1]
                                    },
                                    {
                                        type: pokemon.types[1],
                                        rank: ranks[2]
                                    }
                                ],
                            }
                        }
                    />
            </div>
    </div>;
}

export default PokemonInfoBanner;