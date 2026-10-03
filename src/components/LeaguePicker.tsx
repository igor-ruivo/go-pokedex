import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface LeaguePickerItem {
	id: string;
	label: string;
	/** Short label for narrow screens — falls back to `label` when omitted. */
	shortLabel?: string;
	icon?: string | undefined;
	color: string;
	/** Draws a small dot between this chip and the one before it. */
	dotBefore?: boolean;
	/** Rotating/custom cups — these wrap onto their own row below the main strip
	 *  instead of scrolling sideways with everything else. */
	extra?: boolean;
}

/**
 * Horizontally-scrollable icon + label chip strip for picking (or, in
 * `toggle` mode, multi-selecting) a PvP league — great/ultra/master plus
 * however many rotating/custom cups are currently active. Same scroll/fade/
 * chevron mechanics as Calendar's `DatePicker` (`.r-datepick`): a bounded-
 * width row that scales to any number of chips without wrapping and eating
 * vertical space, works by touch-swipe, mouse wheel, or click on desktop.
 */
type LeaguePickerProps = {
	/** Rendered at the end of the last chip row (e.g. the custom-cups button). */
	trailing?: ReactNode;
} & (
	| {
			mode?: 'select';
			items: ReadonlyArray<LeaguePickerItem>;
			activeId: string;
			onSelect: (id: string) => void;
			ariaLabel: string;
	  }
	| {
			mode: 'toggle';
			items: ReadonlyArray<LeaguePickerItem>;
			selectedIds: ReadonlySet<string>;
			onToggle: (id: string) => void;
			ariaLabel: string;
	  }
);

/**
 * One horizontally-scrollable chip row: the scroll/fade/chevron mechanics live
 * here so the main strip and the custom-cups strip below it behave identically
 * (snap points, arrows, wheel-to-scroll, edge fades).
 */
const ScrollRow = ({ children, role, ariaLabel }: { children: ReactNode; role: string; ariaLabel: string }) => {
	const { t } = useTranslation(['common']);
	const chipsRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	// Whether the row has any horizontal overflow at all — see IconTabBar's
	// own note: gates `overflow-x`/`scroll-snap-type` in CSS so this isn't a
	// scroll container in the first place when there's nothing to scroll,
	// avoiding a browser quirk that can otherwise swallow page scroll when
	// hovering an empty scroll-snap container right after a hard refresh.
	const [scrollable, setScrollable] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = chipsRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
		setScrollable(el.scrollWidth > el.clientWidth + 1);
	}, []);

	// Deliberately no auto-scroll-into-view on pick/select — this used to
	// snap the row to the newly-active chip every time (picking a league,
	// toggling one visible, …), which felt like the picker was yanking the
	// page out from under you. Whatever's already on screen stays put; only
	// the arrow buttons/swipe move it now.
	useEffect(() => {
		const el = chipsRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener('scroll', updateScrollState, { passive: true });
		// React's onWheel is passive — preventDefault() is ignored and the page
		// scrolls anyway. Native { passive: false } is required to hijack a
		// vertical wheel into horizontal chip scrolling on desktop (same as
		// Calendar's DatePicker).
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
	}, [children, updateScrollState]);

	const scrollByPage = (dir: 1 | -1) => {
		const el = chipsRef.current;
		el?.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
	};

	return (
		<div
			className='r-lgpick-scroller'
			data-fade-left={canScrollLeft || undefined}
			data-fade-right={canScrollRight || undefined}
		>
			{canScrollLeft && (
				<button
					type='button'
					className='r-lgpick-arrow r-lgpick-arrow--left'
					aria-label={t('common:scroll.left')}
					onClick={() => scrollByPage(-1)}
				>
					‹
				</button>
			)}
			<div
				className='r-lgpick-chips'
				role={role}
				aria-label={ariaLabel}
				ref={chipsRef}
				data-scrollable={scrollable || undefined}
			>
				{children}
			</div>
			{canScrollRight && (
				<button
					type='button'
					className='r-lgpick-arrow r-lgpick-arrow--right'
					aria-label={t('common:scroll.right')}
					onClick={() => scrollByPage(1)}
				>
					›
				</button>
			)}
		</div>
	);
};

export const LeaguePicker = (props: LeaguePickerProps) => {
	const { items: allItems, ariaLabel, trailing } = props;
	const items = allItems.filter((it) => !it.extra);
	const extraItems = allItems.filter((it) => it.extra);
	const role = props.mode === 'toggle' ? 'group' : 'tablist';

	const isActive = (id: string) => (props.mode === 'toggle' ? props.selectedIds.has(id) : props.activeId === id);
	const onPick = (id: string) => (props.mode === 'toggle' ? props.onToggle(id) : props.onSelect(id));

	const renderChip = (it: LeaguePickerItem) => {
		const active = isActive(it.id);
		return (
			<Fragment key={it.id}>
				{it.dotBefore && <i className='r-lgpick-dot' aria-hidden='true' />}
				<button
					type='button'
					role={props.mode === 'toggle' ? undefined : 'tab'}
					aria-selected={props.mode === 'toggle' ? undefined : active}
					aria-pressed={props.mode === 'toggle' ? active : undefined}
					data-active={active}
					style={{ ['--lg-c' as string]: it.color }}
					onClick={() => onPick(it.id)}
				>
					{it.icon ? <img src={it.icon} alt='' aria-hidden='true' /> : <i className='r-lgpick-badge'>{it.label[0]}</i>}
					<span className='r-lgpick-full'>{it.label}</span>
					<span className='r-lgpick-short'>{it.shortLabel ?? it.label}</span>
				</button>
			</Fragment>
		);
	};

	return (
		<div className='r-lgpick'>
			{extraItems.length > 0 ? (
				<>
					<ScrollRow role={role} ariaLabel={ariaLabel}>
						{items.map(renderChip)}
					</ScrollRow>
					<div className='r-lgpick-row'>
						<i className='r-lgpick-dot r-lgpick-dot--row' aria-hidden='true' />
						<ScrollRow role={role} ariaLabel={ariaLabel}>
							{extraItems.map(renderChip)}
						</ScrollRow>
						{trailing}
					</div>
				</>
			) : (
				<div className='r-lgpick-row'>
					<ScrollRow role={role} ariaLabel={ariaLabel}>
						{items.map(renderChip)}
					</ScrollRow>
					{trailing}
				</div>
			)}
		</div>
	);
};
