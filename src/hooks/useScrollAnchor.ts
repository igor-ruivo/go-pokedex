import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Keeps an accordion from throwing the reader around: when a card is opened or closed, whatever opens or closes above it moves it
 * up or down the page. Call the returned function with the card's element just before changing what is open; once the page has
 * drawn the change (`changed` is what tells it apart: the id of the open card), the scroll is moved by however far the card went, so
 * it is on the very line it was on — the card just opened (or closed) stays under the finger instead of sliding away.
 */
export const useScrollAnchor = (changed: unknown): ((card: HTMLElement | null) => void) => {
	const anchor = useRef<{ card: HTMLElement; top: number } | null>(null);

	useLayoutEffect(() => {
		const held = anchor.current;
		anchor.current = null;
		if (!held?.card.isConnected) return;
		const moved = held.card.getBoundingClientRect().top - held.top;
		if (Math.abs(moved) > 0.5) window.scrollTo(0, window.scrollY + moved);
	}, [changed]);

	return useCallback((card: HTMLElement | null) => {
		anchor.current = card ? { card, top: card.getBoundingClientRect().top } : null;
	}, []);
};
