import { GameLanguage } from '../contexts/language-context';

/**
 * Shared regression-test guard for every in-game search-string generator
 * (`SearchStringsTab.tsx`, `MassDelete.tsx`, `lib/search-string.ts`): the
 * game's own search bar only understands each locale's OWN keyword spelling
 * (see `game-translations.json`) — a raw English word slipping into a
 * non-English string (e.g. `renderDexExclusion` once hardcoding `,!shadow`
 * regardless of `gl`) silently produces a search string that matches nothing
 * in that player's game.
 *
 * `GameLanguage.ptbr` is the canary locale for this check — per
 * `gameTranslationsTestFixture`, every keyword below translates to a pt_br
 * word that shares no substring with its English spelling, so a match here
 * can only mean a literal, untranslated English token leaked through.
 */
export const EN_SEARCH_KEYWORDS = [
	'attack',
	'defense',
	'hp',
	'cp',
	'shadow',
	'legendary',
	'mythical',
	'megaevolve',
	'ultrabeast',
	'favorite',
	'dynamax',
	'fusion',
	'gigantamax',
	'background',
	'specialbackground',
	'shiny',
	'costume',
	'traded',
] as const;

export const EN_TYPE_KEYWORDS = [
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
] as const;

/**
 * Asserts a generated search string for `gl` contains none of the raw
 * English search keywords/type names above as their own token (bounded by
 * non-letters, so it never flags a coincidental substring of an unrelated
 * word). Only meaningful for a `gl` whose real translations never coincide
 * with the English spelling — always pass `GameLanguage.ptbr`, never
 * `GameLanguage.en` itself (which would trivially "leak" by definition).
 */
export const assertNoEnglishSearchTokenLeak = (result: string, gl: GameLanguage): void => {
	if (gl === GameLanguage.en) {
		throw new Error('assertNoEnglishSearchTokenLeak is meaningless for GameLanguage.en — pass a real target locale.');
	}
	for (const word of [...EN_SEARCH_KEYWORDS, ...EN_TYPE_KEYWORDS]) {
		const match = new RegExp(`(?:^|[^a-z])(${word})(?:[^a-z]|$)`, 'i').exec(result);
		if (match) {
			throw new Error(`Found un-translated English search token "${match[1]}" in a "${gl}" search string: ${result}`);
		}
	}
};
