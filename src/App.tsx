import './App.scss';
import Pokedex from './views/pokedex';
import { ThemeProvider } from './contexts/theme-context';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Pokemon from './views/pokemon';
import { PokemonProvider } from './contexts/pokemon-context';

const App = () => {
  return (
    <div className="container">
      <ThemeProvider>
        <PokemonProvider>
          <BrowserRouter>
            <Routes>
              <Route index element={<Pokedex />}/>
              <Route path="/pokemon/:speciesId" element={<Pokemon />}/>
              <Route path="/*" element={<div>Route not found.</div>} />
            </Routes>
          </BrowserRouter>
        </PokemonProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
