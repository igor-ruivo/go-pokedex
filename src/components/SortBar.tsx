import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
	/** For lists where only one direction makes sense: no asc / desc toggle, and no arrow on the button. */
	fixedDirection?: boolean;
}

/**
 * "Order by" control — a button that opens a small panel of sort keys plus an
 * ascending / descending toggle. Sits next to <FilterBar />.
 */
export const SortBar = ({ options, sortKey, dir, onChange, fixedDirection = false }: SortBarProps) => {
	const { t } = useTranslation(['components']);
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const active = options.find((o) => o.key === sortKey) ?? options[0];

	const pick = (o: SortOption) => {
		if (o.key === sortKey) {
			if (!fixedDirection) onChange(o.key, dir === 'asc' ? 'desc' : 'asc');
		} else onChange(o.key, o.defaultDir ?? 'asc');
	};

	return (
		<div className='r-sort' ref={rootRef}>
			<button
				type='button'
				className='r-filter-btn r-sort-btn'
				data-on={sortKey !== options[0].key || dir !== (options[0].defaultDir ?? 'asc')}
				aria-expanded={open}
				aria-haspopup='dialog'
				onClick={() => setOpen((o) => !o)}
			>
				<svg
					className='r-filter-ic'
					viewBox='0 0 24 24'
					width='16'
					height='16'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
					aria-hidden='true'
				>
					<path d='M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4' />
				</svg>
				{active.label}
				{!fixedDirection && (
					<span className='r-sort-dir' aria-hidden='true'>
						{dir === 'asc' ? '↑' : '↓'}
					</span>
				)}
			</button>

			{open && (
				<div className='r-filter-panel r-sort-panel' role='dialog' aria-label={t('components:sortBar.dialogAriaLabel')}>
					<div className='r-filter-sec-h'>
						<span>{t('components:sortBar.sectionLabel')}</span>
						{!fixedDirection && (
							<div className='r-sort-dirseg'>
								<button
									type='button'
									data-active={dir === 'asc' ? '' : undefined}
									onClick={() => onChange(sortKey, 'asc')}
								>
									↑ {t('components:sortBar.asc')}
								</button>
								<button
									type='button'
									data-active={dir === 'desc' ? '' : undefined}
									onClick={() => onChange(sortKey, 'desc')}
								>
									↓ {t('components:sortBar.desc')}
								</button>
							</div>
						)}
					</div>
					<div className='r-sort-opts' role='listbox'>
						{options.map((o) => {
							const selected = o.key === sortKey;
							return (
								<button
									key={o.key}
									type='button'
									role='option'
									aria-selected={selected}
									className='r-sort-opt'
									data-active={selected}
									onClick={() => pick(o)}
								>
									<span>{o.label}</span>
									{selected && (
										<svg
											viewBox='0 0 24 24'
											width='16'
											height='16'
											fill='none'
											stroke='currentColor'
											strokeWidth='2.5'
											strokeLinecap='round'
											strokeLinejoin='round'
											aria-hidden='true'
										>
											<path d='M5 12.5l4.5 4.5L19 7.5' />
										</svg>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
