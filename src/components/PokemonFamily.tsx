import { Link, useNavigate } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import { shortName, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import Select from "react-select";
import { usePokemon } from "../contexts/pokemon-context";

interface IPokemonFamilyProps {
    pokemon: IGamemasterPokemon;
    similarPokemon: Set<IGamemasterPokemon>;
    getClickDestination: (speciesId: string) => string;
}

const PokemonFamily = ({pokemon, similarPokemon, getClickDestination}: IPokemonFamilyProps) => {
    const {gamemasterPokemon} = usePokemon();
    const navigate = useNavigate();
    const options = Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc);
    return (
        <>
            {similarPokemon.size > 1 && <div className="family-container-element">
                <Select
                    className="navbar-dropdown-family"
                    isSearchable={false}
                    options={options}
                    value={options.find(s => s.speciesId === pokemon.speciesId)}
                    onChange={v => navigate(getClickDestination(v!.speciesId))}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<PokemonImage pokemon={gamemasterPokemon[data.speciesId]} withName={false} specificHeight={34} specificWidth={34}/>}<strong className="aligned-block ellipsed normal-text">{shortName(data.speciesName)}</strong></div>}
                />
            </div>}
        </>
    );
}

export default PokemonFamily;