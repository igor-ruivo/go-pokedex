import { useEffect, useMemo, useState } from 'react';
import { FetchData, useFetchUrls } from "../hooks/useFetchUrls"
import { gamemasterPokemonUrl, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from "../utils/Resources";
import PokemonGrid from '../components/PokemonGrid';
import { mapGamemasterPokemonData, mapRankedPokemon } from '../utils/conversions';
import './pokedex.scss';
import ControlPanel, { ListType } from '../components/ControlPanel';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';

const useFetchAllData: () => [IGamemasterPokemon[], IRankedPokemon[][], boolean, string] = () => {
    const [gamemasterPokemon, fetchGamemasterPokemon, gememasterPokemonFetchCompleted, errorLoadingGamemasterData]: FetchData<IGamemasterPokemon[]> = useFetchUrls();
    const [rankLists, fetchRankLists, rankListsFetchCompleted, errorLoadingRankListsData]: FetchData<IRankedPokemon[]> = useFetchUrls();

    useEffect(() => {
        const controller = new AbortController();
        fetchGamemasterPokemon([gamemasterPokemonUrl], true, {signal: controller.signal}, mapGamemasterPokemonData);
        fetchRankLists([pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl], true, {signal: controller.signal}, mapRankedPokemon);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, []);

    return [gamemasterPokemon[0], rankLists, gememasterPokemonFetchCompleted && rankListsFetchCompleted, errorLoadingGamemasterData + errorLoadingRankListsData];
}

const Pokedex = () => {
    const [gamemasterPokemon, rankLists, fetchCompleted, errors]: [IGamemasterPokemon[], IRankedPokemon[][], boolean, string] = useFetchAllData();
    const [inputText, setInputText] = useState("");
    const [listType, setListType] = useState(ListType.POKEDEX);
    const [showFamilyTree, setShowFamilyTree] = useState(true);

    const prepareData = () => {
        if (!fetchCompleted) {
            return [];
        }

        let processedList: IGamemasterPokemon[] = [];

        // TODO: use a ref with a Map<speciesID, IGamemasterPokemon>
        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon.find(p => p.speciesId === r.speciesId) as IGamemasterPokemon;

        switch (listType) {
            case ListType.POKEDEX:
                processedList = gamemasterPokemon
                    .filter(p => p.speciesName.includes(inputText.toLowerCase().trim()))
                    .sort((a, b) => a.dex - b.dex);
                    break;
            case ListType.GREAT_LEAGUE:
                processedList = rankLists[0]
                    .map(mapper)
                    .filter(p => p.speciesName.includes(inputText.toLowerCase().trim()));
                break;
            case ListType.ULTRA_LEAGUE:
                processedList = rankLists[1]
                    .map(mapper)
                    .filter(p => p.speciesName.includes(inputText.toLowerCase().trim()));
                break;
            case ListType.MASTER_LEAGUE:
                processedList = rankLists[2]
                    .map(mapper)
                    .filter(p => p.speciesName.includes(inputText.toLowerCase().trim()));
                break;
        }

        return processedList;
    }

    const data = useMemo(prepareData, [gamemasterPokemon, listType, inputText, rankLists, fetchCompleted]);

    return (
        <div className="pokedex">
            {errors ?
                <div>{errors}</div> :
                fetchCompleted ?
                    <>
                        <div>
                            <ControlPanel onSearchInputChange={setInputText} onChangeListType={setListType} showFamilyTree={showFamilyTree} onShowFamilyTree={setShowFamilyTree}/>
                        </div>
                        <PokemonGrid pokemonInfoList={data} />
                    </> :
                    <div>Loading...</div>
            }
        </div>
    );
}
export default Pokedex;