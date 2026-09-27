import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../hooks/useDismiss';
import { LeagueVisibilityChecklist } from './LeagueVisibilityChecklist';

/**
 * Filter/projection button for rotating/custom leagues — the same "pick
 * which columns this table shows" affordance as a table's own column
 * picker, applied to which currently-active cups show up wherever this is
 * placed (the Rankings top bar, a Pokémon page's league tabs + leaderboard).
 * Reads/writes the exact same `visible-leagues-context` Settings' own "Extra
 * leagues" section does (via `LeagueVisibilityChecklist`), so toggling a cup
 * here or there is the same action either way — always rendered (even with
 * zero active cups right now) so the control stays discoverable.
 */
export const LeagueVisibilityMenu = () => {
	const { t } = useTranslation(['common']);
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	return (
		<div className='r-lgfilter' ref={rootRef}>
			<button
				type='button'
				className='r-icon-btn r-lgfilter-trigger'
				aria-label={t('common:leagueFilter.triggerAriaLabel')}
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				{/* "column picker" glyph — three columns, the middle one toggled off — the
				    same visual metaphor a data-table's own show/hide-columns control uses. */}
				<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
					<rect x='3' y='4' width='5' height='16' rx='1' />
					<rect x='9.5' y='4' width='5' height='16' rx='1' strokeDasharray='2 2' />
					<rect x='16' y='4' width='5' height='16' rx='1' />
					<path d='M11 10.5l1.5 1.5 2-3' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			</button>

			{open && (
				<div className='r-lgfilter-pop' role='dialog' aria-label={t('common:leagueFilter.dialogAriaLabel')}>
					<p className='r-lgfilter-hint'>{t('common:leagueFilter.hint')}</p>
					<LeagueVisibilityChecklist />
				</div>
			)}
		</div>
	);
};
