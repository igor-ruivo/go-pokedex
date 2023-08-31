import { useEffect, useState } from 'react';
import IPokemon from "../DTOs/IPokemon";
import { useFetchData } from "../hooks/useFetchData"
import { cacheTtlInMillis, pokemonApiUrl } from "../utils/Resources";
import { readEntry, writeEntry } from '../utils/localStorage-handler';
import { axiosGet } from '../utils/axios-handler';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import PokemonGrid from '../components/PokemonGrid';

const Pokedex = () => {
    const pokemonList = useFetchData(pokemonApiUrl);
    const [pokemonInfoList, setPokemonInfoList] = useState<IPokemon[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const promises = pokemonList.results!.map((p: { url: string; }) => new Promise(async (resolve: (value: IPokemon) => void) => {
                const cachedData = readEntry<IPokemon>(p.url);
                if (cachedData) {
                    resolve(cachedData);
                } else {
                    const data = await axiosGet(p.url);
                    const typedData: IPokemon = {
                        number: data.id,
                        name: data.name,
                        imageUrl: data.sprites.other["official-artwork"].front_default,
                        quizzUrl: data.sprites.versions["generation-i"]["red-blue"].back_gray,
                        hp: data.stats[0].base_stat,
                        attack: data.stats[1].base_stat,
                        defense: data.stats[2].base_stat,
                        specialAttack: data.stats[3].base_stat,
                        specialDefense: data.stats[4].base_stat,
                        speed: data.stats[5].base_stat,
                        height: data.height,
                        weight: data.weight,
                        types: Array.from<any>(data.types).map(t => t.type.name as PokemonTypes),
                        attacks: Array.from<any>(data.moves).map(m => m.move.name)
                    };
                    writeEntry(p.url, typedData, cacheTtlInMillis);
                    resolve(typedData);
                }
            }));
            const promiseValues = await Promise.all<IPokemon>(promises);
            console.log("only setting once");
            setPokemonInfoList(promiseValues);
        }
        if (pokemonList?.results.length > 0) {
            fetchData();
        }
    }, [pokemonList]);

    if(pokemonInfoList.length > 0) {
        console.log("Rendering a PokemonGrid.")
    }

    return (
        <>
            {pokemonInfoList.length > 0 ? <PokemonGrid pokemonInfoList={pokemonInfoList} /> : <div>A carregar...</div>}
        </>
    );
}
export default Pokedex;