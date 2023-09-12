import { useEffect, useState } from 'react';
import { FetchData, useFetchUrls } from "../hooks/useFetchUrls"
import { gamemasterPokemonUrl, pokemonApiUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from "../utils/Resources";
import PokemonGrid from '../components/PokemonGrid';
import IPokedexResponse from '../DTOs/IPokedexResponse';
import IPokemon from '../DTOs/IPokemon';
import { mapGamemasterPokemonData, mapPokemonData, mapRankedPokemon } from '../utils/conversions';
import './pokedex.scss';
import ControlPanel, { ListType } from '../components/ControlPanel';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';

const useFetchAllData: () => [IPokemon[], IGamemasterPokemon[], IRankedPokemon[], IRankedPokemon[], IRankedPokemon[], boolean, string] = () => {
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

    return [pokemonInfoList, gamemasterPokemonList[0], greatLeagueList[0], ultraLeagueList[0], masterLeagueList[0], pokemonInfoListFetchCompleted, buildErrorMessage([errorLoadingPokemonListData, errorLoadingPokemonInfoListData, errorLoadingGamemasterPokemonListData, errorLoadingGreatLeagueListData, errorLoadingUltraLeagueListData, errorLoadingMasterLeagueListData])];
}

const Pokedex = () => {
    const [pokemonInfoList, gamemasterPokemonList, greatLeagueList, ultraLeagueList, masterLeagueList, pokemonInfoListFetchCompleted, errors]: [IPokemon[], IGamemasterPokemon[], IRankedPokemon[], IRankedPokemon[], IRankedPokemon[], boolean, string] = useFetchAllData();
    const [filterGo, setFilterGo] = useState(false);
    const [inputText, setInputText] = useState("");
    const [listType, setListType] = useState(ListType.POKEDEX);
    const [showFamilyTree, setShowFamilyTree] = useState(true);

    let processedList: IPokemon[] = [];

    const mapper = (r: IRankedPokemon): IPokemon => ({
        name: r.speciesId,
        imageUrl: pokemonInfoList.find(p => p.name.split("_")[0] === r.speciesId)?.imageUrl ?? "",
        shinyUrl: pokemonInfoList.find(p => p.name.split("_")[0] === r.speciesId)?.shinyUrl ?? "",
        attacks: [],
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
        types: [],
        height: 0,
        weight: 0,
        number: gamemasterPokemonList.find(p => p.speciesId === r.speciesId)?.dex ?? 0
    });

    switch (listType) {
        case ListType.POKEDEX:
            processedList = pokemonInfoList
                .filter(p => p.name.includes(inputText.toLowerCase().trim()) && (p.imageUrl || p.shinyUrl) && (!filterGo || gamemasterPokemonList.some(gm => gm.speciesId === p.name)))
                .sort((a, b) => a.number - b.number);
                break;
        case ListType.GREAT_LEAGUE:
            processedList = greatLeagueList
                .map(mapper)
                .filter(p => p.name.includes(inputText.toLowerCase().trim()) && (p.imageUrl || p.shinyUrl));
            break;
        case ListType.ULTRA_LEAGUE:
            processedList = ultraLeagueList
                .map(mapper)
                .filter(p => p.name.includes(inputText.toLowerCase().trim()) && (p.imageUrl || p.shinyUrl));
            break;
        case ListType.MASTER_LEAGUE:
            processedList = masterLeagueList
                .map(mapper)
                .filter(p => p.name.includes(inputText.toLowerCase().trim()) && (p.imageUrl || p.shinyUrl));
            break;
    }

    return (
        <div className="pokedex">
            {errors ?
                <div>{errors}</div> :
                pokemonInfoListFetchCompleted ?
                    <>
                        <div>
                            <ControlPanel onSearchInputChange={setInputText} filterGo={filterGo} onFilterGo={setFilterGo} listType={listType} onChangeListType={setListType} showFamilyTree={showFamilyTree} onShowFamilyTree={setShowFamilyTree}/>
                        </div>
                        <PokemonGrid pokemonInfoList={processedList} />
                    </> :
                    <div>Loading...</div>
            }
        </div>
    );
}
export default Pokedex;