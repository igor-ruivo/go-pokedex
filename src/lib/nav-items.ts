import type { TFunction } from 'i18next';

import type { GameLanguage } from '../contexts/language-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { sentenceCase } from './format';
import { R } from './nav';

// A plain string renders as an emoji glyph; a `/`-rooted path renders as an
// <img> instead (see the `r-bn-icon` render below) — every item now uses a
// real icon image for a more professional look, no emoji left.
//
// `label`/`hint` are functions (not plain strings) returning a literal
// t('common:nav.<key>.label') call each — scripts/check-i18n-parity.mjs
// statically greps for quoted t() call literals, so a dynamic
// `t(\`common:nav.${key}.label\`)` template would silently escape the check.
// Keeping every call site's key literal and grep-visible is what makes the
// parity check an actual guarantee instead of a partial one.
export const NAV: Array<{
	to: string;
	icon: string;
	label: (t: TFunction) => string;
	// Only Pokédex needs one — its full label is the one nav word long enough
	// to threaten wrapping in the narrow stacked (icon-over-label) layout
	// phones get below the 1360px breakpoint (see `.r-bn-label-short`'s CSS).
	// Every other item's own label is already short enough not to need this.
	shortLabel?: (t: TFunction) => string;
	hint: (t: TFunction, gl: GameLanguage) => string;
	match: (p: string) => boolean;
	// Left out of the bar on a phone (it holds five at most there, the platforms' own limit); a wider bar has the room for it.
	wideOnly?: boolean;
}> = [
	{
		to: R.rankings('great'),
		icon: '/images/nav/rankings.webp',
		label: (t) => t('pokemonDetail:tabs.ranks'),
		hint: (t) => t('common:nav.leagues.hint'),
		// Pokédex has no nav slot of its own any more — the logo still links to it, so it lights up nothing here.
		match: (p) => p.startsWith('/rankings') && p !== R.pokedex,
	},
	{
		to: R.teams,
		icon: '/images/nav/rankings.webp',
		label: (t) => t('common:nav.teams.label'),
		hint: (t) => t('common:nav.teams.hint'),
		match: (p) => p.startsWith('/teams'),
	},
	{
		to: R.calendar(),
		icon: '/images/nav/calendar.png',
		label: (t) => t('common:nav.calendar.label'),
		hint: (t, gl) =>
			t('common:nav.calendar.hint', { raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)) }),
		match: (p) => p.startsWith('/calendar'),
	},
	{
		to: R.moves,
		icon: '/images/nav/moves.png',
		label: (t) => t('common:nav.moves.label'),
		hint: (t) => t('common:nav.moves.hint'),
		match: (p) => p.startsWith('/move'),
		wideOnly: true,
	},
	{
		to: R.types,
		icon: '/images/types/psychic.png',
		label: (t) => t('common:nav.types.label'),
		hint: (t) => t('common:nav.types.hint'),
		match: (p) => p.startsWith('/types'),
	},
	{
		to: R.searchStrings(),
		icon: '/images/nav/search-strings.svg',
		label: (t) => t('common:nav.searches.label'),
		hint: (t) => t('common:nav.searches.hint'),
		match: (p) => p.startsWith('/search-strings') || p.startsWith('/trash'),
	},
];
