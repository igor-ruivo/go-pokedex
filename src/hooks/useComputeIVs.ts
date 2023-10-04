import { useEffect, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import Dictionary from "../utils/Dictionary";
import { computeBestIVs } from "../utils/pokemonIv";
import { IIvPercents } from "../views/pokemon";
import { usePokemon } from "../contexts/pokemon-context";

interface IUseComputeIVsProps {
    pokemon: IGamemasterPokemon;
    levelCap: number;
    attackIV: number;
    defenseIV: number;
    hpIV: number;
}

const useComputeIVs = ({pokemon, levelCap, attackIV, defenseIV, hpIV}: IUseComputeIVsProps) => {
    const [ivPercents, setIvPercents] = useState<Dictionary<IIvPercents>>({});
    const [loading, setLoading] = useState(true);
    const {gamemasterPokemon} = usePokemon();

    const reachablePokemons: IGamemasterPokemon[] = [];
    const queue = [pokemon];
    while (queue.length > 0) {
        const currentPokemon = queue.shift() as IGamemasterPokemon;
        reachablePokemons.push(currentPokemon);
        if (!currentPokemon.evolutions || currentPokemon.evolutions.length === 0) {
            continue;
        }
        queue.push(...currentPokemon.evolutions.map(id => gamemasterPokemon?.find(pk => pk.speciesId === id)).filter(pk => pk) as IGamemasterPokemon[]);
    }
    
    useEffect(() => {
        setLoading(true);
        const computeIvs = async () => {
            const familyIvPercents: Dictionary<IIvPercents> = {};

            reachablePokemons.forEach(p => {
                const resGL = computeBestIVs(p.atk, p.def, p.hp, 1500, levelCap);
                const resUL = computeBestIVs(p.atk, p.def, p.hp, 2500, levelCap);
                const resML = computeBestIVs(p.atk, p.def, p.hp, Number.MAX_VALUE, levelCap);
        
                const flatGLResult = Object.values(resGL).flat();
                const flatULResult = Object.values(resUL).flat();
                const flatMLResult = Object.values(resML).flat();
        
                const rankGLIndex = flatGLResult.findIndex(r => r.IVs.A === attackIV && r.IVs.D === defenseIV && r.IVs.S === hpIV);
                const rankULIndex = flatULResult.findIndex(r => r.IVs.A === attackIV && r.IVs.D === defenseIV && r.IVs.S === hpIV);
                const rankMLIndex = flatMLResult.findIndex(r => r.IVs.A === attackIV && r.IVs.D === defenseIV && r.IVs.S === hpIV);
        
                familyIvPercents[p.speciesId] = {
                    greatLeagueRank: rankGLIndex,
                    greatLeagueLvl: flatGLResult[rankGLIndex].L,
                    greatLeagueCP: flatGLResult[rankGLIndex].CP,
                    greatLeagueAttack: flatGLResult[rankGLIndex].battle.A,
                    greatLeagueDefense: flatGLResult[rankGLIndex].battle.D,
                    greatLeagueHP: flatGLResult[rankGLIndex].battle.S,
                    greatLeaguePerfect: flatGLResult[0].IVs,
                    ultraLeagueRank: rankULIndex,
                    ultraLeagueLvl: flatULResult[rankULIndex].L,
                    ultraLeagueCP: flatULResult[rankULIndex].CP,
                    ultraLeagueAttack: flatULResult[rankULIndex].battle.A,
                    ultraLeagueDefense: flatULResult[rankULIndex].battle.D,
                    ultraLeagueHP: flatULResult[rankULIndex].battle.S,
                    ultraLeaguePerfect: flatULResult[0].IVs,
                    masterLeagueRank: rankMLIndex,
                    masterLeagueLvl: flatMLResult[rankMLIndex].L,
                    masterLeagueCP: flatMLResult[rankMLIndex].CP,
                    masterLeagueAttack: flatMLResult[rankMLIndex].battle.A,
                    masterLeagueDefense: flatMLResult[rankMLIndex].battle.D,
                    masterLeagueHP: flatMLResult[rankMLIndex].battle.S,
                    masterLeaguePerfect: flatMLResult[0].IVs
                };
            });
            setIvPercents(familyIvPercents);
            setLoading(false);
        }
        computeIvs();
    }, [pokemon, levelCap, attackIV, defenseIV, hpIV]);

    const result: [Dictionary<IIvPercents>, boolean] = [ivPercents, loading];

    return result;
}

export default useComputeIVs;