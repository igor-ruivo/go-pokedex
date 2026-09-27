import { useTranslation } from 'react-i18next';

import { useLanguage } from '../contexts/language-context';
import { useVisibleLeagues } from '../contexts/visible-leagues-context';
import { leagueIcon, leagueTitle } from '../lib/league-visuals';
import { extraLeagues, useLeagueDefinitions } from '../queries/leagues';

/**
 * One checkbox row per currently-active rotating/custom league — the same
 * "which columns should this table show" pattern a table's own column
 * picker uses, rather than a colorful chip grid. Shared by the Settings
 * page's "Extra leagues" section and the inline league-filter popover
 * (`LeagueVisibilityMenu`), so both read/write the exact same
 * `visible-leagues-context` state and always agree with each other.
 */
export const LeagueVisibilityChecklist = () => {
	const { t } = useTranslation(['common']);
	const { currentGameLanguage: gl } = useLanguage();
	const { leagues } = useLeagueDefinitions();
	const { visibleExtraLeagueIds, toggleExtraLeague } = useVisibleLeagues();

	const cups = extraLeagues(leagues);
	if (cups.length === 0) {
		return <p className='r-lgcheck-empty'>{t('common:leagueFilter.empty')}</p>;
	}

	return (
		<div className='r-lgcheck'>
			{cups.map((l) => {
				const checked = visibleExtraLeagueIds.has(l.id);
				const icon = leagueIcon(l.id);
				return (
					<label className='r-lgcheck-row' key={l.id}>
						<input
							type='checkbox'
							className='r-lgcheck-input'
							checked={checked}
							onChange={() => toggleExtraLeague(l.id)}
						/>
						<span className='r-ss-box' aria-hidden='true' />
						{icon && <img src={icon} alt='' width={18} height={18} />}
						<span>{leagueTitle(l, gl).full}</span>
					</label>
				);
			})}
		</div>
	);
};
