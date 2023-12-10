import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import { sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";

interface IPokemonFamilyProps {
    pokemon: IGamemasterPokemon;
    similarPokemon: Set<IGamemasterPokemon>;
    getClickDestination: (speciesId: string) => string;
}

const PokemonFamily = ({pokemon, similarPokemon, getClickDestination}: IPokemonFamilyProps) => {
    return (
        <>
            {similarPokemon.size > 1 && <div className="img-container">
                <div className="img-family">
                    {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                        <div key = {p.speciesId}>
                            <Link to={getClickDestination(p.speciesId)}>
                                <strong className={`move-detail with-shadow soft normal-padding item ${p.speciesId === pokemon.speciesId ? "extra-padding-right" : ""}`}>
                                    <PokemonImage pokemon={p} withName={false} specificHeight={28} specificWidth={28}/>
                                    {p.speciesId === pokemon.speciesId && p.speciesShortName}
                                </strong>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>}
        </>
    );
}

export default PokemonFamily;