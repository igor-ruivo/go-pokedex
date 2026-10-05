import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches right now, following it as the window changes. */
export const useMediaQuery = (query: string): boolean =>
	useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia(query);
			list.addEventListener('change', onChange);
			return () => list.removeEventListener('change', onChange);
		},
		() => window.matchMedia(query).matches
	);
