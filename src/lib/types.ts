import type { PokemonTypes } from '../DTOs/PokemonTypes';

/** Runtime value of a PokemonTypes entry is the capitalised name ("Water"). Also accepts an already-lowercased key. */
export const typeKey = (t: PokemonTypes | string): string => String(t).toLowerCase();

/** CSS custom property holding this type's colour (defined in rvmp.css). */
export const typeVar = (t: PokemonTypes | string): string => `var(--t-${typeKey(t)})`;

/**
 * Style object that sets `--accent` (+ a readable ink) for a subtree, derived
 * from a Pokémon's primary type. This is the whole visual engine: every page
 * tints itself from the mon it's showing.
 */
export const accentStyle = (primaryType: PokemonTypes | undefined): React.CSSProperties => {
	if (!primaryType) return {};
	const vars = { '--accent': typeVar(primaryType), '--accent-ink': '#06101d' };
	return vars as React.CSSProperties;
};

/** All 18 type keys (lowercase), alphabetical — the shared filter list. */
export const TYPE_KEYS: ReadonlyArray<string> = [
	'bug',
	'dark',
	'dragon',
	'electric',
	'fairy',
	'fighting',
	'fire',
	'flying',
	'ghost',
	'grass',
	'ground',
	'ice',
	'normal',
	'poison',
	'psychic',
	'rock',
	'steel',
	'water',
];

export const TYPE_LABEL: Record<string, string> = {
	normal: 'Normal',
	fire: 'Fire',
	water: 'Water',
	electric: 'Electric',
	grass: 'Grass',
	ice: 'Ice',
	fighting: 'Fighting',
	poison: 'Poison',
	ground: 'Ground',
	flying: 'Flying',
	psychic: 'Psychic',
	bug: 'Bug',
	rock: 'Rock',
	ghost: 'Ghost',
	dragon: 'Dragon',
	dark: 'Dark',
	steel: 'Steel',
	fairy: 'Fairy',
};
