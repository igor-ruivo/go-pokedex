import { createContext } from 'react';

export enum ListType {
  POKEDEX,
  GREAT_LEAGUE,
  ULTRA_LEAGUE,
  MASTER_LEAGUE
}

const ControlPanelContext = createContext({
  listType: ListType.POKEDEX,
  setListType: (_: React.SetStateAction<ListType>) => {},
  inputText: "",
  setInputText: (_: React.SetStateAction<string>) => {},
  showFamilyTree: false,
  setShowFamilyTree: (_: React.SetStateAction<boolean>) => {},
});

export default ControlPanelContext;