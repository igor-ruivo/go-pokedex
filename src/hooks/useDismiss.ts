import { useEffect, useRef } from 'react';

/** Movement past this many px counts as a scroll drag, not a tap. */
const SCROLL_THRESHOLD = 10;

/**
 * "Click outside / press Escape closes this popover" — with one extra
 * guarantee on touch devices: the dismissing press is **swallowed**. It
 * closes the popover and does nothing else, so a fat-finger mis-tap never
 * also triggers whatever sat under it (a nav link, another button, a grid
 * tile…). On desktop (a fine pointer with hover) that swallow is skipped —
 * there's normally enough room around a popover that an outside click landing
 * on something else is a deliberate second action, not a mis-tap, so it
 * closes the popover and still reaches that target.
 *
 * On touch, a press outside is only ever treated as a dismiss once it
 * resolves as an actual tap (settled by `touchend`, not `touchstart`) — an
 * outside press that turns into a vertical drag is scrolling the page behind
 * the popover, which should keep working exactly as if the popover weren't
 * there, not get read as "dismiss" and cancelled. A popover with no
 * scrollable content of its own (a plain settings/filter panel) shouldn't
 * itself hand a swipe through to scroll that same page underneath it though —
 * that half is `touch-action: none` in CSS on the panel itself, not this hook.
 *
 * @param open   whether the popover is currently shown
 * @param onClose called to close it (outside press or Escape)
 * @returns a ref to attach to the popover root (the element wrapping both the
 *          trigger and the panel)
 */
export const useDismiss = <T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) => {
	const ref = useRef<T>(null);
	// keep the latest onClose without re-subscribing the listeners every render
	const close = useRef(onClose);
	close.current = onClose;

	useEffect(() => {
		if (!open) return;
		// Desktop has room to spare around a popover, so an outside click is
		// rarely also a press on some other control by accident — swallowing it
		// there would just force a second click on whatever it landed on, when
		// that first one might well have been aimed there on purpose. Close
		// plainly and let it through; the swallow-and-eat-the-follow-ups dance
		// below stays reserved for touch, where a fat-finger mis-tap is the
		// actual risk being guarded against.
		const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

		// A press that's already been handled this tick — guards against a
		// stray double-fire (e.g. a pen input producing both a pointerdown this
		// hook closes on and a touch sequence too).
		let handledAt = -1;

		const swallowFollowups = () => {
			// Stop this exact press from reaching whatever it landed on — not just
			// eat a *future* click. A lot of controls act straight off pointerdown
			// (the IV picker's drag track, the level stepper, a native <select>
			// opening its menu) and never produce a click at all, so swallowing
			// only the click left them all still reachable through an open
			// popover. Capture phase on `window`, `once` plus a timeout both clean
			// each up (a press may never resolve — dragging away, secondary
			// button…).
			const swallow = (ev: Event) => {
				ev.stopPropagation();
				ev.preventDefault();
			};
			for (const type of ['click', 'touchend', 'pointerup']) {
				window.addEventListener(type, swallow, { capture: true, once: true });
				window.setTimeout(() => window.removeEventListener(type, swallow, true), 350);
			}
		};

		// Mouse/pen: a press is a discrete, instantaneous action with no "is
		// this actually a scroll?" ambiguity — safe to decide right away.
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType === 'touch') return; // touch has its own tap-vs-scroll handling below
			if (ref.current?.contains(e.target as Node)) return;
			if (e.timeStamp === handledAt) return;
			handledAt = e.timeStamp;
			close.current();
			if (isDesktop) return;
			e.stopPropagation();
			e.preventDefault();
			swallowFollowups();
		};

		// Touch: an outside press might still turn into a scroll drag, so the
		// close decision waits for `touchend` instead of firing on `touchstart` —
		// deciding immediately would also close (and, worse, cancel — see
		// `preventDefault` below) a scroll that happens to start outside the
		// popover, which is exactly the page behind it the user is trying to
		// keep scrolling.
		let touch: { x: number; y: number; scrolled: boolean } | null = null;
		const onTouchStart = (e: TouchEvent) => {
			if (ref.current?.contains(e.target as Node)) return;
			const t = e.touches[0];
			touch = t ? { x: t.clientX, y: t.clientY, scrolled: false } : null;
		};
		const onTouchMove = (e: TouchEvent) => {
			if (!touch) return;
			const t = e.touches[0];
			if (!t) return;
			if (Math.hypot(t.clientX - touch.x, t.clientY - touch.y) > SCROLL_THRESHOLD) touch.scrolled = true;
		};
		const onTouchEnd = (e: TouchEvent) => {
			const wasTap = touch && !touch.scrolled;
			touch = null;
			if (!wasTap) return; // a scroll drag — leave it alone, don't close, don't swallow
			if (e.timeStamp === handledAt) return;
			handledAt = e.timeStamp;
			close.current();
			e.stopPropagation();
			e.preventDefault();
			swallowFollowups();
		};

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close.current();
		};

		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
		document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
		document.addEventListener('touchend', onTouchEnd, { capture: true });
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('touchstart', onTouchStart, true);
			document.removeEventListener('touchmove', onTouchMove, true);
			document.removeEventListener('touchend', onTouchEnd, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return ref;
};
