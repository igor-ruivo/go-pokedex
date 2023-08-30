import { PokemonTypes } from "./PokemonTypes";

export default interface IPokemon {
    name: string;
    imageUrl: string;
    quizzUrl: string;
    attacks: string[];
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    types: PokemonTypes[];
    height: number;
    weight: number;
    number: number;
}