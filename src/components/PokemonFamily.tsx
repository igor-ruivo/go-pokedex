import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import PokemonImage from "./PokemonImage";
import { shortName, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";

interface IPokemonFamilyProps {
    pokemon: IGamemasterPokemon;
    similarPokemon: Set<IGamemasterPokemon>;
    getClickDestination: (speciesId: string) => string;
}

const PokemonFamily = ({pokemon, similarPokemon, getClickDestination}: IPokemonFamilyProps) => {
    return (
        <>
            {similarPokemon.size > 1 && <div className="img-container item">
                <div className="img-family">
                    {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                        <div key = {p.speciesId}>
                            <Link to={getClickDestination(p.speciesId)}>
                                <strong className={`move-detail with-shadow ${p.speciesId === pokemon.speciesId ? "soft" : "baby-soft"} normal-padding item ${p.speciesId === pokemon.speciesId ? "extra-padding-right" : ""}`}>
                                    <PokemonImage pokemon={p} withName={false} specificHeight={38} specificWidth={38}/>
                                    {p.speciesId === pokemon.speciesId && shortName(p.speciesName)}
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