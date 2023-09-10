import { useEffect, useState } from 'react';
import { useFetchUrls } from "../hooks/useFetchUrls"
import { pokemonApiUrl } from "../utils/Resources";
import PokemonGrid from '../components/PokemonGrid';
import IPokedexResponse from '../DTOs/IPokedexResponse';
import { AxiosRequestConfig } from 'axios';
import IPokemon from '../DTOs/IPokemon';
import { mapPokemonData } from '../utils/conversions';
import './pokedex.css';
import ControlPanel from '../components/ControlPanel';

const useFetchAllData: () => [IPokemon[], boolean, string] = () => {
    const [pokemonList, fetchPokemonListCallback, pokemonListFetchCompleted, errorLoadingPokemonListData]: [IPokedexResponse[], (urls: string[], axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any) => any) => Promise<void>, boolean, string] = useFetchUrls(false);
    const [pokemonInfoList, fetchPokemonInfoListCallback, pokemonInfoListFetchCompleted, errorLoadingPokemonInfoListData]: [IPokemon[], (urls: string[], axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any) => any) => Promise<void>, boolean, string] = useFetchUrls();
    
    useEffect(() => {
        const controller = new AbortController();
        if (!pokemonListFetchCompleted) {
            fetchPokemonListCallback([pokemonApiUrl], {signal: controller.signal});
        }

        if (!pokemonListFetchCompleted || errorLoadingPokemonListData) {
            return;
        }
        
        fetchPokemonInfoListCallback(pokemonList[0].results.map(p => p.url), {signal: controller.signal}, mapPokemonData);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [pokemonListFetchCompleted]);

    return [pokemonInfoList, pokemonInfoListFetchCompleted, errorLoadingPokemonListData + errorLoadingPokemonInfoListData];
}

const Pokedex = () => {
    const [pokemonInfoList, pokemonInfoListFetchCompleted, errors]: [IPokemon[], boolean, string] = useFetchAllData();
    const [filterGo, setFilterGo] = useState(false);
    const [inputText, setInputText] = useState("");

    return (
        <>
            {errors ?
                <div>{errors}</div> :
                pokemonInfoListFetchCompleted ?
                    <>
                        <div>
                            <ControlPanel onSearchInputChange={setInputText}/>
                        </div>
                        <PokemonGrid pokemonInfoList={pokemonInfoList.filter(p => p.name.includes(inputText.toLowerCase()) && (p.imageUrl || p.shinyUrl)).sort((a, b) => a.number - b.number)} />
                    </> :
                    <div>Loading...</div>
            }
        </>
    );
}
export default Pokedex;