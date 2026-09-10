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

		const onPointerDown = (e: PointerEvent) => {
			if (ref.current?.contains(e.target as Node)) return;
			close.current();

			// Eat the click this same press will produce so the element under the
			// pointer isn't activated as well. Capture phase runs before React's
			// root listener; `once` plus a timeout both clean it up (a press may
			// never resolve to a click — dragging away, secondary button…).
			const swallow = (ev: Event) => {
				ev.stopPropagation();
				ev.preventDefault();
			};
			window.addEventListener('click', swallow, { capture: true, once: true });
			window.setTimeout(() => window.removeEventListener('click', swallow, true), 350);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close.current();
		};

		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return ref;
};
