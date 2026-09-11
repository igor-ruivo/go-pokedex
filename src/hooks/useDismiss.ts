import { useEffect, useRef } from 'react';

/**
 * "Click outside / press Escape closes this popover" — with one extra guarantee:
 * the dismissing pointer press is **swallowed**. It closes the popover and does
 * nothing else, so you never accidentally trigger whatever sat under the pointer
 * (a nav link, another button, a grid tile…).
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
		// A press that's already been handled this tick (pointerdown fires, then
		// the browser also dispatches touchstart for the same touch) — without
		// this a single tap would call `close` and re-arm the click-swallower
		// twice.
		let handledAt = -1;

		const onOutsidePress = (e: Event) => {
			if (ref.current?.contains(e.target as Node)) return;
			if (e.timeStamp === handledAt) return;
			handledAt = e.timeStamp;
			close.current();

			// Stop this exact press from reaching whatever it landed on — not just
			// eat a *future* click. A lot of controls act straight off pointerdown
			// (the IV picker's drag track, the level stepper, a native <select>
			// opening its menu) and never produce a click at all, so swallowing only
			// the click left them all still reachable through an open popover.
			// `stopPropagation` here, in the capture phase on `document`, keeps the
			// event from ever being dispatched down to the target; `preventDefault`
			// additionally tells the browser to skip the compatibility mouse events
			// (mousedown/click) a tap would otherwise still synthesize. Listening on
			// both `pointerdown` *and* `touchstart` — rather than trusting one event
			// to reliably suppress the other's follow-ups on every mobile browser —
			// is what actually closed the gap: a tap on a Link/grid-tile on mobile
			// was still going through despite this exact fix on `pointerdown` alone.
			e.stopPropagation();
			e.preventDefault();

			// Belt and braces: on the odd browser/input combo that still produces a
			// click (or a touch tap's End-of-chain events) despite the above, eat
			// those too. Capture phase runs before React's root listener; `once`
			// plus a timeout both clean each up (a press may never resolve — dragging
			// away, secondary button…).
			const swallow = (ev: Event) => {
				ev.stopPropagation();
				ev.preventDefault();
			};
			for (const type of ['click', 'touchend', 'pointerup']) {
				window.addEventListener(type, swallow, { capture: true, once: true });
				window.setTimeout(() => window.removeEventListener(type, swallow, true), 350);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close.current();
		};

		document.addEventListener('pointerdown', onOutsidePress, { capture: true });
		document.addEventListener('touchstart', onOutsidePress, { capture: true, passive: false });
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onOutsidePress, true);
			document.removeEventListener('touchstart', onOutsidePress, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return ref;
};
