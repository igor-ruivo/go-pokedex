import { useState } from 'react';

import { useDismiss } from '../hooks/useDismiss';

export type SortDir = 'asc' | 'desc';

export interface SortOption {
	key: string;
	label: string;
	/** Direction applied when this key is first picked. */
	defaultDir?: SortDir;
}

interface SortBarProps {
	options: ReadonlyArray<SortOption>;
	sortKey: string;
	dir: SortDir;
	onChange: (key: string, dir: SortDir) => void;
}

/**
 * "Order by" control — a button that opens a small panel of sort keys plus an
 * ascending / descending toggle. Sits next to <FilterBar />.
 */
export const SortBar = ({ options, sortKey, dir, onChange }: SortBarProps) => {
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const active = options.find((o) => o.key === sortKey) ?? options[0];

	const pick = (o: SortOption) => {
		if (o.key === sortKey) onChange(o.key, dir === 'asc' ? 'desc' : 'asc');
		else onChange(o.key, o.defaultDir ?? 'asc');
	};

	return (
		<div className='r-sort' ref={rootRef}>
			<button
				type='button'
				className='r-filter-btn r-sort-btn'
				data-on={sortKey !== options[0].key || dir !== (options[0].defaultDir ?? 'asc')}
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				<span className='r-filter-ic' aria-hidden='true'>
					↕
				</span>
				{active.label}
				<span className='r-sort-dir' aria-hidden='true'>
					{dir === 'asc' ? '↑' : '↓'}
				</span>
			</button>

			{open && (
				<div className='r-filter-panel r-sort-panel' role='dialog' aria-label='Order by'>
					<div className='r-filter-sec-h'>
						<span>Order by</span>
						<div className='r-sort-dirseg'>
							<button
								type='button'
								data-active={dir === 'asc' ? '' : undefined}
								onClick={() => onChange(sortKey, 'asc')}
							>
								↑ Asc
							</button>
							<button
								type='button'
								data-active={dir === 'desc' ? '' : undefined}
								onClick={() => onChange(sortKey, 'desc')}
							>
								↓ Desc
							</button>
						</div>
					</div>
					<div className='r-sort-opts'>
						{options.map((o) => (
							<button
								key={o.key}
								type='button'
								className='r-type-chip'
								data-active={o.key === sortKey}
								onClick={() => pick(o)}
							>
								{o.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
