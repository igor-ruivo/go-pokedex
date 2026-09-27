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

	const updateScrollState = useCallback(() => {
		const el = stripRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
	}, []);

	useEffect(() => {
		const el = stripRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener('scroll', updateScrollState, { passive: true });
		const ro = new ResizeObserver(updateScrollState);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', updateScrollState);
			ro.disconnect();
		};
	}, [items, updateScrollState]);

	const scrollByPage = (dir: 1 | -1) => {
		const el = stripRef.current;
		el?.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
	};

	return (
		<div className='r-tabs'>
			<div className='r-tabs-scroller' data-fade-left={canScrollLeft || undefined} data-fade-right={canScrollRight || undefined}>
				{canScrollLeft && (
					<button type='button' className='r-tabs-arrow r-tabs-arrow--left' aria-label={t('common:scroll.left')} onClick={() => scrollByPage(-1)}>
						‹
					</button>
				)}
				<div className='r-tabs-strip' role='tablist' aria-label={ariaLabel} ref={stripRef}>
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
								{typeof it.icon === 'string' ? <img src={it.icon} alt='' aria-hidden='true' /> : it.icon}
								<span>{it.label}</span>
							</button>
						);
					})}
				</div>
				{canScrollRight && (
					<button type='button' className='r-tabs-arrow r-tabs-arrow--right' aria-label={t('common:scroll.right')} onClick={() => scrollByPage(1)}>
						›
					</button>
				)}
			</div>
		</div>
	);
};
