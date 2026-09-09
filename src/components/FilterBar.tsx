import { useEffect, useRef, useState } from 'react';

import { TYPE_LABEL, typeVar } from '../lib/types';

interface FilterBarProps {
	/** All selectable type keys (lowercase). */
	types: ReadonlyArray<string>;
	/** Currently-selected type keys. */
	selected: ReadonlyArray<string>;
	onChange: (next: Array<string>) => void;
	/** Raid mode: exactly one type (it's a single "best <type> attackers" list). */
	single?: boolean;
}

const MAX_MULTI = 2;

/**
 * Compact filter control: a button that opens a panel of toggles. Built to grow —
 * more sections (region, generation, …) can slot into the same panel later.
 * Multi mode caps at two types and always matches BOTH.
 */
export const FilterBar = ({ types, selected, onChange, single = false }: FilterBarProps) => {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const cap = single ? 1 : MAX_MULTI;
	const toggle = (t: string) => {
		if (selected.includes(t)) {
			onChange(selected.filter((x) => x !== t));
			return;
		}
		if (single) {
			onChange([t]);
			setOpen(false);
			return;
		}
		// keep the two most-recent picks
		onChange([...selected, t].slice(-cap));
	};

	const count = selected.length;
	const atCap = !single && count >= cap;

	return (
		<div className='r-filter' ref={rootRef}>
			<div className='r-filter-row'>
				<button
					type='button'
					className='r-filter-btn'
					data-on={count > 0}
					aria-expanded={open}
					onClick={() => setOpen((o) => !o)}
				>
					<span className='r-filter-ic' aria-hidden='true'>
						☰
					</span>
					Filter
					{count > 0 && <span className='r-filter-count'>{count}</span>}
				</button>

				{selected.map((t) => (
					<button
						key={t}
						type='button'
						className='r-filter-chip'
						style={{ ['--tc' as string]: typeVar(t) }}
						onClick={() => toggle(t)}
					>
						{TYPE_LABEL[t] ?? t}
						<span aria-hidden='true'>×</span>
					</button>
				))}

				{count > 0 && (
					<button type='button' className='r-filter-clear' onClick={() => onChange([])}>
						Clear
					</button>
				)}
			</div>

			{open && (
				<div className='r-filter-panel' role='dialog' aria-label='Filters'>
					<div className='r-filter-sec-h'>
						<span>Type</span>
						<span className='r-filter-hint'>{single ? 'pick one' : `pick up to ${MAX_MULTI} · matches both`}</span>
					</div>
					<div className='r-filter-types'>
						{types.map((t) => {
							const on = selected.includes(t);
							return (
								<button
									key={t}
									type='button'
									className='r-type-chip'
									data-active={on}
									disabled={atCap && !on}
									style={{ ['--tc' as string]: typeVar(t) }}
									onClick={() => toggle(t)}
								>
									{TYPE_LABEL[t] ?? t}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
