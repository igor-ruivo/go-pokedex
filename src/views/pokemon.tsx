import { useContext } from 'react';
import './pokemon.scss';
import PokemonContext from '../contexts/pokemon-context';
import { useParams } from 'react-router-dom';
import PokemonImage from '../components/PokemonImage';
import LoadingRenderer from '../components/LoadingRenderer';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';

const Pokemon = () => {
    const { gamemasterPokemon, rankLists, fetchCompleted, errors } = useContext(PokemonContext);
    const { speciesId } = useParams();
    const pokemon = gamemasterPokemon?.find(p => p.speciesId === speciesId) as IGamemasterPokemon;
    
    return (
        <div className="pokemon">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <>
                    {
                        !pokemon ?
                            <div>Pokémon not found</div> :
                            <PokemonImage pokemon={pokemon} />
                    }
                </>
            </LoadingRenderer>
        </div>
    );
}

export default Pokemon;