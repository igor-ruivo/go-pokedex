import { useCallback, useMemo } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import { useMoves } from "../contexts/moves-context";
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ordinal } from "../utils/conversions";
import { Effectiveness, calculateDamage, fetchReachablePokemonIncludingSelf, pveDPS } from "../utils/pokemon-helper";
import RaidCard from "./RaidCard";
import "./RaidPanel.scss"
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { buildRankString } from "./LeagueRanks";
import { PokemonTypes } from "../DTOs/PokemonTypes";

interface IRaidPanelProps {
    pokemon: IGamemasterPokemon;
    level: number;
    atkIV: number;
}

type dpsEntry = {
    fastMoveId: string;
    chargedMoveId: string;
    dps: number;
    speciesId: string;
}

const RaidPanel = ({ pokemon, level, atkIV }: IRaidPanelProps) => {
    const {moves} = useMoves();
    const {gamemasterPokemon} = usePokemon();
    const {currentLanguage, currentGameLanguage} = useLanguage();

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

    const computeComparisons = useCallback((forcedType = "") => {
        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && typeFilter(p, forcedType))
            .forEach(p => comparisons.push(computeDPSEntry(p, 15, 100, forcedType)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }, [gamemasterPokemon, typeFilter, computeDPSEntry]);

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
    const bestReachable = useMemo(() => gamemasterPokemon[getBestReachableVersion(globalComparisons)], [gamemasterPokemon, globalComparisons, getBestReachableVersion]);

    const rank1Comparisons = useMemo(() => computeComparisons(bestReachable.types[0].toString().toLocaleLowerCase()), [computeComparisons, bestReachable]);
    const rank2Comparisons = useMemo(() => bestReachable.types.length > 1 ? computeComparisons(bestReachable.types[1].toString().toLocaleLowerCase()) : [], [bestReachable, computeComparisons]);

    const rank = useMemo(() => globalComparisons.findIndex(c => c.speciesId === bestReachable.speciesId) + 1, [globalComparisons, bestReachable]);
    const type1Rank = useMemo(() => rank1Comparisons.findIndex(c => c.speciesId === bestReachable.speciesId) + 1, [rank1Comparisons, bestReachable]);
    const type2Rank = useMemo(() => bestReachable.types.length > 1 ? rank2Comparisons.findIndex(c => c.speciesId === bestReachable.speciesId) + 1 : 0, [bestReachable, rank2Comparisons]);
    
    const ranks = [rank, type1Rank, type2Rank];

    const selfRealDPS = useMemo(() => computeDPSEntry(bestReachable, atkIV, (level - 1) * 2), [bestReachable, atkIV, level, computeDPSEntry]);

    return <div className="pvp-stats-column raid-background">
        <div>
            <div className="pvp-entry smooth with-border">
                <div className="pvp-entry-content potential">
                    <strong className="cp-container with-brightness">
                        {buildRankString(ordinal(rank), currentLanguage)}&nbsp;
                    </strong>
                    <strong>
                        {translator(TranslatorKeys.Ranked, currentLanguage)}
                    </strong>
                    <strong>
                        {translator(TranslatorKeys.In, currentLanguage)} {gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}
                    </strong>
                    <sub className="contained-big weighted-font">{`(${Math.round(selfRealDPS.dps * 100) / 100} DPS)`}</sub>
                </div>
            </div>
        </div>
        <div className={`contain`}>
            {bestReachable.types.filter(t => t).map((t, i) => (
                <RaidCard
                    key={t}
                    type={ranks[i + 1] === 0 ? "" : t.toString()}
                    typedType={t}
                    rank={ranks[i + 1]}
                />
            ))}
            {
                bestReachable.types.filter(t => t).length === 1 && <RaidCard
                    key="none"
                    type=""
                    typedType={PokemonTypes.Normal}
                    rank={0}
                />
            }
        </div>
        <div className="centered-text">... {translator(TranslatorKeys.As, currentLanguage)} {gamemasterPokemon[bestReachable.speciesId].speciesShortName}</div>
    </div>;
}

export default RaidPanel;