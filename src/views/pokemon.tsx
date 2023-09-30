import { useEffect, useState } from 'react';
import './pokemon.scss';
import '../components/PokemonImage.css';
import { useParams } from 'react-router-dom';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { styled } from '@mui/material/styles';
import AppraisalBar from '../components/AppraisalBar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import PokemonInfoCard from '../components/PokemonInfo/PokemonInfoCard';
import { Theme, useTheme } from '../contexts/theme-context';
import { usePokemon } from '../contexts/pokemon-context';
import LevelSlider from '../components/LevelSlider';
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
    ultraLeagueRank: number,
    ultraLeagueLvl: number,
    ultraLeagueCP: number,
    ultraLeagueAttack: number,
    ultraLeagueDefense: number,
    ultraLeagueHP: number,
    ultraLeaguePerfect: any,
    masterLeagueRank: number,
    masterLeagueLvl: number,
    masterLeagueCP: number,
    masterLeagueAttack: number,
    masterLeagueDefense: number,
    masterLeagueHP: number,
    masterLeaguePerfect: any
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

    const {gamemasterPokemon} = usePokemon();
    const {theme} = useTheme();
    const isDarkMode = theme === Theme.Dark;

    const [ivPercents, loading] = useComputeIVs({pokemon, levelCap, attackIV, defenseIV, hpIV});

    useEffect(() => {
        writeSessionValue(ConfigKeys.AttackIV, attackIV.toString());
        writeSessionValue(ConfigKeys.DefenseIV, defenseIV.toString());
        writeSessionValue(ConfigKeys.HPIV, hpIV.toString());
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [attackIV, defenseIV, hpIV, levelCap]);
    
    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: isDarkMode ? '#24292f' : '#fff',
        ...theme.typography.body2,
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    const familyTree = !gamemasterPokemon ? [] : pokemon.familyId ? gamemasterPokemon.filter(p => p.familyId === pokemon.familyId && !p.isShadow).sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => b.atk * b.def * b.hp - a.atk * a.def * a.hp) : [pokemon];
    
    return (
        <div className="pokemon-content">
            <LoadingRenderer errors={''} completed={!loading && Object.hasOwn(ivPercents, pokemon.speciesId)}>
                <>
                    <PokemonInfoBanner
                        pokemon={pokemon}
                        ivPercents={ivPercents}
                    />
                    <div className="content">
                    <AppraisalBar
                        attack = {attackIV}
                        setAttack={setAttackIV}
                        defense={defenseIV}
                        setDefense={setDefenseIV}
                        hp={hpIV}
                        setHP={setHPIV}
                    />
                    <LevelSlider
                        levelCap={levelCap}
                        setLevelCap={setLevelCap}
                    />
                    </div>
                    {pokemon && <div className="tab_panel_container images_container grid_container">
                        <Box sx={{ flexGrow: 1 }}>
                            <Grid container disableEqualOverflow spacing={{ xs: 2, md: 3 }}>
                                {familyTree.map(p => (
                                    <Grid xs={12} sm={12} md={12} key={p.speciesId} className="grid">
                                        <Item>
                                            <PokemonInfoCard pokemon={p} ivPercents={ivPercents[p.speciesId]} />
                                        </Item>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </div>}
                </>
            </LoadingRenderer>
        </div>
    );
}

export default Pokemon;