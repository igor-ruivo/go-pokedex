import { type PointerEvent as ReactPointerEvent, useRef } from 'react';

/** How much of its width a drawer has to be dragged out of the way (or how fast, in px per ms) for the swipe to close it. */
const CLOSE_FRACTION = 0.3;
const CLOSE_SPEED = 0.5;
const SETTLE_MS = 180;
/** A swipe starts only after this much sideways travel, and only if that is at least `SIDEWAYS_RATIO`× the vertical travel; more than `SCROLL_SLOP` px of vertical (or leftward) travel first hands the gesture to scrolling. */
const START_DISTANCE = 14;
const SIDEWAYS_RATIO = 3;
const SCROLL_SLOP = 10;

/**
 * Swipe a drawer that opens from the right edge to the right to close it. Only a touch drag counts, and only one that starts out
 * more sideways than up or down (so scrolling the drawer is untouched). The drawer follows the finger (and the screen behind it
 * fades with it); let go past a third of its width, or fast enough, and it slides the rest of the way out and `onClose` runs;
 * otherwise it settles back. Needs `touch-action: pan-y` on the drawer, so that the browser leaves the sideways drags to it.
 */
export const useSwipeToClose = <T extends HTMLElement>(onClose: () => void) => {
	const ref = useRef<T>(null);
	const drag = useRef<{ x: number; y: number; at: number; active: boolean } | null>(null);

	const backdrop = () => ref.current?.parentElement?.querySelector<HTMLElement>('.r-menu-backdrop') ?? null;

	const finish = (event: ReactPointerEvent<T>, cancelled = false) => {
		const state = drag.current;
		const panel = ref.current;
		drag.current = null;
		if (!state?.active || !panel) return;
		const moved = Math.max(0, event.clientX - state.x);
		const speed = moved / Math.max(1, performance.now() - state.at);
		const shade = backdrop();
		const closing = !cancelled && (moved > panel.offsetWidth * CLOSE_FRACTION || speed > CLOSE_SPEED);
		panel.style.transition = `transform ${SETTLE_MS}ms ease`;
		panel.style.transform = closing ? 'translateX(100%)' : 'translateX(0)';
		if (shade) {
			shade.style.transition = `opacity ${SETTLE_MS}ms ease`;
			shade.style.opacity = closing ? '0' : '1';
		}
		if (closing) onClose();
	};

	const handlers = {
		onPointerDown: (event: ReactPointerEvent<T>) => {
			if (event.pointerType !== 'touch') return;
			drag.current = { x: event.clientX, y: event.clientY, at: performance.now(), active: false };
		},
		onPointerMove: (event: ReactPointerEvent<T>) => {
			const state = drag.current;
			const panel = ref.current;
			if (!state || !panel) return;
			const dx = event.clientX - state.x;
			const dy = event.clientY - state.y;
			if (!state.active) {
				// scrolling wins: any real vertical movement (or a drag to the left) before the swipe has clearly started ends it
				if (dy < -SCROLL_SLOP || dy > SCROLL_SLOP || dx < -SCROLL_SLOP) {
					drag.current = null;
					return;
				}
				if (dx < START_DISTANCE) return;
				if (dx < Math.abs(dy) * SIDEWAYS_RATIO) {
					drag.current = null;
					return;
				}
				state.active = true;
				// the drawer's own entrance (and exit) animation would take the transform back from the finger
				panel.style.animation = 'none';
				panel.style.transition = 'none';
				const shade = backdrop();
				if (shade) {
					shade.style.animation = 'none';
					shade.style.transition = 'none';
				}
				panel.setPointerCapture(event.pointerId);
			}
			const moved = Math.max(0, dx);
			panel.style.transform = `translateX(${moved}px)`;
			const shade = backdrop();
			if (shade) shade.style.opacity = String(1 - Math.min(1, moved / panel.offsetWidth));
		},
		onPointerUp: (event: ReactPointerEvent<T>) => finish(event),
		// the browser took the gesture (it is a scroll after all): never close on it, just settle back
		onPointerCancel: (event: ReactPointerEvent<T>) => finish(event, true),
	};

	return { ref, handlers };
};
