import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import { usePvp } from "../contexts/pvp-context";
import { computeBestIVs, fetchReachablePokemonIncludingSelf } from "../utils/pokemon-helper";
import "./DeleteTrash.scss"

const DeleteTrash = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();

    const isBadRank = (rank: number, rankLimit: number) => {
        return rank === Infinity || rank > rankLimit;
    }

    const needsLessThanFiveAttack = (p: IGamemasterPokemon, leagueIndex: number) => {
        const bestIVs = Object.values(computeBestIVs(p.atk, p.def, p.hp, leagueIndex === 0 ? 1500 : leagueIndex === 1 ? 2500 : Number.MAX_VALUE, 51)).flat();
        for (let i = 0; i < 20; i++) {
            const neededAtk = bestIVs[i].IVs.A;
            if (neededAtk >= 5) {
                return false;
            }
        }
        return true;
    }

    const isBadWithAttack = (p: IGamemasterPokemon) => {
        console.log("analizing " + p.speciesId)
        // here, the pokémon is good for something...
        // find those good for gl and ul that need <5 atk in the first 20 spots, except if rank for great or ultra is <= 20
        const glLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        
        const glRankedP = Object.values(rankLists[0]).find(k => k.rank === glLowestRank);
        const ulRankedP = Object.values(rankLists[1]).find(k => k.rank === ulLowestRank);

        const glPokemon = glRankedP ? gamemasterPokemon[glRankedP.speciesId] : undefined;
        const ulPokemon = ulRankedP ? gamemasterPokemon[ulRankedP.speciesId] : undefined;

        if (!isBadRank(mlLowestRank, 200) || !isBadRank(glLowestRank, 20) || !isBadRank(ulLowestRank, 20)) {
            return false;
        }

        if (!isBadRank(glLowestRank, 100) && glPokemon && !needsLessThanFiveAttack(glPokemon, 0)) {
            return false;
        }

        if (!isBadRank(ulLowestRank, 100) && ulPokemon && !needsLessThanFiveAttack(ulPokemon, 1)) {
            return false;
        }

        if (!isBadRank(glLowestRank, 100) && glPokemon && needsLessThanFiveAttack(glPokemon, 0)) {
            console.log(p.speciesId + " is ok for gl but needs less than 5 atk")
            return true;
        }

        if (!isBadRank(ulLowestRank, 100) && ulPokemon && needsLessThanFiveAttack(ulPokemon, 1)) {
            console.log(p.speciesId + " is ok for ul but needs less than 5 atk")
            return true;
        }

        return false;
    }

    const isAlwaysBadPokemon = (p: IGamemasterPokemon) => {
        const glLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        
        return isBadRank(glLowestRank, 100) && isBadRank(ulLowestRank, 100) && isBadRank(mlLowestRank, 200);
    }

    const getBadDexes = () => {
        const badDexes = new Set<number>();
        Object.values(gamemasterPokemon).forEach(p => {
            if (p.aliasId) {
                return;
            }

            if (isAlwaysBadPokemon(p)) {
                if (Object.values(gamemasterPokemon).filter(pk => pk.dex === p.dex && !pk.isMega && pk.speciesId !== p.speciesId).every(pk => isAlwaysBadPokemon(pk))) {
                    badDexes.add(p.dex);
                }
            }
        });
        return badDexes;
    }

    const getBadDexesWithAttack = () => {
        const badDexesWithAttack = new Set<number>();
        Object.values(gamemasterPokemon).forEach(p => {
            if (p.aliasId) {
                return;
            }

            if (!isAlwaysBadPokemon(p)) {
                if (isBadWithAttack(p) && Object.values(gamemasterPokemon).filter(pk => pk.dex === p.dex && !pk.isMega && pk.speciesId !== p.speciesId).every(pk => isBadWithAttack(pk))) {
                    badDexesWithAttack.add(p.dex);
                }
            }
        });
        return badDexesWithAttack;
    }

    return (
        pvpFetchCompleted && fetchCompleted ? <textarea
            className="search-strings-container big-height"
            readOnly
            onClick={(e: any) => {e.target.select();
                document.execCommand("copy");
                alert("Copied to clipboard.");}}
            value={Array.from(new Set([...getBadDexes(), ...getBadDexesWithAttack()])).join(",") + "&!4*" + "&!lendário" + "&!mítico" + "&!pc2000-" + "&!favorito" + Array.from(getBadDexesWithAttack()).map(d => `&!${d},2-4ataque`).join("")}
        /> : <span>Fetching Pokémon...</span>
    );
}

export default DeleteTrash;