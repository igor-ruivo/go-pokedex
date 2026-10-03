import type { ReactNode } from 'react';

import { ListBar } from './ListBar';
import { PokemonSearchInput } from './PokemonSearchInput';

/**
 * The header of a searchable list: the search box on the full width, and under it the `ListBar` — the count with its
 * trailing rule, lined up with the sort chip (when there is one) on the right.
 */
export const SearchListBar = ({
	value,
	onChange,
	placeholder,
	clearAriaLabel,
	onClear,
	label,
	children,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	clearAriaLabel: string;
	onClear: () => void;
	/** The count (or status) text of the row. */
	label: ReactNode;
	/** The sort chip, shown on the right of the rule. */
	children?: ReactNode;
}) => (
	<div className='r-searchlist'>
		<PokemonSearchInput
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			clearAriaLabel={clearAriaLabel}
			onClear={onClear}
		/>
		<ListBar label={label}>{children}</ListBar>
	</div>
);
