import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import { useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import useResize from "../hooks/useResize";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { usePvp } from "../contexts/pvp-context";
import { usePokemon } from "../contexts/pokemon-context";
import { useRaidRanker } from "../contexts/raid-ranker-context";
import { useMoves } from "../contexts/moves-context";
import useCountdown from "../hooks/useCountdown";
import { fetchReachablePokemonIncludingSelf, getAllChargedMoves } from "../utils/pokemon-helper";
import Dictionary from "../utils/Dictionary";
import { ConfigKeys, readPersistentValue } from "../utils/persistent-configs-handler";

interface IPokemonMiniatureProps {
    pokemon: IGamemasterPokemon,
    cpStringOverride?: string,
    withCountdown?: number,
    linkToShadowVersion?: boolean,
    forceShadowAdorner?: boolean
}

const PokemonMiniature = ({pokemon, cpStringOverride, withCountdown, linkToShadowVersion, forceShadowAdorner}: IPokemonMiniatureProps) => {
    const {days, hours, minutes, seconds} = useCountdown(withCountdown ?? 0);
    const containerWidth = useRef<HTMLDivElement>(null);
    useResize();

    const computeCountdownLabel = useCallback(() => {
        if (days > 0) {
            return `${days}d`;
        }
        
        if (hours > 0) {
            return `${hours}h`;
        }
        
        if (minutes > 0) {
            return `${minutes}m`;
        }

        return `${seconds}s`;
    }, [days, hours, minutes, seconds]);
    
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {moves, movesFetchCompleted} = useMoves();
    const {raidRankerFetchCompleted, raidDPS, computeRaidRankerforTypes} = useRaidRanker();

    const allRelevantChargedMoveTypes = useMemo(() => {
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
    }, [fetchCompleted, movesFetchCompleted, gamemasterPokemon, moves, computeRaidRankerforTypes, raidRankerFetchCompleted, allRelevantChargedMoveTypes]);

    const link = useMemo(() => `/pokemon/${pokemon.speciesId + (linkToShadowVersion ? "_shadow" : "")}/info`, [linkToShadowVersion, pokemon]);

    const raidRank = () => {
        if (allRelevantChargedMoveTypes.length === 0) {
            return Infinity;
        }

        if (!fetchCompleted || !raidRankerFetchCompleted(allRelevantChargedMoveTypes)) {
            return Infinity;
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

        return minRaidRank;
    };

    const rankForLeague = useCallback((leagueIdx: number) => {
        if (!pvpFetchCompleted || !fetchCompleted) {
            return Infinity;
        }
        const reachable = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
        return Math.min(...Array.from(reachable).map(r => rankLists[leagueIdx][r.speciesId]?.rank ?? Infinity));
    }, [pvpFetchCompleted, pokemon, gamemasterPokemon, rankLists, fetchCompleted]);

    const relevantLeagueElement = useCallback((mapper: Dictionary<ReactNode>) => {
        const minimum = String(Math.min(...Object.keys(mapper).map(t => +t)));
        if(!mapper[minimum]) {
            return <></>;
        }
        return mapper[minimum];
    }, []);
    
    const mapper = useMemo(() => {
        const dic: Dictionary<ReactNode> = {};
        const great = rankForLeague(0);
        const ultra = rankForLeague(1);
        const master = rankForLeague(2);

        if (great <= +(readPersistentValue(ConfigKeys.TrashGreat) ?? 50)) {
            dic[great] = <img alt="Great League" className="is-great" src={`${process.env.PUBLIC_URL}/images/leagues/great-big.webp`}/>
        }

        if (ultra <= +(readPersistentValue(ConfigKeys.TrashUltra) ?? 50)) {
            dic[ultra] = <img alt="Ultra League" className="is-ultra" src={`${process.env.PUBLIC_URL}/images/leagues/ultra-big.webp`}/>
        }

        if (master <= +(readPersistentValue(ConfigKeys.TrashMaster) ?? 110)) {
            dic[master] = <img alt="Master League" className="is-master" src={`${process.env.PUBLIC_URL}/images/leagues/master-big.webp`}/>
        }
        return dic;
    }, [rankForLeague]);

    return (
        <Link to={link}>
            <div ref={containerWidth} className="pokemon-miniature">
                {withCountdown && <div className="notifications-counter heavy-weight miniature-notification">
                    {computeCountdownLabel()}
                </div>}
                <div className={`miniature-tooltip`}>
                    {pvpFetchCompleted && fetchCompleted && (raidRank() <= +(readPersistentValue(ConfigKeys.TrashRaid) ?? 5) ? <img className="padded-img raid-img-with-contrast is-raid" alt="Raids" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`}/> : relevantLeagueElement(mapper))}
                </div>
                <span className="mini-card-content">
                    <PokemonImage pokemon={pokemon} withName lazy specificNameContainerWidth={containerWidth.current?.clientWidth} forceShadowAdorner={forceShadowAdorner} />
                </span>
            </div>
        </Link>
    );
}

export default PokemonMiniature;