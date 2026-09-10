import { useRef } from 'react';

export interface IVs {
	atk: number;
	def: number;
	hp: number;
}

const clamp = (n: number) => Math.max(0, Math.min(15, n));

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
	// true when this press is really a tap meant to stop a momentum scroll.
	const ignore = useRef(false);

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
		ignore.current = false;
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
					// a tap landing while the page is still gliding from a scroll is
					// meant to stop that scroll, not to set an IV.
					ignore.current = e.pointerType !== 'mouse' && scrolledRecently();
					if (ignore.current) return;
					// the track owns this gesture from here on — `touch-action: none`
					// (see CSS) means the page never scrolls while a bar is being
					// dragged, even diagonally. Capture so the drag keeps tracking if
					// the finger strays off the 15px-tall strip.
					(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
					setFromClientX(e.clientX);
				}}
				onPointerMove={(e) => {
					if (ignore.current || e.buttons !== 1) return;
					e.preventDefault();
					setFromClientX(e.clientX);
				}}
				onPointerUp={endGesture}
				onPointerCancel={endGesture}
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
