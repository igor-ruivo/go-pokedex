import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../contexts/language-context';
import { useVisibleLeagues } from '../contexts/visible-leagues-context';
import { leagueIcon, leagueTitle } from '../lib/league-visuals';
import { extraLeagues, useLeagueDefinitions } from '../queries/leagues';

/** A touch that moved farther than this is a scroll, not a tap. */
const TAP_SLOP = 10;
/** The browser's own click that follows a tap we already handled arrives well inside this. */
const CLICK_AFTER_TAP_MS = 800;

/**
 * One checkbox row per currently-active rotating/custom league — the same
 * "which columns should this table show" pattern a table's own column
 * picker uses, rather than a colorful chip grid. Shared by the Settings
 * page's "Extra leagues" section and the inline league-filter popover
 * (`LeagueVisibilityMenu`), so both read/write the exact same
 * `visible-leagues-context` state and always agree with each other.
 */
export const LeagueVisibilityChecklist = ({ lockedId }: { lockedId?: string | null | undefined }) => {
	const { t } = useTranslation(['common']);
	const { currentGameLanguage: gl } = useLanguage();
	const { leagues, fetchCompleted } = useLeagueDefinitions();
	const { visibleExtraLeagueIds, toggleExtraLeague } = useVisibleLeagues();

	// A touch is handled from its own pointer events, not from the `click` the browser synthesises after it. That click is resolved
	// separately (touch adjustment towards the nearest clickable, double-tap handling for a tap that follows another closely), and on a
	// phone it was landing on the row tapped a moment before instead of the one under the finger; the pointer's own target is exactly
	// where the finger is. Mouse and keyboard still go through `click`.
	const press = useRef<{ x: number; y: number } | null>(null);
	const tappedAt = useRef(0);
	const onPointerDown = (e: ReactPointerEvent) => {
		press.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
	};
	const onPointerUp = (e: ReactPointerEvent, id: string) => {
		const start = press.current;
		press.current = null;
		if (!start || e.pointerType === 'mouse') return;
		if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP) return;
		tappedAt.current = e.timeStamp;
		toggleExtraLeague(id);
	};
	const onClick = (e: ReactMouseEvent, id: string) => {
		if (e.timeStamp - tappedAt.current < CLICK_AFTER_TAP_MS && e.detail !== 0) return;
		toggleExtraLeague(id);
	};

	const cups = extraLeagues(leagues);
	// "no cups" is a statement about the definitions, so it waits for them
	if (!fetchCompleted) {
		return (
			<div className='r-lgcheck-empty'>
				<span className='r-spinner r-spinner--sm' aria-hidden='true' />
			</div>
		);
	}
	if (cups.length === 0) {
		return <p className='r-lgcheck-empty'>{t('common:leagueFilter.empty')}</p>;
	}

	return (
		<div className='r-lgcheck'>
			{cups.map((l) => {
				// The cup that's currently selected elsewhere on the page can't be hidden.
				const locked = l.id === lockedId;
				const checked = locked || visibleExtraLeagueIds.has(l.id);
				const icon = leagueIcon(l.id);
				return (
					// A button like the app's other toggles (`.r-ctr-toggle`), not a label over a hidden checkbox: no second element for a tap to be
					// forwarded to or for the browser to focus and scroll into view, and nothing in it to select with a press-and-hold.
					<button
						type='button'
						role='checkbox'
						aria-checked={checked}
						className='r-lgcheck-row'
						key={l.id}
						data-on={checked ? '' : undefined}
						data-locked={locked || undefined}
						disabled={locked}
						onPointerDown={onPointerDown}
						onPointerUp={(e) => onPointerUp(e, l.id)}
						onPointerCancel={() => {
							press.current = null;
						}}
						onClick={(e) => onClick(e, l.id)}
					>
						<span className='r-ss-box' aria-hidden='true' />
						{icon && <img src={icon} alt='' width={18} height={18} />}
						<span>{leagueTitle(l, gl).full}</span>
					</button>
				);
			})}
		</div>
	);
};
