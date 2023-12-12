import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import { usePvp } from "../contexts/pvp-context";
import { fetchReachablePokemonIncludingSelf } from "../utils/pokemon-helper";
import "./DeleteTrash.scss"

const DeleteTrash = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();

    const isBadRank = (rank: number, rankLimit: number) => {
        return rank === Infinity || rank > rankLimit;
    }

    const isBadPokemon = (p: IGamemasterPokemon) => {
        const glLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        return (isBadRank(glLowestRank, 100) && isBadRank(ulLowestRank, 100) && isBadRank(mlLowestRank, 200));
    }

    const getBadDexes = () => {
        const badDexes = new Set<number>();
        Object.values(gamemasterPokemon).forEach(p => {
            if (p.aliasId) {
                return;
            }

            if (isBadPokemon(p) && Object.values(gamemasterPokemon).filter(pk => pk.dex === p.dex && pk.speciesId !== p.speciesId).every(pk => isBadPokemon(pk))) {
                badDexes.add(p.dex);
            }
        });
        return badDexes;
    }

    return (
        pvpFetchCompleted && fetchCompleted ? <textarea
            className="search-strings-container big-height"
            readOnly
            onClick={(e: any) => {e.target.select();
                document.execCommand("copy");
                alert("Copied to clipboard.");}}
            value={Array.from(getBadDexes()).join(",") + "&!4*" + "&!lendário" + "&!mítico" + "&!pc2000-" + "&!favorito"/* + "&!#"*/}
        /> : <span>Fetching Pokémon...</span>
    );
}

export default DeleteTrash;