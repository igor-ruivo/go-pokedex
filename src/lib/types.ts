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

/** Raid attacking-type filter list — `TYPE_KEYS` minus Normal.
 *  Normal is the only type with zero super-effective matchups against
 *  anything, so it was never a meaningful raid attacking type: there's no
 *  `/rankings/raid/normal` page, no `normal-raid-dps-rank.json` from
 *  dex-server, and no Normal chip in the raid rankings' type picker. Every
 *  *other* type picker (Moves, the type chart, Pokédex/PvP type filters)
 *  keeps Normal — Normal-type Pokémon and moves are still real and still
 *  filterable there. */
export const RAID_TYPE_KEYS: ReadonlyArray<string> = TYPE_KEYS.filter((t) => t !== 'normal');

// No `TYPE_LABEL` here any more — a type's display name is Pokémon GO's own,
// per the player's in-game language (`GameLanguage`), not a hardcoded
// English/website-locale string. Use `gameTypeDisplayTranslator(type, gl)`
// from `utils/GameTranslator.ts` instead, with `gl` from `useLanguage()`.
