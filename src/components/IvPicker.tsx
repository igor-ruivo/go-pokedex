import { useRef } from 'react';

export interface IVs {
	atk: number;
	def: number;
	hp: number;
}

const clamp = (n: number) => Math.max(0, Math.min(15, n));

// px of finger travel before we decide whether this gesture is a horizontal
// slider drag or a vertical page scroll.
const AXIS_LOCK_THRESHOLD = 8;
// after any scroll, ignore taps on the track for this long so the tap that
// stops a momentum scroll can't nudge an IV bar by mistake.
const SCROLL_GUARD_MS = 140;

// One shared listener: records when the page (or any scroll container) last
// scrolled. Capture phase because scroll events don't bubble.
let lastScrollAt = -Infinity;
if (typeof window !== 'undefined') {
	window.addEventListener(
		'scroll',
		() => {
			lastScrollAt = performance.now();
		},
		{ capture: true, passive: true }
	);
}
const scrolledRecently = () => performance.now() - lastScrollAt < SCROLL_GUARD_MS;

const Bar = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
	const trackRef = useRef<HTMLDivElement>(null);
	// 'none' until we've moved far enough to commit; 'x' = dragging the slider,
	// 'y' = the user is scrolling and this gesture must not touch the value.
	const axis = useRef<'none' | 'x' | 'y'>('none');
	const start = useRef<{ x: number; y: number } | null>(null);
	// these survive pointerup so the trailing synthetic click can be told apart
	// from a real tap. Both cleared on the next pointerdown.
	const gestureMovedValue = useRef(false); // an 'x' drag already applied a value
	const gestureWasScroll = useRef(false); // gesture resolved to a vertical scroll

	const setFromClientX = (clientX: number) => {
		const el = trackRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const raw = ((clientX - rect.left) / rect.width) * 15;
		// clicking anywhere inside a segment fills that segment; the sliver before the
		// first one — or dragging past the left edge — sets 0.
		onChange(clamp(raw < 0.35 ? 0 : Math.floor(raw) + 1));
	};

	const endGesture = () => {
		start.current = null;
		axis.current = 'none';
	};

	const maxed = value === 15;

	return (
		<div className='r-iv-row'>
			<div className='r-iv-head'>
				<span>{label}</span>
				<b data-max={maxed}>{value}</b>
			</div>
			<div
				ref={trackRef}
				className='r-iv-track'
				data-max={maxed}
				role='slider'
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={15}
				aria-valuenow={value}
				tabIndex={0}
				onPointerDown={(e) => {
					start.current = { x: e.clientX, y: e.clientY };
					axis.current = 'none';
					gestureMovedValue.current = false;
					gestureWasScroll.current = false;
					// a tap that lands while the page is still settling from a scroll
					// isn't meant for the slider — swallow the whole gesture.
					if (scrolledRecently()) {
						axis.current = 'y';
						gestureWasScroll.current = true;
					}
					// mouse has no scroll ambiguity — respond on press like before.
					else if (e.pointerType === 'mouse') {
						axis.current = 'x';
						setFromClientX(e.clientX);
					}
				}}
				onPointerMove={(e) => {
					if (e.buttons !== 1 || !start.current) return;

					if (axis.current === 'none') {
						const dx = e.clientX - start.current.x;
						const dy = e.clientY - start.current.y;
						if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return;
						// bias ties toward 'y' so an almost-vertical swipe still scrolls
						axis.current = Math.abs(dx) > Math.abs(dy) + 2 ? 'x' : 'y';
						if (axis.current === 'x') {
							// keep the whole horizontal drag on this element even if the
							// finger strays vertically off the track
							(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
						} else {
							gestureWasScroll.current = true;
						}
					}

					if (axis.current !== 'x') return; // 'y' → let the page scroll, never touch the value
					// stop the browser from also scrolling on a diagonal drag
					e.preventDefault();
					gestureMovedValue.current = true;
					setFromClientX(e.clientX);
				}}
				onPointerUp={endGesture}
				onPointerCancel={endGesture}
				onClick={(e) => {
					// a drag already set the value on move; a scroll gesture must never
					// set it — both leave a trailing synthetic click to ignore here.
					if (gestureMovedValue.current || gestureWasScroll.current || scrolledRecently()) return;
					// genuine tap-to-set
					setFromClientX(e.clientX);
				}}
				onKeyDown={(e) => {
					if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
						e.preventDefault();
						onChange(clamp(value - 1));
					} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
						e.preventDefault();
						onChange(clamp(value + 1));
					} else if (e.key === 'Home') {
						onChange(0);
					} else if (e.key === 'End') {
						onChange(15);
					}
				}}
			>
				{Array.from({ length: 15 }, (_, i) => (
					<span key={i} className='r-iv-cell' data-on={i < value} data-edge={i === value - 1} />
				))}
			</div>
		</div>
	);
};

const DEFAULT_PRESETS: Array<[string, IVs]> = [
	['0 / 0 / 0', { atk: 0, def: 0, hp: 0 }],
	['Hundo', { atk: 15, def: 15, hp: 15 }],
];

export const IvPicker = ({
	value,
	onChange,
	presets = DEFAULT_PRESETS,
}: {
	value: IVs;
	onChange: (next: IVs) => void;
	presets?: Array<[string, IVs]>;
}) => {
	return (
		<div className='r-iv'>
			<Bar label='ATTACK' value={value.atk} onChange={(atk) => onChange({ ...value, atk })} />
			<Bar label='DEFENSE' value={value.def} onChange={(def) => onChange({ ...value, def })} />
			<Bar label='HP' value={value.hp} onChange={(hp) => onChange({ ...value, hp })} />
			<div className='r-iv-presets'>
				{presets.map(([label, iv]) => (
					<button key={label} type='button' className='r-chip' onClick={() => onChange(iv)}>
						{label}
					</button>
				))}
			</div>
		</div>
	);
};
