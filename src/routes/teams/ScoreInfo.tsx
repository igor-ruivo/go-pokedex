import {
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { SCORE_WEIGHTS } from '../../lib/team-analysis';

/** Gap kept between the explanation and the edges of the screen, and between it and the score. */
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
 *
 * The note is drawn in the app root, positioned against the screen, not inside the score's own box: the boxes around the
 * scores (the hero, the bars) clip whatever hangs out of them. It is centred under the score, flipped above it when there
 * is no room below, and kept inside the screen on both sides.
 */
export const ScoreInfo = ({
	kind,
	className,
	children,
}: {
	kind: 'team' | 'threat';
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
	// A mouse pointer resting on the score, or keyboard focus on it, shows the note too (touch only taps).
	const [hover, setHover] = useState(false);
	const shown = open || hover;
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

	const place = () => {
		const root = rootRef.current;
		const tip = tipRef.current;
		if (!root || !tip) return;
		const anchor = root.getBoundingClientRect();
		const { width, height } = tip.getBoundingClientRect();
		const screenWidth = document.documentElement.clientWidth;
		const screenHeight = window.innerHeight;
		const left = Math.max(EDGE, Math.min(anchor.left + anchor.width / 2 - width / 2, screenWidth - EDGE - width));
		const below = anchor.bottom + EDGE;
		const above = anchor.top - EDGE - height;
		const top = below + height > screenHeight - EDGE && above >= EDGE ? above : below;
		tip.style.left = `${left}px`;
		tip.style.top = `${top}px`;
	};
	// Placed when it shows, and kept in place while the page scrolls or resizes under it.
	useLayoutEffect(() => {
		if (!shown) return;
		place();
		window.addEventListener('scroll', place, true);
		window.addEventListener('resize', place);
		return () => {
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('resize', place);
		};
	}, [shown]);

	const toggle = () => setActive(open ? null : tipId);
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		}
	};
	const onPointerEnter = (event: ReactPointerEvent) => {
		if (event.pointerType === 'mouse') setHover(true);
	};

	const note = (
		<span id={tipId} role='tooltip' ref={tipRef} className='r-tm-info-pop' data-shown={shown ? '' : undefined}>
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
	);

	return (
		<div
			ref={rootRef}
			className={`r-tm-info ${className ?? ''}`.trim()}
			role='button'
			tabIndex={0}
			aria-expanded={open}
			aria-describedby={tipId}
			onClick={toggle}
			onKeyDown={onKeyDown}
			onPointerEnter={onPointerEnter}
			onPointerLeave={() => setHover(false)}
			// keyboard focus shows the note too (a mouse click focuses it as well, so only :focus-visible counts)
			onFocus={(event) => setHover(event.currentTarget.matches(':focus-visible'))}
			onBlur={() => setHover(false)}
		>
			{children}
			{createPortal(note, document.querySelector('.rvmp') ?? document.body)}
		</div>
	);
};
