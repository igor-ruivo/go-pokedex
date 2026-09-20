import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../hooks/useDismiss';
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
	const { t } = useTranslation(['components']);
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

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
					{t('components:filterBar.button')}
					{count > 0 && <span className='r-filter-count'>{count}</span>}
				</button>

				{selected.map((tp) => (
					<button
						key={tp}
						type='button'
						className='r-filter-chip'
						style={{ ['--tc' as string]: typeVar(tp) }}
						onClick={() => toggle(tp)}
					>
						{TYPE_LABEL[tp] ?? tp}
						<span aria-hidden='true'>×</span>
					</button>
				))}

				{count > 0 && (
					<button type='button' className='r-filter-clear' onClick={() => onChange([])}>
						{t('components:filterBar.clear')}
					</button>
				)}
			</div>

			{open && (
				<div className='r-filter-panel' role='dialog' aria-label={t('components:filterBar.dialogAriaLabel')}>
					<div className='r-filter-sec-h'>
						<span>{t('components:filterBar.typeSectionLabel')}</span>
						<span className='r-filter-hint'>
							{single
								? t('components:filterBar.pickOneHint')
								: t('components:filterBar.pickUpToHint', { max: MAX_MULTI })}
						</span>
					</div>
					<div className='r-filter-types'>
						{types.map((t) => {
							const on = selected.includes(t);
							return (
								<button
									key={t}
									type='button'
									className='r-eff-t r-tc-pchip'
									data-active={on ? '' : undefined}
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
