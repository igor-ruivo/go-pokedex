import { useEffect, useState } from 'react';
import IPokemon from "../DTOs/IPokemon";
import { useFetchData } from "../hooks/useFetchData"
import { cacheTtlInMillis, pokemonApiUrl } from "../utils/Resources";
import { readEntry, writeEntry } from '../utils/localStorage-handler';
import PokemonGrid from '../components/PokemonGrid';
import IPokedexResponse from '../DTOs/IPokedexResponse';
import axios from 'axios';
import { mapPokemonData } from '../utils/conversions';

const Pokedex = () => {
    const [pokemonList, loadingData, errorLoadingData]: [IPokedexResponse, boolean, string] = useFetchData(pokemonApiUrl);
    const [pokemonInfoList, setPokemonInfoList] = useState<IPokemon[]>([]);
    const [loadingPokemons, setLoadingPokemons] = useState(true);
    const [errorLoadingPokemons, setErrorLoadingPokemons] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            if (loadingData || errorLoadingData) {
                return;
            }

            try {
                const promises = pokemonList.results.map(p => new Promise(async (resolve: (value: IPokemon) => void) => {
                    const cachedData = readEntry<IPokemon>(p.url);
                    if (cachedData) {
                        resolve(cachedData);
                    } else {
                        const response = await axios.get(p.url, {
                            signal: controller.signal
                        });

                        const typedResponseData = mapPokemonData(response.data);
                        
                        writeEntry(p.url, typedResponseData, cacheTtlInMillis);
                        resolve(typedResponseData);
                    }
                }));
                const promiseValues = await Promise.all<IPokemon>(promises);
                setPokemonInfoList(promiseValues);
            }
            catch(error) {
                setErrorLoadingPokemons(JSON.stringify(error));
            }
            finally {
                setLoadingPokemons(false);
            }
        }
        fetchData();

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [loadingData]);

    return (
        <>
            {errorLoadingData ?
                <div>{errorLoadingData}</div> :
                errorLoadingPokemons ?
                    <div>{errorLoadingPokemons}</div> :
                    !loadingPokemons ?
                        <PokemonGrid pokemonInfoList={pokemonInfoList.filter(p => p.imageUrl || p.shinyUrl)} /> :
                        <div>A carregar...</div>
            }
        </>
    );
}
export default Pokedex;