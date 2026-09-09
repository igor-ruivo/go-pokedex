import { useRef } from 'react';

export interface IVs {
	atk: number;
	def: number;
	hp: number;
}

const clamp = (n: number) => Math.max(0, Math.min(15, n));

const Bar = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
	const trackRef = useRef<HTMLDivElement>(null);

	const setFromClientX = (clientX: number) => {
		const el = trackRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const raw = ((clientX - rect.left) / rect.width) * 15;
		// clicking anywhere inside a segment fills that segment; the sliver before the
		// first one — or dragging past the left edge — sets 0.
		onChange(clamp(raw < 0.35 ? 0 : Math.floor(raw) + 1));
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
					(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
					setFromClientX(e.clientX);
				}}
				onPointerMove={(e) => {
					if (e.buttons === 1) setFromClientX(e.clientX);
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
