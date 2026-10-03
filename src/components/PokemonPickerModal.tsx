import { type ReactNode, type RefObject, useEffect } from 'react';

import { PokemonSearchInput } from './PokemonSearchInput';

export const PokemonPickerModal = ({
	title,
	closeLabel,
	onClose,
	query,
	onQueryChange,
	placeholder,
	clearAriaLabel,
	onClear,
	inputRef,
	dialogRef,
	tools,
	children,
}: {
	title: string;
	closeLabel: string;
	onClose: () => void;
	query: string;
	onQueryChange: (value: string) => void;
	placeholder: string;
	clearAriaLabel: string;
	onClear: () => void;
	inputRef?: RefObject<HTMLInputElement | null>;
	dialogRef?: RefObject<HTMLDivElement | null>;
	tools?: ReactNode;
	children: ReactNode;
}) => {
	useEffect(() => {
		inputRef?.current?.focus();
	}, [inputRef]);

	return (
		<div className='r-tm-picker-backdrop'>
			<div className='r-tm-picker' role='dialog' aria-modal='true' aria-label={title} ref={dialogRef}>
				<div className='r-tm-picker-head'>
					<h2>{title}</h2>
					<button type='button' className='r-icon-btn' aria-label={closeLabel} onClick={onClose}>
						×
					</button>
				</div>
				<PokemonSearchInput
					inputRef={inputRef}
					value={query}
					placeholder={placeholder}
					clearAriaLabel={clearAriaLabel}
					onChange={onQueryChange}
					onClear={onClear}
				/>
				{tools && <div className='r-tm-picker-tools'>{tools}</div>}
				{children}
			</div>
		</div>
	);
};
