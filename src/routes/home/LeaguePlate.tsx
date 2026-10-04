import type { CSSProperties } from 'react';

import { LEAGUE_CP } from '../../lib/league-caps';
import { leagueIcon } from '../../lib/league-visuals';
import { modeColor } from '../../lib/nav';

// The permanent leagues' badges (the rotating cups have their own, see `leagueIcon`).
const FALLBACK_ICON: Record<string, string> = {
	great: '/images/leagues/cups/pogo_great_league.png',
	ultra: '/images/leagues/cups/pogo_ultra_league.png',
	master: '/images/leagues/cups/pogo_master_league.png',
};

/** The icon a league is shown with: its own badge, or for the permanent three the default one. */
export const homeLeagueIcon = (id: string): string | undefined => leagueIcon(id) ?? FALLBACK_ICON[id];

/**
 * A league's badge on a plate tinted with the league's own colour, with a full border. `small` is the compact version. A
 * league with no badge shows its CP cap in the plate instead.
 */
export const LeaguePlate = ({ id, small = false }: { id: string; small?: boolean }) => {
	const icon = homeLeagueIcon(id);
	return (
		<span
			className='h-league-plate'
			data-small={small ? '' : undefined}
			style={{ ['--lg' as string]: modeColor(id) } as CSSProperties}
		>
			{icon ? <img src={icon} alt='' loading='lazy' /> : <b>{LEAGUE_CP[id] ?? id.slice(0, 2)}</b>}
		</span>
	);
};
