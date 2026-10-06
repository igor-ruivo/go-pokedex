import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface IconTabItem {
	id: string;
	label: string;
	/** An image path (rendered as an `<img>`), or a ready-made icon node
	 *  (e.g. an inline `<svg>`) for a tab with no dedicated image asset. */
	icon: string | ReactNode;
}

/**
 * Horizontally-scrollable icon + label tab strip — same scroll/fade/chevron
 * mechanics as `LeaguePicker`/Calendar's `DatePicker`, but styled as actual
 * tabs (an underline on the active one) rather than pill chips, so a
 * Pokémon page's Ranks/Moves/Counters/IV Table/Strings row reads as a
 * distinct kind of control from the league picker directly above it.
 */
export const IconTabBar = ({
	items,
	activeId,
	onSelect,
	ariaLabel,
}: {
	items: ReadonlyArray<IconTabItem>;
	activeId: string;
	onSelect: (id: string) => void;
	ariaLabel: string;
}) => {
	const { t } = useTranslation(['common']);
	const stripRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	// Whether the strip has any horizontal overflow at all — not just whether
	// it's currently scrolled part-way (that's what canScrollLeft/Right track).
	// Gates `overflow-x`/`scroll-snap-type` in CSS: a browser quirk (seen on a
	// hard refresh) can swallow the page's own vertical scroll when hovering a
	// scroll-snap container that has nothing to actually scroll — CSS below
	// only turns this into a scroll container in the first place once it does.
	const [scrollable, setScrollable] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = stripRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
		setScrollable(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useEffect(() => {
		const el = stripRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener('scroll', updateScrollState, { passive: true });
		// React's onWheel is passive — preventDefault() is ignored and the page
		// scrolls anyway. Native { passive: false } is required to hijack a
		// vertical wheel into horizontal scrolling on desktop (same as
		// Calendar's DatePicker/LeaguePicker). This also fixes a browser quirk
		// where, right after a hard refresh, hovering this strip could swallow
		// the page's own vertical scroll entirely until the mouse moved —
		// explicitly managing the wheel event here replaces whatever the
		// browser's own overflow/scroll-snap heuristic was doing by default.
		const onWheel = (e: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll — let the page scroll normally
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad horizontal — don't fight it
			e.preventDefault();
			el.scrollBy({ left: e.deltaY });
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		const ro = new ResizeObserver(updateScrollState);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', updateScrollState);
			el.removeEventListener('wheel', onWheel);
			ro.disconnect();
		};
	}, [items, updateScrollState]);

	const scrollByPage = (dir: 1 | -1) => {
		const el = stripRef.current;
		el?.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
	};

	return (
		<div className='r-tabs'>
			<div
				className='r-tabs-scroller'
			>
				{canScrollLeft && (
					<button
						type='button'
						className='r-tabs-arrow r-tabs-arrow--left'
						aria-label={t('common:scroll.left')}
						onClick={() => scrollByPage(-1)}
					>
						‹
					</button>
				)}
				<div
					className='r-tabs-strip'
					role='tablist'
					aria-label={ariaLabel}
					ref={stripRef}
					data-scrollable={scrollable || undefined}
				>
					{items.map((it) => {
						const active = it.id === activeId;
						return (
							<button
								key={it.id}
								type='button'
								role='tab'
								aria-selected={active}
								data-active={active}
								onClick={() => onSelect(it.id)}
							>
								<span className='r-ico-disc'>
									{typeof it.icon === 'string' ? <img src={it.icon} alt='' aria-hidden='true' /> : it.icon}
								</span>
								<span>{it.label}</span>
							</button>
						);
					})}
				</div>
				{canScrollRight && (
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
		</div>
	);
};
