import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import { SCORE_WEIGHTS } from '../../lib/team-analysis';

/** Gap kept between the explanation and the edges of the screen. */
const EDGE = 8;

// Which score's explanation is open, shared by every ScoreInfo on the page: opening one closes the other. (Not
// `useDismiss`: on touch it swallows the press that closes a popover, and tapping the other score has to open its
// explanation right away.)
let activeId: string | null = null;
const listeners = new Set<() => void>();
const setActive = (id: string | null) => {
	if (activeId === id) return;
	activeId = id;
	listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/**
 * Makes a score (its number, with whatever is drawn around it) explain itself: hovering it with a mouse, or tapping it,
 * opens a short note on what the score is and how it is calculated. The Team Score note lists the parts it blends; the
 * threat score note adds that it is the heaviest part of the Team Score. Tapping again, tapping elsewhere or Escape closes it.
 */
export const ScoreInfo = ({
	kind,
	over = false,
	className,
	children,
}: {
	kind: 'team' | 'threat';
	/** Opens over the score instead of under it (for a score inside a box that clips what hangs out of it). */
	over?: boolean;
	/** The classes of the element this stands in for (it renders a `div`). */
	className?: string;
	children: ReactNode;
}) => {
	const { t } = useTranslation(['teams']);
	const tipId = useId();
	const open = useSyncExternalStore(
		subscribe,
		() => activeId === tipId,
		() => false
	);
	const rootRef = useRef<HTMLDivElement>(null);
	const tipRef = useRef<HTMLSpanElement>(null);

	// A press anywhere else, or Escape, closes it (a press on another score closes this one and opens that one).
	useEffect(() => {
		if (!open) return;
		const onPress = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setActive(null);
		};
		const onKey = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') setActive(null);
		};
		document.addEventListener('pointerdown', onPress);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPress);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);
	// Gone from the page while open: don't leave it marked as the open one.
	useEffect(
		() => () => {
			if (activeId === tipId) setActive(null);
		},
		[tipId]
	);

	const pct = (key: keyof typeof SCORE_WEIGHTS) => Math.round(SCORE_WEIGHTS[key] * 100);

	// Centred under the score, then slid back inside the screen when that would run off an edge.
	const place = () => {
		const tip = tipRef.current;
		if (!tip) return;
		tip.style.setProperty('--shift', '0px');
		const { left, right } = tip.getBoundingClientRect();
		const width = document.documentElement.clientWidth;
		const shift = left < EDGE ? EDGE - left : right > width - EDGE ? width - EDGE - right : 0;
		tip.style.setProperty('--shift', `${shift}px`);
	};
	useLayoutEffect(() => {
		if (open) place();
	}, [open]);

	const toggle = () => setActive(open ? null : tipId);
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		}
	};

	return (
		<div
			ref={rootRef}
			className={`r-tm-info ${className ?? ''}`.trim()}
			role='button'
			tabIndex={0}
			aria-expanded={open}
			data-over={over ? '' : undefined}
			aria-describedby={tipId}
			onClick={toggle}
			onKeyDown={onKeyDown}
			onMouseEnter={place}
			onFocus={place}
		>
			{children}
			<span id={tipId} role='tooltip' ref={tipRef} className='r-tm-info-pop' data-open={open ? '' : undefined}>
				<strong>{kind === 'team' ? t('teams:score.teamScore') : t('teams:threat.scoreLabel')}</strong>
				{kind === 'team' ? (
					<span>
						{t('teams:top.help.teamScore', {
							threat: pct('threat'),
							defense: pct('defense'),
							offense: pct('offense'),
							bulk: pct('bulk'),
							safety: pct('safety'),
							consistency: pct('consistency'),
						})}
					</span>
				) : (
					<>
						<span>{t('teams:top.help.threat')}</span>
						<span>{t('teams:threat.partOfScore', { pct: pct('threat') })}</span>
					</>
				)}
			</span>
		</div>
	);
};
