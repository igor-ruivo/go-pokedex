import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { usePokemon } from "../contexts/pokemon-context";
import Dictionary from "../utils/Dictionary";
import { IIvPercents } from "../views/pokemon";
import PokemonInfoImage from "./PokemonInfo/PokemonInfoImage";
import "./PokemonInfoBanner.css";

interface IPokemonInfoBanner {
    pokemon: IGamemasterPokemon;
    ivPercents: Dictionary<IIvPercents>;
}

const PokemonInfoBanner = ({pokemon, ivPercents}: IPokemonInfoBanner) => {
    const {gamemasterPokemon} = usePokemon();
    if (!pokemon) {
        return <></>;
    }

    const familyTreeExceptSelf = !gamemasterPokemon ? [] : pokemon.familyId ? gamemasterPokemon.filter(p => p.speciesId !== pokemon.speciesId && p.familyId === pokemon.familyId && !p.isShadow).sort((a: IGamemasterPokemon, b: IGamemasterPokemon) => b.atk * b.def * b.hp - a.atk * a.def * a.hp) : [];
    
    return <div>
        <div className="img-container">
            <div className="img-selected-container">
                <PokemonInfoImage pokemon={pokemon} height={100} width={100}/>
            </div>
            <div className="img-family">
                {familyTreeExceptSelf.map(p => (
                    <div key = {p.speciesId} className="img-family-container">
                        <Link to={`/pokemon/${p.speciesId}`}>
                            <PokemonInfoImage pokemon={p} height={32} width={32}/>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
        <h1>{pokemon.speciesName}</h1>
        <div className="stats-container">
            <div className="stat">Attack: {pokemon.atk}</div>
            <div className="stat">Defense: {pokemon.def}</div>
            <div className="stat">HP: {pokemon.hp}</div>
        </div>
        <hr className="solid"></hr>
    </div>;
}

export default PokemonInfoBanner;