import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';

/**
 * Shared low-level building blocks for the in-game search-string generators
 * (Mass Delete's two modes, and — independently, with its own verbatim copy
 * kept untouched — a Pokémon's own Search Strings tab). Niantic's search bar
 * only understands comma-separated OR'd terms, `&`-joined AND'd clauses, and
 * `!`-negation — no parentheses, no arbitrary boolean nesting — so every one
 * of these generators is really just different ways of expressing "which IV
 * buckets/CP-HP values count as a match" against that constrained grammar.
 */

/** Collapses a sorted-then-deduped set of integers into inclusive ranges, e.g. [1,2,3,5] -> ["1-3", "5"]. */
export const getRanges = (array: Array<number>): Array<string> => {
	if (array.length === 0) return [];
	const sorted = [...array].sort((a, b) => a - b);
	const result: Array<string> = [];
	let start = sorted[0];
	let end = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		if (current === end + 1) {
			end = current;
		} else {
			result.push(start === end ? `${start}` : `${start}-${end}`);
			start = end = current;
		}
	}
	result.push(start === end ? `${start}` : `${start}-${end}`);
	return result;
};

/**
 * Formats a set of bucket/value numbers as a comma-joined, `lang`-suffixed
 * search term (e.g. `{1,2,3}` + `"attack"` -> `,1-3attack`), leading comma
 * included so callers can concatenate freely. Empty set -> empty string.
 */
export const groupAttr = (input: Set<number>, lang: string): string => {
	const output = Array.from(input);
	output.sort((a, b) => a - b);
	const ranges = getRanges(output);
	if (ranges.length < 1) return '';
	let checkStr = ranges.join(',') + lang;
	const splitStr = checkStr.split(',');
	if (splitStr.length > 1) {
		for (let i = 0; i < splitStr.length; i++) {
			if (!splitStr[i].includes(lang)) splitStr[i] = splitStr[i] + lang;
		}
		checkStr = splitStr.join(',');
	}
	return ',' + checkStr;
};

/** IV (0-15) -> the in-game search's 5 Attack/Defense/HP buckets (0, 1-5, 6-10, 11-14, 15). */
export const ivBucket = (iv: number): number => (iv === 15 ? 4 : Math.ceil(iv / 5));

/** Every bucket except `b`, for negating "IV is in bucket b" into a search term via `groupAttr`. */
export const complementOfBucket = (b: number): Set<number> => new Set([0, 1, 2, 3, 4].filter((x) => x !== b));

export type PokemonForm = { dexNumber: number; types: Array<string>; isShadow: boolean; p: IGamemasterPokemon };
export type UniqueTypes = Record<number, Set<string>>;

/** Which types, per dex number, only one form at that dex has — enough on its own to identify that form. */
export const buildUniqueTypes = (pokemonForms: Array<PokemonForm>): UniqueTypes => {
	const typeOccurrences: Record<number, Record<string, number>> = {};
	pokemonForms.forEach(({ dexNumber, types }) => {
		if (!typeOccurrences[dexNumber]) typeOccurrences[dexNumber] = {};
		types.forEach((type) => {
			typeOccurrences[dexNumber][type] = (typeOccurrences[dexNumber][type] || 0) + 1;
		});
	});
	const uniqueTypes: UniqueTypes = {};
	for (const dex in typeOccurrences) {
		const dexNumber = parseInt(dex);
		uniqueTypes[dexNumber] = new Set<string>();
		for (const type in typeOccurrences[dexNumber]) {
			if (typeOccurrences[dexNumber][type] === 1) uniqueTypes[dexNumber].add(type);
		}
	}
	return uniqueTypes;
};

/**
 * The shortest `dex[,type[,!type]]` identifier that pins down one specific
 * form at a dex number shared by multiple forms/species — a bare dex number
 * when it's the only form there, otherwise its one unique type if it has one,
 * otherwise enough of its types (plus negated sibling-only types) to rule out
 * every sibling. Character count matters here: this is repeated once per
 * exception in a generated string.
 */
export const generatePokemonId = (
	dexNumber: number,
	types: Array<string>,
	uniqueTypes: UniqueTypes,
	formSiblings: Array<PokemonForm>,
	form: PokemonForm
): string => {
	if (formSiblings.length === 1) return `${dexNumber}`;
	let identifier = `${dexNumber}`;
	const uniqueTypesForDex = uniqueTypes[dexNumber] || new Set<string>();
	const siblingTypesToNegate = new Set<string>();
	const uniqueType = types.find((type) => uniqueTypesForDex.has(type));
	if (uniqueType) {
		identifier += `,${uniqueType}`;
	} else {
		types.forEach((type) => {
			if (formSiblings.some((t) => !t.types.includes(type))) identifier += `,${type}`;
		});
		formSiblings.forEach((sibling) => {
			if (sibling !== form) {
				sibling.types.forEach((siblingType) => {
					if (!types.includes(siblingType) && sibling.types.some((t) => types.includes(t))) {
						siblingTypesToNegate.add(siblingType);
					}
				});
			}
		});
		siblingTypesToNegate.forEach((type) => {
			identifier += `,!${type}`;
		});
	}
	return identifier;
};

/** Negates a `generatePokemonId`-style id — flips every `!type` to `type` and vice versa (De Morgan on the identity). */
export const negateIdentity = (id: string): string =>
	id
		.split(',')
		.map((f) => (f.startsWith('!') ? f.substring(1) : `!${f}`))
		.join(',');

/**
 * Replaces every English type-name token a generated string can contain with
 * its pt-BR equivalent — the CP/Attack/Defense/HP/Favorite/etc. keywords
 * elsewhere in these strings are already localized individually via
 * `gameTranslator`; this only covers the type names that show up as
 * dex-disambiguation tokens (e.g. `!23,!dark,dragon`).
 */
export const translatePtBrTypeNames = (str: string): string =>
	str
		.replaceAll('bug', 'inseto')
		.replaceAll('dark', 'sombrio')
		.replaceAll('dragon', 'dragão')
		.replaceAll('electric', 'elétrico')
		.replaceAll('fairy', 'fada')
		.replaceAll('fighting', 'lutador')
		.replaceAll('fire', 'fogo')
		.replaceAll('flying', 'voador')
		.replaceAll('ghost', 'fantasma')
		.replaceAll('grass', 'planta')
		.replaceAll('ground', 'terrestre')
		.replaceAll('ice', 'gelo')
		.replaceAll('poison', 'venenoso')
		.replaceAll('psychic', 'psíquico')
		.replaceAll('rock', 'pedra')
		.replaceAll('steel', 'aço')
		.replaceAll('water', 'água')
		.replaceAll('shadow', 'sombroso');
