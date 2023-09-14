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
        
        const inputFilter = (p: IGamemasterPokemon, targetPokemon: IGamemasterPokemon[]) => {
            if (!p.familyId || !showFamilyTree) {
                return baseFilter(p);
            }

            const wholeFamilyNames = targetPokemon
                .filter(pokemon => pokemon.familyId === p.familyId);

            return wholeFamilyNames.some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.toLowerCase().includes(inputText.toLowerCase().trim());

        switch (listType) {
            case ListType.POKEDEX:
                const pokedexPool = gamemasterPokemon.filter(p => !p.isShadow);
                processedList = pokedexPool
                    .filter(p => inputFilter(p, pokedexPool));
                break;
            case ListType.GREAT_LEAGUE:
                const greatLeaguePool = rankLists[0].map(mapper);
                processedList = greatLeaguePool
                    .filter(p => inputFilter(p, greatLeaguePool));
                break;
            case ListType.ULTRA_LEAGUE:
                const ultraLeaguePool = rankLists[1].map(mapper);
                processedList = ultraLeaguePool
                    .filter(p => inputFilter(p, ultraLeaguePool));
                break;
            case ListType.MASTER_LEAGUE:
                const masterLeaguePool = rankLists[2].map(mapper);
                processedList = masterLeaguePool
                    .filter(p => inputFilter(p, masterLeaguePool));
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