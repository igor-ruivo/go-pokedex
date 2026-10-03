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
export const LeagueVisibilityMenu = ({ lockedId }: { lockedId?: string | null | undefined }) => {
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
				{/* "view columns" glyph — a table frame split into three columns, the
				    middle one highlighted as the one being picked — the same metaphor a
				    data-table's own show/hide-columns control uses. */}
				<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
					<rect x='3' y='4' width='18' height='16' rx='2.5' />
					<rect x='9' y='4' width='6' height='16' fill='currentColor' fillOpacity='0.3' stroke='none' />
					<path d='M9 4v16M15 4v16' strokeLinecap='round' />
				</svg>
			</button>

			{open && (
				<div className='r-lgfilter-pop' role='dialog' aria-label={t('common:leagueFilter.dialogAriaLabel')}>
					<p className='r-lgfilter-hint'>{t('common:leagueFilter.hint')}</p>
					<LeagueVisibilityChecklist lockedId={lockedId} />
				</div>
			)}
		</div>
	);
};
