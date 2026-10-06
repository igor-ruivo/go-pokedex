import { type RefObject, useEffect, useRef } from 'react';

/**
 * Plays a short entrance on the element each time `trigger` changes (not on the first render), for content that is swapped in place:
 * a fade, or with `rise` a fade and a small rise too. It starts again if it is still playing, and is skipped for people who asked for
 * less motion.
 */
export const usePlayOnChange = (ref: RefObject<HTMLElement | null>, trigger: unknown, rise = false) => {
	const first = useRef(true);
	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		const el = ref.current;
		if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		el.animate(
			rise
				? [
						{ opacity: 0.35, transform: 'translateY(8px)' },
						{ opacity: 1, transform: 'none' },
					]
				: [{ opacity: 0.35 }, { opacity: 1 }],
			{ duration: 240, easing: 'ease-out' }
		);
	}, [ref, trigger, rise]);
};
