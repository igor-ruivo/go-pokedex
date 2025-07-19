import "./PokemonInfo.scss"
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import LoadingRenderer from "./LoadingRenderer";
import PokemonInfoBanner, { IIvPercents } from "./PokemonInfoBanner";
import { LeagueType } from "../hooks/useLeague";
import Dictionary from "../utils/Dictionary";

interface IPokemonInfoProps {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
    handleSetLeague: (newLeague: LeagueType) => void;
    loading: boolean;
    ivPercents: Dictionary<IIvPercents>;
    attackIV: number;
    setAttackIV: (_: React.SetStateAction<number>) => void;
    defenseIV: number;
    setDefenseIV: (_: React.SetStateAction<number>) => void;
    hpIV: number;
    setHPIV: (_: React.SetStateAction<number>) => void;
    level: number;
}

const PokemonInfo = ({pokemon, league, handleSetLeague, loading, ivPercents, attackIV, setAttackIV, defenseIV, setDefenseIV, hpIV, setHPIV, level}: IPokemonInfoProps) => {
    
    return (
        <LoadingRenderer errors={''} completed={!loading && Object.hasOwn(ivPercents, pokemon.speciesId)}>
            {() => <>
                <PokemonInfoBanner
                    pokemon={pokemon}
                    ivPercents={ivPercents}
                    attack = {attackIV}
                    setAttack={setAttackIV}
                    defense={defenseIV}
                    setDefense={setDefenseIV}
                    hp={hpIV}
                    setHP={setHPIV}
                    league={league}
                    handleSetLeague={handleSetLeague}
                    level={level}
                />
            </>}
        </LoadingRenderer>
    );
}

export default PokemonInfo;