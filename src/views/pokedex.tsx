import { useEffect, useState } from 'react';
import { FetchData, useFetchUrls } from "../hooks/useFetchUrls"
import { gamemasterPokemonUrl, pokemonApiUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from "../utils/Resources";
import PokemonGrid from '../components/PokemonGrid';
import IPokedexResponse from '../DTOs/IPokedexResponse';
import IPokemon from '../DTOs/IPokemon';
import { mapGamemasterPokemonData, mapPokemonData, mapRankedPokemon } from '../utils/conversions';
import './pokedex.scss';
import ControlPanel from '../components/ControlPanel';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';

const useFetchAllData: () => [IPokemon[], boolean, string] = () => {
    const [pokemonList, fetchPokemonListCallback, pokemonListFetchCompleted, errorLoadingPokemonListData]: FetchData<IPokedexResponse> = useFetchUrls();
    const [pokemonInfoList, fetchPokemonInfoListCallback, pokemonInfoListFetchCompleted, errorLoadingPokemonInfoListData]: FetchData<IPokemon> = useFetchUrls();
    const [gamemasterPokemonList, fetchGamemasterPokemonList, gememasterPokemonListFetchCompleted, errorLoadingGamemasterPokemonListData]: FetchData<IGamemasterPokemon[]> = useFetchUrls();
    const [greatLeagueList, fetchGreatLeagueList, greatLeagueListFetchCompleted, errorLoadingGreatLeagueListData]: FetchData<IRankedPokemon[]> = useFetchUrls();
    const [ultraLeagueList, fetchUltraLeagueList, ultraLeagueListFetchCompleted, errorLoadingUltraLeagueListData]: FetchData<IRankedPokemon[]> = useFetchUrls();
    const [masterLeagueList, fetchMasterLeagueList, masterLeagueListFetchCompleted, errorLoadingMasterLeagueListData]: FetchData<IRankedPokemon[]> = useFetchUrls();

    const buildErrorMessage = (errors: string[]) => errors.join("\n").trim();

    useEffect(() => {
        const controller = new AbortController();
        fetchGamemasterPokemonList([gamemasterPokemonUrl], true, {signal: controller.signal}, mapGamemasterPokemonData);
        fetchGreatLeagueList([pvpokeRankings1500Url], true, {signal: controller.signal}, mapRankedPokemon);
        fetchUltraLeagueList([pvpokeRankings2500Url], true, {signal: controller.signal}, mapRankedPokemon);
        fetchMasterLeagueList([pvpokeRankingsUrl], true, {signal: controller.signal}, mapRankedPokemon);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        if (!pokemonListFetchCompleted) {
            fetchPokemonListCallback([pokemonApiUrl], true, {signal: controller.signal});
        }

        if (!pokemonListFetchCompleted || errorLoadingPokemonListData) {
            return;
        }
        
        fetchPokemonInfoListCallback(pokemonList[0].results.map(p => p.url), true, {signal: controller.signal}, mapPokemonData);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [pokemonListFetchCompleted]);

    return [pokemonInfoList, pokemonInfoListFetchCompleted, buildErrorMessage([errorLoadingPokemonListData, errorLoadingPokemonInfoListData, errorLoadingGamemasterPokemonListData, errorLoadingGreatLeagueListData, errorLoadingUltraLeagueListData, errorLoadingMasterLeagueListData])];
}

const Pokedex = () => {
    const [pokemonInfoList, pokemonInfoListFetchCompleted, errors]: [IPokemon[], boolean, string] = useFetchAllData();
    const [filterGo, setFilterGo] = useState(false);
    const [inputText, setInputText] = useState("");

    return (
        <div className="pokedex">
            {errors ?
                <div>{errors}</div> :
                pokemonInfoListFetchCompleted ?
                    <>
                        <div>
                            <ControlPanel onSearchInputChange={setInputText}/>
                        </div>
                        <PokemonGrid pokemonInfoList={pokemonInfoList.filter(p => p.name.includes(inputText.toLowerCase().trim()) && (p.imageUrl || p.shinyUrl)).sort((a, b) => a.number - b.number)} />
                    </> :
                    <div>Loading...</div>
            }
        </div>
    );
}
export default Pokedex;