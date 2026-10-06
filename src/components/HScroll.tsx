import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { scrollOneStep } from '../lib/scroll-step';

/**
 * A row that scrolls sideways, with the round arrows every such row of the site has at the edge that still has more behind it (on a
 * phone too): `className` is the scrolling element's own class, whatever it styles. The arrows scroll it by most of its width. They
 * appear and go as the row is scrolled, resized or filled in (a picture loading can change how far it goes).
 * `arrowTop`: where the arrows sit down the row (the middle by default), for one that is very tall.
 */
export const HScroll = ({
	className,
	arrowTop,
	children,
}: {
	className: string;
	arrowTop?: string | undefined;
	children: ReactNode;
}) => {
	const { t } = useTranslation(['common']);
	const ref = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ left: false, right: false });

	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const left = el.scrollLeft > 1;
		const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
		setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		update();
		el.addEventListener('scroll', update, { passive: true });
		// pictures that load inside it change how far it goes (a load does not bubble: it is caught on the way down)
		el.addEventListener('load', update, true);
		const resize = new ResizeObserver(update);
		resize.observe(el);
		const mutation = new MutationObserver(update);
		mutation.observe(el, { childList: true, subtree: true });
		return () => {
			el.removeEventListener('scroll', update);
			el.removeEventListener('load', update, true);
			resize.disconnect();
			mutation.disconnect();
		};
	}, [update]);

	const scrollByPage = (direction: 1 | -1) => {
		const el = ref.current;
		if (el) scrollOneStep(el, direction);
	};

	return (
		<div className='r-hscroll' style={arrowTop ? { ['--arrow-top' as string]: arrowTop } : undefined}>
			{edges.left && (
				<button
					type='button'
					className='r-tabs-arrow r-tabs-arrow--left'
					aria-label={t('common:scroll.left')}
					onClick={() => scrollByPage(-1)}
				>
					‹
				</button>
			)}
			<div ref={ref} className={className}>
				{children}
			</div>
			{edges.right && (
				<button
					type='button'
					className='r-tabs-arrow r-tabs-arrow--right'
					aria-label={t('common:scroll.right')}
					onClick={() => scrollByPage(1)}
				>
					›
				</button>
			)}
		</div>
	);
};
