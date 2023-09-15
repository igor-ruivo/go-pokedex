import './App.scss';
import Pokedex from './views/pokedex';
import ThemeContext from './contexts/theme-context';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FetchData, useFetchUrls } from './hooks/useFetchUrls';
import { IGamemasterPokemon } from './DTOs/IGamemasterPokemon';
import { IRankedPokemon } from './DTOs/IRankedPokemon';
import { familyTreeStorageKey, gamemasterPokemonUrl, inputTextStorageKey, lastShownIndexStorageKey, listTypeStorageKey, pvpokeRankings1500Url, pvpokeRankings2500Url, pvpokeRankingsUrl, readyImagesStorageKey } from './utils/Resources';
import { mapGamemasterPokemonData, mapRankedPokemon } from './utils/conversions';
import Pokemon from './views/pokemon';
import PokemonContext from './contexts/pokemon-context';
import SessionContext from './contexts/session-context';
import Dictionary from './utils/Dictionary';
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
  
  const isBrowserDefaulDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const getDefaultTheme = (): string => {
    const localStorageTheme = localStorage.getItem('default-theme');
    const browserDefault = isBrowserDefaulDark() ? 'dark' : 'light';
    return localStorageTheme || browserDefault;
  };

  const getDefaultReadyImages = (): Dictionary<string> => {
    const storedInfo = sessionStorage.getItem(readyImagesStorageKey);
    if (storedInfo) {
      return JSON.parse(storedInfo);
    }
      return {};
  }
  
  const [lastShownIndex, setLastShownIndex] = useState(+(sessionStorage.getItem(lastShownIndexStorageKey) ?? "0"));
  const [theme, setTheme] = useState(getDefaultTheme());
  const [readyImages, setReadyImages] = useState<Dictionary<string>>(getDefaultReadyImages());
  const [listType, setListType] = useState((+(sessionStorage.getItem(listTypeStorageKey) ?? ListType.POKEDEX)) as ListType);
  const [inputText, setInputText] = useState(sessionStorage.getItem(inputTextStorageKey) ?? "");
  const [showFamilyTree, setShowFamilyTree] = useState(localStorage.getItem(familyTreeStorageKey) === "true");

  useEffect(() => {
    if (theme === "dark") {
      document.body.style.background = "#202023"
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
    } else {
      document.body.style.background = "#f8f8fa"
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <SessionContext.Provider value={{lastShownIndex, setLastShownIndex, readyImages, setReadyImages}}>
        <ControlPanelContext.Provider value={{listType, setListType, inputText, setInputText, showFamilyTree, setShowFamilyTree}}>
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
      </SessionContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
