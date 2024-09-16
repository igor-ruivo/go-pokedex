import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import { /*useEffect, useMemo,*/ useMemo, useRef } from "react";
import useResize from "../hooks/useResize";
/*import PokemonNumber from "./PokemonNumber";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { ListType } from "../views/pokedex";
import { calculateCP, fetchReachablePokemonIncludingSelf, getAllChargedMoves, needsXLCandy } from "../utils/pokemon-helper";
import { useLanguage } from "../contexts/language-context";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { customCupCPLimit, usePvp } from "../contexts/pvp-context";
import useCountdown from "../hooks/useCountdown";
import { usePokemon } from "../contexts/pokemon-context";
import { useRaidRanker } from "../contexts/raid-ranker-context";
import { useMoves } from "../contexts/moves-context";*/

interface IPokemonMiniatureProps {
    pokemon: IGamemasterPokemon,
    cpStringOverride?: string,
    withCountdown?: number,
    linkToShadowVersion?: boolean,
    forceShadowAdorner?: boolean
}

const PokemonMiniature = ({pokemon, cpStringOverride, withCountdown, linkToShadowVersion, forceShadowAdorner}: IPokemonMiniatureProps) => {
    /*const {days, hours, minutes, seconds} = useCountdown(withCountdown ?? 0);
    const {currentGameLanguage} = useLanguage();*/
    const containerWidth = useRef<HTMLDivElement>(null);
    useResize();
    //const {rankLists, pvpFetchCompleted} = usePvp();
    //const {gamemasterPokemon, fetchCompleted} = usePokemon();
    //const {moves, movesFetchCompleted} = useMoves();
    //const {raidRankerFetchCompleted, raidDPS, computeRaidRankerforTypes} = useRaidRanker();

    /*const allRelevantChargedMoveTypes = useMemo(() => {
        if (!fetchCompleted || !movesFetchCompleted) {
            return [];
        }

        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon));
        const exceptionPokemon = ["slowpoke_galarian", "slowbro_galarian"];

        const mega = exceptionPokemon.includes(pokemon.speciesId) ? [] : Object.values(gamemasterPokemon)
            .filter(pk => !pk.aliasId && pk.isMega && reachablePokemon.some(r => r.dex === pk.dex));

        const finalCollection = [...reachablePokemon, ...mega];

        return Array.from(new Set(finalCollection.flatMap(f => getAllChargedMoves(f, moves, gamemasterPokemon).map(m => moves[m].type))))
            .filter(t => t !== "normal")
            .map(t => (t.substring(0, 1).toLocaleUpperCase() + t.substring(1).toLocaleLowerCase()) as unknown as PokemonTypes);
    }, [fetchCompleted, movesFetchCompleted, moves, gamemasterPokemon, pokemon]);

    useEffect(() => {
        setTimeout(() => {
            if (!fetchCompleted || !movesFetchCompleted || allRelevantChargedMoveTypes.length === 0 || raidRankerFetchCompleted(allRelevantChargedMoveTypes)) {
                return;
            }
    
            computeRaidRankerforTypes(gamemasterPokemon, moves, allRelevantChargedMoveTypes);
        }, 0);
    }, [fetchCompleted, movesFetchCompleted, gamemasterPokemon, moves, computeRaidRankerforTypes, raidRankerFetchCompleted, allRelevantChargedMoveTypes]);*/

    const link = useMemo(() => `/pokemon/${pokemon.speciesId + (linkToShadowVersion ? "_shadow" : "")}/info`, [linkToShadowVersion, pokemon]);

    /*const isGoodForRaids = () => {
        if (allRelevantChargedMoveTypes.length === 0) {
            return false;
        }

        if (!fetchCompleted || !raidRankerFetchCompleted(allRelevantChargedMoveTypes)) {
            return false;
        }

        const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon));
        const exceptionPokemon = ["slowpoke_galarian", "slowbro_galarian"];

        const mega = exceptionPokemon.includes(pokemon.speciesId) ? [] : Object.values(gamemasterPokemon)
            .filter(pk => !pk.aliasId && pk.isMega && reachablePokemon.some(r => r.dex === pk.dex));

        let minRaidRank = Infinity;
        const finalCollection = [...reachablePokemon, ...mega];
        allRelevantChargedMoveTypes.forEach(t => {
            finalCollection.forEach(pk => {
                const rank = Object.keys(raidDPS[t.toString().toLocaleLowerCase()]).indexOf(pk.speciesId);
                if (rank !== -1) {
                    minRaidRank = Math.min(minRaidRank, rank + 1);
                }
            });
        });

        return minRaidRank <= 10;
    };

    const getCPContainerString = () => {
        if (withCountdown) {
            if (!days && !hours && !minutes && !seconds) {
                return "Expired";
            }

            return days > 0 ? `${days} day${days > 1 ? "s" : ""} left` : `${hours}h:${minutes}m:${seconds}s`;
        }

        if (cpStringOverride !== undefined) {
            return cpStringOverride;
        }

        return `${calculateCP(pokemon.atk, 15, pokemon.def, 15, pokemon.hp, 15, 100)} ${gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}`;
    }

    const isGoodForLeague = (leagueIdx: number) => {
        const reachable = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
        return Array.from(reachable).some(r => rankLists[leagueIdx][r.speciesId]?.rank <= 100);
    }*/

    return (
        <Link to={link}>
            <div ref={containerWidth} className="pokemon-miniature">
                {/*<div className="miniature-tooltip">
                    {pvpFetchCompleted && fetchCompleted && isGoodForLeague(0) && <img alt="Great League" src={`${process.env.PUBLIC_URL}/images/leagues/great-big.webp`}/>}
                    {pvpFetchCompleted && fetchCompleted && isGoodForLeague(1) && <img alt="Ultra League" src={`${process.env.PUBLIC_URL}/images/leagues/ultra-big.webp`}/>}
                    {pvpFetchCompleted && fetchCompleted && isGoodForLeague(2) && <img alt="Master League" src={`${process.env.PUBLIC_URL}/images/leagues/master-big.webp`}/>}
                    {isGoodForRaids() && <img className="padded-img raid-img-with-contrast" alt="Raids" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`}/>}
                </div>*/}
                <span className="mini-card-content">
                    <PokemonImage pokemon={pokemon} withName lazy specificNameContainerWidth={containerWidth.current?.clientWidth} forceShadowAdorner={forceShadowAdorner} />
                </span>
            </div>
        </Link>
    );
}

export default PokemonMiniature;