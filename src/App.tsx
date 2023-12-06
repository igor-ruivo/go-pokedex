import './App.scss';
import Pokedex from './views/pokedex';
import { Routes, Route, HashRouter } from "react-router-dom";
import Pokemon from './views/pokemon';
import { PokemonProvider } from './contexts/pokemon-context';
import Navbar from './components/Template/Navbar';
import Content from './components/Template/Content';
import { NavbarSearchProvider } from './contexts/navbar-search-context';
import { LanguageProvider } from './contexts/language-context';
import { PvpProvider } from './contexts/pvp-context';
import { MovesProvider } from './contexts/moves-context';

const App = () => {
    return (
        <PokemonProvider>
            <PvpProvider>
                <MovesProvider>
                    <LanguageProvider>
                        <NavbarSearchProvider>
                            <HashRouter>
                                <Navbar/>
                                <Content>
                                    <Routes>
                                        <Route index path="/" element={<Pokedex />}/>
                                        <Route path="/:listTypeArg" element={<Pokedex />}/>
                                        <Route path="/pokemon/:speciesId" element={<Pokemon />}/>
                                        <Route path="/pokemon/:speciesId/info" element={<Pokemon />}/>
                                        <Route path="/pokemon/:speciesId/moves" element={<Pokemon />}/>
                                        <Route path="/pokemon/:speciesId/tables" element={<Pokemon />}/>
                                        <Route path="/pokemon/:speciesId/strings" element={<Pokemon />}/>
                                        <Route path="/*" element={<div>404 not found!</div>} />
                                    </Routes>
                                </Content>
                            </HashRouter>
                        </NavbarSearchProvider>
                    </LanguageProvider>
                </MovesProvider>
            </PvpProvider>
        </PokemonProvider>
    );
}

export default App;
