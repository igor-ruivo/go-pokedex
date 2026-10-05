import type { ReactNode } from 'react';

import { CombatIcon } from './CombatIcon';

const TAB_ICON: Partial<Record<string, string>> = {
	ranks: '/images/nav/rankings.webp',
	moves: '/images/nav/moves.png',
	counters: '/images/nav/counters.png',
	strings: '/images/nav/search-strings.svg',
};
// No dedicated image asset for this one — a small table glyph instead, in two
// hues (an amber header band, a few highlighted cells) so it holds its own next
// to the coloured tab images.
const IvTableIcon = () => (
	<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
		<rect x='3' y='4' width='18' height='16' rx='2.5' stroke='var(--text)' strokeWidth='1.6' opacity='0.6' />
		<path d='M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5V10H3z' fill='#ffb020' />
		<g stroke='var(--text)' strokeWidth='1.4' opacity='0.5'>
			<line x1='3' y1='10' x2='21' y2='10' />
			<line x1='3' y1='15' x2='21' y2='15' />
			<line x1='9' y1='4' x2='9' y2='20' />
			<line x1='15' y1='4' x2='15' y2='20' />
		</g>
		<rect x='9.8' y='10.8' width='4.4' height='3.4' rx='0.8' fill='#4fa3ff' />
		<rect x='15.8' y='15.8' width='4.4' height='3.4' rx='0.8' fill='#4fa3ff' />
		<rect x='3.8' y='15.8' width='4.4' height='3.4' rx='0.8' fill='#4fa3ff' />
	</svg>
);

/** The icon of a Pokémon page's tab: an image URL, or an element for the two tabs drawn in code. */
export const pokemonTabIcon = (slug: string): ReactNode | string =>
	slug === 'iv-table' ? <IvTableIcon /> : slug === 'combat' ? <CombatIcon /> : (TAB_ICON[slug] ?? '');
