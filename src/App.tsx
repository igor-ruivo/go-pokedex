import './App.scss';
import Pokedex from './views/pokedex';
import { ThemeProvider } from './contexts/theme-context';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Pokemon from './views/pokemon';
import { PokemonProvider } from './contexts/pokemon-context';
import Navbar from './components/Template/Navbar';
import Content from './components/Template/Content';
import { NavbarSearchProvider } from './contexts/navbar-search-context';

const App = () => {
  return (
    <ThemeProvider>
      <PokemonProvider>
        <NavbarSearchProvider>
          <BrowserRouter>
            <Navbar/>
            <Content>
              <Routes>
                <Route index element={<Pokedex />}/>
                <Route path="/:listTypeArg" element={<Pokedex />}/>
                <Route path="/pokemon/:speciesId" element={<Pokemon />}/>
                <Route path="/*" element={<div>Route not found.</div>} />
              </Routes>
            </Content>
          </BrowserRouter>
        </NavbarSearchProvider>
      </PokemonProvider>
    </ThemeProvider>
  );
}

export default App;
