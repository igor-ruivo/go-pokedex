import { useTranslation } from 'react-i18next';

import type { TeamLeague } from '../../DTOs/ITeamBuilder';
import { canonicalSlot } from '../../lib/canonical-slot';
import { isFavoriteTeam, toggleFavoriteTeam, useFavoriteTeams } from '../../lib/favorite-teams';
import type { SlotIvs } from '../../lib/team-analysis';
import type { TeamsData } from './useTeamsData';

/** The star that adds a team to, or removes it from, the favorites (see `lib/favorite-teams.ts`). */
export const FavoriteStar = ({
	league,
	members,
	data,
	className = '',
}: {
	league: TeamLeague;
	/** What the picks are compared against, to tell a pick that only restates a default from a real one. */
	data: TeamsData;
	members: ReadonlyArray<{
		speciesId: string;
		moveset: ReadonlyArray<string>;
		ivs?: SlotIvs | undefined;
		level?: number | undefined;
		buddy?: true | undefined;
	}>;
	className?: string;
}) => {
	const { t } = useTranslation(['teams']);
	const favorites = useFavoriteTeams();
	// A Best Buddy ribbon on its own, or IVs / a level that only restate the defaults, don't make another team.
	const canon = (member: (typeof members)[number]) => canonicalSlot(member, league, data);
	const active = isFavoriteTeam(favorites, league, members, canon);
	const label = active ? t('teams:favorites.remove') : t('teams:favorites.add');

	return (
		<button
			type='button'
			className={`r-tm-star-btn ${className}`.trim()}
			data-on={active ? '' : undefined}
			aria-pressed={active}
			aria-label={label}
			title={label}
			onClick={(e) => {
				e.stopPropagation();
				toggleFavoriteTeam(league, members, canon);
			}}
		>
			<svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true'>
				<path d='M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z' />
			</svg>
		</button>
	);
};
