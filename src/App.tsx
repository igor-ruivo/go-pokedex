import './App.css';
import Pokedex from './views/pokedex';
import ThemeContext from './contexts/theme-context';
import { useState } from 'react';

const App = () => {
  const isBrowserDefaulDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const getDefaultTheme = (): string => {
    const localStorageTheme = localStorage.getItem('default-theme');
    const browserDefault = isBrowserDefaulDark() ? 'dark' : 'light';
    return localStorageTheme || browserDefault;
  };
  const [theme, setTheme] = useState(getDefaultTheme());

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme}`}>
        <Pokedex/>
      </div>
      </ThemeContext.Provider>
  );
}

export default App;
