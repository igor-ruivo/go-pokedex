import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Keeps an accordion from throwing the reader around: when a card is opened or closed, whatever opens or closes above it moves it
 * up or down the page. Call the returned function with the card's element just before changing what is open; once the page has
 * drawn the change (`changed` is what tells it apart: the id of the open card), the scroll is moved by however far the card went, so
 * it is on the very line it was on — the card just opened (or closed) stays under the finger instead of sliding away.
 *
 * A card that was just opened (`opening`) is then brought into view with a smooth scroll: centred on the screen, except that its
 * start always stays on screen, under the bar at the top, when it is taller than what is left.
 */
export const useScrollAnchor = (changed: unknown): ((card: HTMLElement | null, opening?: boolean) => void) => {
	const anchor = useRef<{ card: HTMLElement; top: number; opening: boolean } | null>(null);

	useLayoutEffect(() => {
		const held = anchor.current;
		anchor.current = null;
		if (!held?.card.isConnected) return;
		const moved = held.card.getBoundingClientRect().top - held.top;
		if (Math.abs(moved) > 0.5) window.scrollTo(0, window.scrollY + moved);
		if (!held.opening) return;

		const rect = held.card.getBoundingClientRect();
		const barBottom = document.querySelector('.r-appbar')?.getBoundingClientRect().bottom ?? 70;
		const margin = 12;
		const free = window.innerHeight - barBottom - margin * 2;
		// centred in what is left under the bar; the start of the card wins when it is taller than that
		const wanted = rect.height >= free ? barBottom + margin : barBottom + margin + (free - rect.height) / 2;
		const by = rect.top - wanted;
		if (Math.abs(by) < 2) return;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollBy({ top: by, behavior: reduced ? 'auto' : 'smooth' });
	}, [changed]);

	return useCallback((card: HTMLElement | null, opening = false) => {
		anchor.current = card ? { card, top: card.getBoundingClientRect().top, opening } : null;
	}, []);
};
