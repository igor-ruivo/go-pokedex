import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';

/** Pokémon.com's Pokédex artwork: the picture of a Pokémon's alternate form is `<dex>_f<n>.png`. */
const POKEDEX_ART = 'https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full';
const FORM_NUMBER = /_f(\d+)\.png/i;

/** For each Pokédex number, the highest form number among the pictures its Pokémon already use, per game master. */
const highestFormsCache = new WeakMap<object, Map<number, number>>();

const highestFormOf = (dex: number, gamemasterPokemon: Record<string, IGamemasterPokemon>): number => {
	let highest = highestFormsCache.get(gamemasterPokemon);
	if (!highest) {
		highest = new Map();
		for (const p of Object.values(gamemasterPokemon)) {
			const form = Number(FORM_NUMBER.exec(p.imageUrl)?.[1]);
			if (form > (highest.get(p.dex) ?? 0)) highest.set(p.dex, form);
		}
		highestFormsCache.set(gamemasterPokemon, highest);
	}
	return highest.get(dex) ?? 0;
};

/**
 * The Gigantamax artwork of a species: the picture after the last form picture its Pokédex number already has (Charizard's
 * Mega X is `006_f2` and its Mega Y `006_f3`, so its Gigantamax is `006_f4`), `_f2` when it has no alternate form at all.
 */
export const gigantamaxArtUrl = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
): string => {
	const form = Math.max(1, highestFormOf(pokemon.dex, gamemasterPokemon)) + 1;
	return `${POKEDEX_ART}/${String(pokemon.dex).padStart(3, '0')}_f${form}.png`;
};

/**
 * A Gigantamax Pokémon, built here from its base species (the game master and PvPoke have no such species, and need none): the
 * same Pokémon with the Gigantamax official artwork as its picture, and the form in front of its name. It has no Pokémon GO
 * sprite, so the artwork is what is drawn whatever the Sprites setting is.
 */
export const gigantamaxOf = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	formLabel: string
): IGamemasterPokemon => ({
	...pokemon,
	speciesName: `${formLabel} ${pokemon.speciesName}`,
	imageUrl: gigantamaxArtUrl(pokemon, gamemasterPokemon),
	goImageUrl: '',
	shinyGoImageUrl: '',
});
