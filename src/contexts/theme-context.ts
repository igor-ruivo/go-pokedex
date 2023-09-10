import { createContext } from 'react';

const ThemeContext = createContext({
  theme: "light",
  setTheme: (_theme: string) => {},
});

export default ThemeContext;