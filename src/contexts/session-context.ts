import { createContext } from 'react';
import Dictionary from '../utils/Dictionary';

const SessionContext = createContext({
  lastShownIndex: 0,
  setLastShownIndex: (_: React.SetStateAction<number>) => {},
  readyImages: {} as Dictionary<string>,
  setReadyImages: (_: React.SetStateAction<Dictionary<string>>) => {}
});

export default SessionContext;