import './App.scss';
import Pokedex from './views/pokedex';
import { ThemeProvider } from './contexts/theme-context';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FetchData, useFetchUrls } from './hooks/useFetchUrls';
import { IGamemasterPokemon } from './DTOs/IGamemasterPokemon';
import { IRankedPokemon } from './DTOs/IRankedPokemon';
import { collapsedStorageKey, familyTreeStorageKey, gamemasterPokemonUrl, inputTextStorageKey, listTypeStorageKey, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl } from './utils/Resources';
import { mapGamemasterPokemonData, mapRankedPokemon } from './utils/conversions';
import Pokemon from './views/pokemon';
import PokemonContext from './contexts/pokemon-context';
import ControlPanelContext, { ListType } from './contexts/control-panel-context';

const App = () => {
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

  const [gamemasterPokemon, rankLists, fetchCompleted, errors]: [IGamemasterPokemon[], IRankedPokemon[][], boolean, string] = useFetchAllData();
  
  const [listType, setListType] = useState((+(sessionStorage.getItem(listTypeStorageKey) ?? ListType.POKEDEX)) as ListType);
  const [inputText, setInputText] = useState(sessionStorage.getItem(inputTextStorageKey) ?? "");
  const [showFamilyTree, setShowFamilyTree] = useState(localStorage.getItem(familyTreeStorageKey) === "true");
  const [collapsed, setCollapsed] = useState(sessionStorage.getItem(collapsedStorageKey) === "true");

  return (
    <div className="container">
      <ThemeProvider>
        <ControlPanelContext.Provider value={{listType, setListType, inputText, setInputText, showFamilyTree, setShowFamilyTree, collapsed, setCollapsed}}>
          <PokemonContext.Provider value={{gamemasterPokemon, rankLists, fetchCompleted, errors}}>
            <BrowserRouter>
              <Routes>
                  <Route index element={<Pokedex />}/>
                  <Route path="/pokemon/:speciesId" element={<Pokemon />}/>
                  <Route path="/*" element={<div>Route not found.</div>} />
              </Routes>
            </BrowserRouter>
          </PokemonContext.Provider>
        </ControlPanelContext.Provider>
      </ThemeProvider>
    </div>
  );
}

export default App;
