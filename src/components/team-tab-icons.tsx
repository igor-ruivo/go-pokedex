import type { ReactNode } from 'react';

import { RankMedal } from './RankMedal';

/** The Teams view's own tab icons — used by its tab bar and wherever else the app points at one of those tabs. */
export type TeamTabId = 'builder' | 'top' | 'collection' | 'favorites';

/** A trainer's schoolbag (Ash's kind of backpack): the Pokémon you carry. */
const SchoolBag = ({ size = 18 }: { size?: number }) => (
	<svg viewBox='0 0 24 24' width={size} height={size} aria-hidden='true'>
		{/* carrying handle */}
		<path
			d='M9.2 5.2V4.4a2.8 2.8 0 0 1 5.6 0v.8'
			fill='none'
			stroke='#c9741a'
			strokeWidth='1.7'
			strokeLinecap='round'
		/>
		{/* the bag */}
		<path
			d='M5.2 9.2A4.2 4.2 0 0 1 9.4 5h5.2a4.2 4.2 0 0 1 4.2 4.2V19a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2z'
			fill='#f2b134'
		/>
		{/* top flap */}
		<path d='M5.2 9.2A4.2 4.2 0 0 1 9.4 5h5.2a4.2 4.2 0 0 1 4.2 4.2v1.3H5.2z' fill='#e0861c' />
		{/* front pocket */}
		<path
			d='M7.4 13.6h9.2a1 1 0 0 1 1 1V18a1.6 1.6 0 0 1-1.6 1.6H8A1.6 1.6 0 0 1 6.4 18v-3.4a1 1 0 0 1 1-1z'
			fill='#f9d36d'
		/>
		{/* clasp and zip */}
		<rect x='10.9' y='9' width='2.2' height='3' rx='0.7' fill='#7a3f0c' />
		<path d='M8.6 16.4h6.8' stroke='#c9741a' strokeWidth='1.2' strokeLinecap='round' />
	</svg>
);

const Star = ({ size = 18 }: { size?: number }) => (
	<svg viewBox='2.3 2.2 19.4 18.4' width={size} height={size} style={{ fill: 'var(--gold)' }} aria-hidden='true'>
		<path d='M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z' />
	</svg>
);

/** The icon of a Teams tab: a path for an image, or the drawn icon itself. */
export const teamTabIcon = (id: TeamTabId, size = 18): string | ReactNode => {
	switch (id) {
		case 'builder':
			return '/images/nav/rankings.webp';
		// a gold medal: the best teams
		case 'top':
			return <RankMedal rank={1} size={Math.round(size * 1.22)} />;
		case 'collection':
			return <SchoolBag size={size} />;
		default:
			return <Star size={size} />;
	}
};

/** Same as `teamTabIcon`, but always an element (an image path is drawn as an `<img>`). */
export const TeamTabIcon = ({ id, size = 18 }: { id: TeamTabId; size?: number }) => {
	const icon = teamTabIcon(id, size);
	return typeof icon === 'string' ? <img src={icon} alt='' width={size} height={size} /> : <>{icon}</>;
};
