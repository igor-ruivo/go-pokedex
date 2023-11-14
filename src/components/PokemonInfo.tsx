import "./PokemonInfo.scss"
import { useState, useEffect } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import useComputeIVs from "../hooks/useComputeIVs";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from "../utils/persistent-configs-handler";
import LoadingRenderer from "./LoadingRenderer";
import PokemonInfoBanner from "./PokemonInfoBanner";
import { LeagueType } from "../hooks/useLeague";

interface IPokemonInfoProps {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
}

const PokemonInfo = ({pokemon, league, handleSetLeague}: IPokemonInfoProps) => {
    const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
        const cachedValue = readPersistentValue(key);
        if (!cachedValue) {
            return defaultValue;
        }
        return +cachedValue;
    }

    const parseSessionCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
        const cachedValue = readSessionValue(key);
        if (!cachedValue) {
            return defaultValue;
        }
        return +cachedValue;
    }

    const [attackIV, setAttackIV] = useState(parseSessionCachedNumberValue(ConfigKeys.AttackIV, 0));
    const [defenseIV, setDefenseIV] = useState(parseSessionCachedNumberValue(ConfigKeys.DefenseIV, 0));
    const [hpIV, setHPIV] = useState(parseSessionCachedNumberValue(ConfigKeys.HPIV, 0));
    const [levelCap, setLevelCap] = useState<number>(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 40));

    const [ivPercents, loading] = useComputeIVs({pokemon, levelCap, attackIV, defenseIV, hpIV});

    useEffect(() => {
        writeSessionValue(ConfigKeys.AttackIV, attackIV.toString());
        writeSessionValue(ConfigKeys.DefenseIV, defenseIV.toString());
        writeSessionValue(ConfigKeys.HPIV, hpIV.toString());
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [attackIV, defenseIV, hpIV, levelCap]);
    
    return (
        <LoadingRenderer errors={''} completed={!loading && Object.hasOwn(ivPercents, pokemon.speciesId)}>
            <>
                <PokemonInfoBanner
                    pokemon={pokemon}
                    ivPercents={ivPercents}
                    levelCap={levelCap}
                    setLevelCap={setLevelCap}
                    attack = {attackIV}
                    setAttack={setAttackIV}
                    defense={defenseIV}
                    setDefense={setDefenseIV}
                    hp={hpIV}
                    setHP={setHPIV}
                    league={league}
                    handleSetLeague={handleSetLeague}
                />
            </>
        </LoadingRenderer>
    );
}

export default PokemonInfo;