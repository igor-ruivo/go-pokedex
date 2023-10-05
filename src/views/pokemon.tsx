import { useEffect, useState } from 'react';
import './pokemon.scss';
import '../components/PokemonImage.css';
import { useParams } from 'react-router-dom';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { usePokemon } from '../contexts/pokemon-context';
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from '../utils/persistent-configs-handler';
import PokemonInfoBanner from '../components/PokemonInfoBanner';
import LoadingRenderer from '../components/LoadingRenderer';
import useComputeIVs from '../hooks/useComputeIVs';

const Pokemon = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { speciesId } = useParams();
    const pokemon = gamemasterPokemon?.find(p => p.speciesId === speciesId) as IGamemasterPokemon;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="pokemon">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <>
                    {
                        !pokemon ?
                            <div>Pokémon not found</div> :
                            <div className="pokemon">
                                <PokemonInfo pokemon={pokemon}/>
                            </div>
                    }
                </>
            </LoadingRenderer>
        </div>
    );
}

interface IPokemonInfoProps {
    pokemon: IGamemasterPokemon
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
    masterLeaguePerfectCP: number
}

const PokemonInfo = ({pokemon}: IPokemonInfoProps) => {
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
        <div className="pokemon-content">
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
                    />
                </>
            </LoadingRenderer>
        </div>
    );
}

export default Pokemon;