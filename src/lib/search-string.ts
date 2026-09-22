import { GameLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import gameTranslator, { GameTranslatorKeys, gameTypeTranslator } from '../utils/GameTranslator';

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
 * One dex-scoped exclusion clause, already broken into its parts, as every
 * one of the three Mass Delete generators independently builds today: a
 * `negateIdentity`d per-form disambiguator (empty when the dex needed none),
 * an optional Shadow-status restriction, and any further qualifier text
 * (IV-bucket ranges on the Non-Perfect IVs tab; empty on the other two).
 */
export interface DexExclusion {
	dex: number;
	/** The disambiguating fragment after the dex token, already negated,
	 *  WITHOUT a leading comma — e.g. `"psychic"` or `"!fire,ice"` — `""` when
	 *  this dex has only one candidate form (a bare `!<dex>`). */
	form: string;
	/** `""` protects a matching catch regardless of Shadow status (no
	 *  `,shadow`/`,!shadow` suffix at all); `"shadow-only"` is the `,!shadow`
	 *  suffix (protects only Shadow catches); `"non-shadow-only"` is the
	 *  `,shadow` suffix (protects only non-Shadow catches — used when a
	 *  Shadow sibling independently needs a *different* verdict). */
	shadowScope: '' | 'shadow-only' | 'non-shadow-only';
	/** Every further qualifier, already comma-prefixed (e.g.
	 *  `,0-2attack,4attack,...`) — `""` when this term protects its
	 *  form+shadowScope combination unconditionally. */
	extra: string;
}

/** Renders one `DexExclusion` back to the literal fragment it stands for
 *  (everything after the leading `&`) — the `shadow` keyword itself localized
 *  via `gl`, same as every other in-game search token this app emits. */
export const renderDexExclusion = (t: DexExclusion, gl: GameLanguage): string => {
	const shadowKw = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);
	const formPart = t.form ? `,${t.form}` : '';
	const shadowPart = t.shadowScope === 'shadow-only' ? `,!${shadowKw}` : t.shadowScope === 'non-shadow-only' ? `,${shadowKw}` : '';
	return `!${t.dex}${formPart}${shadowPart}${t.extra}`;
};

/**
 * Final dead-weight-elimination pass over a generator's own list of
 * per-form exclusion clauses, exploiting two structural facts about how
 * they combine (each is its own `&`-joined AND-clause; within one clause,
 * `negateIdentity`/bucket terms are OR'd, so — De Morgan — the clause
 * protects exactly the *intersection* of the positive form of every term
 * in it):
 *
 * 1. **Shadow-scope collapse.** A `""`-scoped term for some (form, extra)
 *    protects that population regardless of Shadow status — a
 *    `"shadow-only"` or `"non-shadow-only"` term for the *identical*
 *    (form, extra) is then a strict subset of it, hence pure dead weight.
 *    Symmetrically, `"shadow-only"` and `"non-shadow-only"` terms for the
 *    same (form, extra) are complementary halves of exactly the same
 *    population a `""`-scoped term would cover — so the pair merges into
 *    one. Two terms only ever merge here when `extra` matches *exactly* —
 *    a different bucket pattern protects a generally non-overlapping
 *    population, so nothing is ever assumed comparable beyond equality.
 * 2. **Cross-form merge.** If, after (1), *every* candidate form at a dex
 *    (per `formsPerDex`) has its own Shadow-agnostic (`shadowScope === ''`)
 *    term, AND every one of those terms shares the exact same `extra` —
 *    empty (fully unconditional) or a real, byte-identical bucket pattern —
 *    those per-form terms collectively protect the entire dex regardless of
 *    form or Shadow status, at that one shared `extra`: exactly what one
 *    `!<dex><extra>` term (no form disambiguator at all) would protect, for
 *    far fewer characters. `extra` is never assumed comparable beyond exact
 *    equality here either — two forms independently needing protection at
 *    *different* bucket patterns are NOT the same population, so they never
 *    merge across forms; only within a form (case 1), or when literally
 *    every form shares one identical pattern. A single form left out
 *    entirely, or only partially protected (still Shadow-scoped after (1),
 *    or covered at a *different* `extra` than its siblings), blocks the
 *    merge for that `extra` — collapsing early would over-protect that
 *    form's remaining catches. (Two independent `extra` groups can each
 *    separately qualify for their own dex-only merge — rare, since it needs
 *    every form to independently need protection at each of two distinct
 *    shared patterns — but it's handled the same way, one `extra` at a
 *    time.)
 *
 * `formsPerDex` must come from the same candidate universe the caller
 * itself iterated to build `terms` (its own `allPokemonForms`/`baseIds`
 * construction) — never inferred from `terms` alone, since an empty dex
 * group there is indistinguishable from "every form already handled".
 */
export const canonicalizeDexExclusions = (
	terms: Array<DexExclusion>,
	formsPerDex: Record<number, Set<string>>
): Array<DexExclusion> => {
	const byDex = new Map<number, Array<DexExclusion>>();
	for (const t of terms) {
		if (!byDex.has(t.dex)) byDex.set(t.dex, []);
		byDex.get(t.dex)?.push(t);
	}

	const result: Array<DexExclusion> = [];
	for (const [dex, dexTerms] of byDex) {
		const byFormExtra = new Map<string, Array<DexExclusion>>();
		for (const t of dexTerms) {
			const key = `${t.form} ${t.extra}`;
			if (!byFormExtra.has(key)) byFormExtra.set(key, []);
			byFormExtra.get(key)?.push(t);
		}

		const afterShadowCollapse: Array<DexExclusion> = [];
		for (const group of byFormExtra.values()) {
			const scopes = new Set(group.map((t) => t.shadowScope));
			if (scopes.has('')) {
				const bare = group.find((t) => t.shadowScope === '');
				if (bare) afterShadowCollapse.push(bare);
			} else if (scopes.has('shadow-only') && scopes.has('non-shadow-only')) {
				afterShadowCollapse.push({ ...group[0], shadowScope: '' });
			} else {
				for (const scope of scopes) {
					const rep = group.find((t) => t.shadowScope === scope);
					if (rep) afterShadowCollapse.push(rep);
				}
			}
		}

		// Cross-form merge: only terms that are already fully Shadow-agnostic
		// post-collapse can ever qualify (a form left with only a Shadow-only
		// term is never `bare`, so it can never appear in any group below —
		// alone enough to block every `extra` that would need it). Grouped by
		// `extra` so two forms only ever merge when their bucket pattern is
		// byte-identical; a form covered at a *different* pattern than its
		// siblings simply never satisfies that group's completeness check.
		const allForms = formsPerDex[dex] ?? new Set<string>();
		const bareByExtra = new Map<string, Array<DexExclusion>>();
		const shadowScopedLeftovers: Array<DexExclusion> = [];
		for (const t of afterShadowCollapse) {
			if (t.shadowScope !== '') {
				shadowScopedLeftovers.push(t);
				continue;
			}
			if (!bareByExtra.has(t.extra)) bareByExtra.set(t.extra, []);
			bareByExtra.get(t.extra)?.push(t);
		}

		const finalForDex: Array<DexExclusion> = [...shadowScopedLeftovers];
		for (const [extra, group] of bareByExtra) {
			const coveredForms = new Set(group.map((t) => t.form));
			const everyFormCoveredAtThisExtra = allForms.size > 0 && Array.from(allForms).every((f) => coveredForms.has(f));
			if (everyFormCoveredAtThisExtra) {
				finalForDex.push({ dex, form: '', shadowScope: '', extra });
			} else {
				finalForDex.push(...group);
			}
		}
		result.push(...finalForDex);
	}
	return result;
};

const TYPE_TOKEN_PATTERN =
	/\b(bug|dark|dragon|electric|fairy|fighting|fire|flying|ghost|grass|ground|ice|normal|poison|psychic|rock|steel|water)\b/g;

/** Localizes the type-name tokens in a dex-server `searchFormId` disambiguator
 *  (e.g. `!23,!dark,dragon`) for `gl` — a single regex pass over the original
 *  string, not sequential per-type `.replaceAll` calls, so a translated word
 *  can never get re-matched by a later type's own replacement. */
export const translateTypeNames = (str: string, gl: GameLanguage): string =>
	gl === GameLanguage.en ? str : str.replace(TYPE_TOKEN_PATTERN, (match) => gameTypeTranslator(match, gl));
