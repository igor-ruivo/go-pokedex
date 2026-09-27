import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface LeaguePickerItem {
	id: string;
	label: string;
	/** Short label for narrow screens — falls back to `label` when omitted. */
	shortLabel?: string;
	icon?: string | undefined;
	color: string;
}

/**
 * Horizontally-scrollable icon + label chip strip for picking (or, in
 * `toggle` mode, multi-selecting) a PvP league — great/ultra/master plus
 * however many rotating/custom cups are currently active. Same scroll/fade/
 * chevron mechanics as Calendar's `DatePicker` (`.r-datepick`): a bounded-
 * width row that scales to any number of chips without wrapping and eating
 * vertical space, works by touch-swipe, mouse wheel, or click on desktop.
 */
type LeaguePickerProps =
	| { mode?: 'select'; items: ReadonlyArray<LeaguePickerItem>; activeId: string; onSelect: (id: string) => void; ariaLabel: string }
	| {
			mode: 'toggle';
			items: ReadonlyArray<LeaguePickerItem>;
			selectedIds: ReadonlySet<string>;
			onToggle: (id: string) => void;
			ariaLabel: string;
	  };

export const LeaguePicker = (props: LeaguePickerProps) => {
	const { t } = useTranslation(['common']);
	const { items, ariaLabel } = props;
	const chipsRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = chipsRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
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
		// Deliberately no wheel-to-horizontal hijack here (unlike Calendar's
		// DatePicker) — a plain vertical scroll over this row keeps scrolling
		// the page, same as it would over any other inline content; horizontal
		// movement is arrow-buttons-only for a mouse, and swipe-only for touch.
		const ro = new ResizeObserver(updateScrollState);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', updateScrollState);
			ro.disconnect();
		};
	}, [items, updateScrollState]);

	const scrollByPage = (dir: 1 | -1) => {
		const el = chipsRef.current;
		el?.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
	};

	const isActive = (id: string) => (props.mode === 'toggle' ? props.selectedIds.has(id) : props.activeId === id);
	const onPick = (id: string) => (props.mode === 'toggle' ? props.onToggle(id) : props.onSelect(id));

	return (
		<div className='r-lgpick'>
			<div className='r-lgpick-scroller' data-fade-left={canScrollLeft || undefined} data-fade-right={canScrollRight || undefined}>
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
					role={props.mode === 'toggle' ? 'group' : 'tablist'}
					aria-label={ariaLabel}
					ref={chipsRef}
				>
					{items.map((it) => {
						const active = isActive(it.id);
						return (
							<button
								key={it.id}
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
						);
					})}
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
		</div>
	);
};
