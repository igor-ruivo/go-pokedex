import { createContext } from 'react';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';

const PokemonContext = createContext({
  gamemasterPokemon: [] as IGamemasterPokemon[],
  rankLists: [] as IRankedPokemon[][],
  fetchCompleted: false,
  errors: ""
});

export default PokemonContext;