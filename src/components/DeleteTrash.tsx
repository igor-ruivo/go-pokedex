import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import { usePvp } from "../contexts/pvp-context";
import Dictionary from "../utils/Dictionary";
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
        // here, the pokémon is good for something...
        // find those good for gl and ul that need <5 atk in the first 20 spots, except if rank for great or ultra is <= 20
        const glLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[0][p.speciesId]?.rank).filter(r => r));
        const ulLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[1][p.speciesId]?.rank).filter(r => r));
        const mlLowestRank = Math.min(...Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon)).map(p => rankLists[2][p.speciesId]?.rank).filter(r => r));
        
        const glRankedP = Object.values(rankLists[0]).find(k => k.rank === glLowestRank);
        const ulRankedP = Object.values(rankLists[1]).find(k => k.rank === ulLowestRank);

        const glPokemon = glRankedP ? gamemasterPokemon[glRankedP.speciesId] : undefined;
        const ulPokemon = ulRankedP ? gamemasterPokemon[ulRankedP.speciesId] : undefined;

        if (!isBadRank(mlLowestRank, 200) || !isBadRank(glLowestRank, 0) || !isBadRank(ulLowestRank, 0)) {
            return false;
        }

        if (!isBadRank(glLowestRank, 100) && glPokemon && !needsLessThanFiveAttack(glPokemon, 0)) {
            return false;
        }

        if (!isBadRank(ulLowestRank, 100) && ulPokemon && !needsLessThanFiveAttack(ulPokemon, 1)) {
            return false;
        }

        if (!isBadRank(glLowestRank, 100) && glPokemon && needsLessThanFiveAttack(glPokemon, 0)) {
            return true;
        }

        if (!isBadRank(ulLowestRank, 100) && ulPokemon && needsLessThanFiveAttack(ulPokemon, 1)) {
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

    if (!fetchCompleted || !pvpFetchCompleted) {
        return <span className="white-text">Fetching Pokémon...</span>;
    }

    type DisambiguatedEntry = {
        dex: number,
        shadow: boolean,
        alolan: boolean,
        galarian: boolean,
        hisuian: boolean,
        paldean: boolean
    }

    const dexesWithGoodForms = new Set<number>();
    const potentiallyDeletablePokemon = new Set<number>();
    const pokemonBadWithAttack: Dictionary<DisambiguatedEntry[]> = {};
    const needsDisambiguation = new Set<number>();
    const alwaysBadSet = new Set<number>();
    Object.values(gamemasterPokemon)
        .filter(p => !p.aliasId && !p.isMega)
        .forEach(p => {
            const pEntry: DisambiguatedEntry = {
                dex: p.dex,
                shadow: p.isShadow,
                alolan: p.speciesName.includes("(Alolan)"),
                galarian: p.speciesName.includes("(Galarian)"),
                hisuian: p.speciesName.includes("(Hisuian)"),
                paldean: p.speciesName.includes("(Paldean)")
            };

            if (isAlwaysBadPokemon(p)) {
                alwaysBadSet.add(p.dex);
                potentiallyDeletablePokemon.add(p.dex);
            } else {
                if (isBadWithAttack(p)) {
                    if (alwaysBadSet.has(p.dex)) {
                        needsDisambiguation.add(p.dex);
                    }
                    potentiallyDeletablePokemon.add(p.dex);
                    if (!pokemonBadWithAttack[p.dex]) {
                        pokemonBadWithAttack[p.dex] = [];
                    }
                    pokemonBadWithAttack[p.dex].push(pEntry);
                } else {
                    dexesWithGoodForms.add(p.dex);
                }
            }
        });

    const computeStr = () => {
        let str = "";

        // excluding Pokémon that are potentially deletable if they have at least one form that shouldn't be deleted,
        // because it would be very hard to create an exception in the search string for them.
        const alwaysDeletablePokemon = Array.from(potentiallyDeletablePokemon).filter(d => !dexesWithGoodForms.has(d));
        str += alwaysDeletablePokemon.join(",");

        const terms = new Set<string>();
        alwaysDeletablePokemon.forEach(d => {
            const specificPokemon = pokemonBadWithAttack[d];
            if (specificPokemon) {
                specificPokemon.forEach(b => {
                    let newStr = `&!${b.dex}`;
                    const pokemonNeedsDisambiguation = needsDisambiguation.has(d);
                    if (pokemonNeedsDisambiguation) {
                        if (b.shadow) {
                            newStr += ",!sombroso";
                        }
                        if (b.hisuian) {
                            newStr += ",!hisui";
                        }
                        if (b.alolan) {
                            newStr += ",!alola";
                        }
                        if (b.galarian) {
                            newStr += ",!galar";
                        }
                        if (b.paldean) {
                            newStr += ",!paldea";
                        }
                    }
                    newStr += ",2-4ataque";
                    
                    if (!terms.has(newStr)) {
                        str += newStr;
                        terms.add(newStr);
                    }
                });
            }
        });

        str += "&!4*&!lendário&!mítico&!pc2000-&!favorito";
        return str;
    }

    return (
        pvpFetchCompleted && fetchCompleted ? <textarea
            className="search-strings-container big-height"
            readOnly
            onClick={(e: any) => {e.target.select();
                document.execCommand("copy");
                alert("Copied to clipboard.");}}
            value={computeStr()}
        /> : <span>Fetching Pokémon...</span>
    );
}

export default DeleteTrash;