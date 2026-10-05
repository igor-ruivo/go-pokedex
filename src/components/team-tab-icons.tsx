import type { ReactNode } from 'react';

import { CollectionIcon, TeamBuilderIcon } from './NavIcons';
import { RankMedal } from './RankMedal';

/** The Teams view's own tab icons — used by its tab bar and wherever else the app points at one of those tabs. */
export type TeamTabId = 'builder' | 'top' | 'collection' | 'favorites';

const Star = ({ size = 18 }: { size?: number }) => (
	<svg viewBox='2.3 2.2 19.4 18.4' width={size} height={size} style={{ fill: 'var(--gold)' }} aria-hidden='true'>
		<path d='M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z' />
	</svg>
);

/** The icon of a Teams tab: a path for an image, or the drawn icon itself. */
export const teamTabIcon = (id: TeamTabId, size = 18): string | ReactNode => {
	switch (id) {
		case 'builder':
			return <TeamBuilderIcon />;
		// a gold medal: the best teams
		case 'top':
			return <RankMedal rank={1} size={Math.round(size * 1.22)} />;
		case 'collection':
			return <CollectionIcon />;
		default:
			return <Star size={size} />;
	}
};

/** Same as `teamTabIcon`, but always an element (an image path is drawn as an `<img>`). */
export const TeamTabIcon = ({ id, size = 18 }: { id: TeamTabId; size?: number }) => {
	const icon = teamTabIcon(id, size);
	return typeof icon === 'string' ? <img src={icon} alt='' width={size} height={size} /> : <>{icon}</>;
};
