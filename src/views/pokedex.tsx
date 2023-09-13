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
    const [showFamilyTree, setShowFamilyTree] = useState(false);

    const prepareData = () => {
        if (!fetchCompleted) {
            return [];
        }

        let processedList: IGamemasterPokemon[] = [];

        // TODO: improve with a Map<speciesID, IGamemasterPokemon>
        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon.find(p => p.speciesId === r.speciesId) as IGamemasterPokemon;
        
        const inputFilter = (p: IGamemasterPokemon, extraConditions?: ((pokemon: IGamemasterPokemon) => boolean)[]) => {
            if (extraConditions && extraConditions.some(condition => !condition(p))) {
                return false;
            }

            if (!p.familyId || !showFamilyTree) {
                return baseFilter(p);
            }

            const wholeFamilyNames = gamemasterPokemon
                .filter(pokemon => pokemon.familyId === p.familyId && (!extraConditions || extraConditions.every(condition => condition(pokemon))));

            return wholeFamilyNames.some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.toLowerCase().includes(inputText.toLowerCase().trim());

        switch (listType) {
            case ListType.POKEDEX:
                processedList = gamemasterPokemon
                    .filter(p => inputFilter(p, [(pokemon) => !pokemon.isShadow]));
                break;
            case ListType.GREAT_LEAGUE:
                processedList = rankLists[0]
                    .map(mapper)
                    .filter(p => inputFilter(p));
                break;
            case ListType.ULTRA_LEAGUE:
                processedList = rankLists[1]
                    .map(mapper)
                    .filter(p => inputFilter(p));
                break;
            case ListType.MASTER_LEAGUE:
                processedList = rankLists[2]
                    .map(mapper)
                    .filter(p => inputFilter(p));
                break;
        }

        return processedList;
    }

    const data = useMemo(prepareData, [gamemasterPokemon, listType, inputText, rankLists, fetchCompleted, showFamilyTree]);

    return (
        <div className="pokedex">
            {errors ?
                <div>{errors}</div> :
                fetchCompleted ?
                    <>
                        <div>
                            <ControlPanel onSearchInputChange={setInputText} onChangeListType={setListType} listType={listType} showFamilyTree={showFamilyTree} onShowFamilyTree={setShowFamilyTree}/>
                        </div>
                        <PokemonGrid pokemonInfoList={data} />
                    </> :
                    <div>Loading...</div>
            }
        </div>
    );
}
export default Pokedex;