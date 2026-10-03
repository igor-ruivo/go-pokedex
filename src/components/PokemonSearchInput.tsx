import type { Ref } from 'react';

import { selectAllOnTouchFocus } from '../lib/select-on-touch';

export const PokemonSearchInput = ({
	value,
	onChange,
	placeholder,
	clearAriaLabel,
	onClear,
	inputRef,
	onFocus,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	clearAriaLabel: string;
	onClear: () => void;
	inputRef?: Ref<HTMLInputElement>;
	onFocus?: () => void;
}) => (
	<div className='r-search'>
		<svg className='r-search-icon' viewBox='0 0 24 24' aria-hidden='true'>
			<circle cx='11' cy='11' r='7' />
			<line x1='21' y1='21' x2='16.2' y2='16.2' />
		</svg>
		<input
			ref={inputRef}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onFocus={(event) => {
				selectAllOnTouchFocus(event);
				onFocus?.();
			}}
			placeholder={placeholder}
			aria-label={placeholder}
			enterKeyHint='search'
			autoComplete='off'
		/>
		{value && (
			<button type='button' className='r-search-clear' aria-label={clearAriaLabel} onClick={onClear}>
				×
			</button>
		)}
	</div>
);
