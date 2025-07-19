import './SearchableDropdown.scss';

import type { AutocompleteOwnerState, AutocompleteRenderOptionState } from '@mui/material';
import { Autocomplete, TextField } from '@mui/material';
import type { HTMLAttributes, ReactNode } from 'react';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { List } from 'react-virtualized';

import { useLanguage } from '../contexts/language-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import translator, { TranslatorKeys } from '../utils/Translator';
import type { EntryType } from './Template/Navbar';

interface ISearchableDropdownProps {
	searchOpen: boolean;
	setSearchOpen: (_: React.SetStateAction<boolean>) => void;
	options: Array<EntryType>;
	isLoading: boolean;
	onSelection: (selectedEntry: EntryType | null) => void;
	renderOption?: (
		props: HTMLAttributes<HTMLLIElement> & { key: React.Key },
		option: EntryType,
		state: AutocompleteRenderOptionState,
		ownerState: AutocompleteOwnerState<EntryType, false, false, true, 'div'>
	) => ReactNode;
}

interface ListboxComponentProps {
	children: Array<React.ReactElement>;
	role?: string;
	[x: string]: unknown;
}

const ListboxComponent = forwardRef<HTMLDivElement, ListboxComponentProps>(function ListboxComponent(props, ref) {
	const { children, role, ...other } = props;
	const itemCount = useMemo(() => (Array.isArray(children) ? children.length : 0), [children]);
	const itemSize = 41.6;
	const autoCompleteRef = useRef<HTMLDivElement | null>(null);

	// Try to get the width from the parent ref if possible
	useEffect(() => {
		if (ref && typeof ref === 'object' && ref !== null && 'current' in ref) {
			autoCompleteRef.current = (ref as React.RefObject<HTMLDivElement>).current;
		}
	}, [ref]);

	return (
		<div ref={ref}>
			<div {...other}>
				<List
					height={Math.min(6, itemCount) * itemSize}
					width={autoCompleteRef.current?.clientWidth ?? 300}
					rowHeight={itemSize}
					overscanCount={5}
					rowCount={itemCount}
					rowRenderer={(rowProps) => {
						if (typeof rowProps === 'object' && rowProps !== null && 'index' in rowProps && 'style' in rowProps) {
							const idx = (rowProps as { index: number }).index;
							const child: React.ReactElement | null =
								Array.isArray(children) && idx >= 0 && idx < children.length
									? (children[idx] as React.ReactElement)
									: null;
							const style = (rowProps as { style: React.CSSProperties }).style;

							// Try to use child's key if available, otherwise fallback to idx
							const key = child?.key ?? idx;

							return (
								<div style={style} key={key}>
									{child}
								</div>
							);
						}
						return <div />;
					}}
					role={role}
				/>
			</div>
		</div>
	);
});

const SearchableDropdown = ({
	options,
	isLoading,
	onSelection,
	renderOption,
	searchOpen,
	setSearchOpen,
}: ISearchableDropdownProps) => {
	const { inputText, updateInputText } = useNavbarSearchInput();
	const [debouncingInputText, setDebouncingInputText] = useState(inputText);
	const { currentLanguage } = useLanguage();
	const autoCompleteRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!debouncingInputText) {
			updateInputText('');
			return;
		}

		const timeoutId = setTimeout(() => {
			updateInputText(debouncingInputText);
		}, 500);
		return () => clearTimeout(timeoutId);
	}, [debouncingInputText, updateInputText]);

	return (
		<Autocomplete
			ref={autoCompleteRef}
			size='small'
			classes={{
				root: 'autoComplete-root',
				option: 'autoComplete-option',
			}}
			open={searchOpen}
			onOpen={() => setSearchOpen(true)}
			onClose={() => setSearchOpen(false)}
			className='auto_complete_input'
			inputValue={debouncingInputText}
			onInputChange={(_e, newInputValue) => setDebouncingInputText(newInputValue)}
			onChange={(_event, value, reason, _details) => {
				if (reason === 'selectOption' && value !== null && value !== undefined) {
					onSelection(value as EntryType);
				}
			}}
			isOptionEqualToValue={(option, value) =>
				option.label?.toLocaleLowerCase().includes(value.label?.toLocaleLowerCase() ?? '') ?? false
			}
			options={options}
			autoComplete
			freeSolo
			autoHighlight
			loading={isLoading}
			loadingText={translator(TranslatorKeys.Loading, currentLanguage)}
			clearOnEscape
			selectOnFocus
			getOptionKey={(option) => (option as EntryType).value}
			renderInput={(params) => {
				const { InputLabelProps, ...restParams } = params;
				const filteredInputLabelProps = { ...InputLabelProps };
				if (filteredInputLabelProps && typeof filteredInputLabelProps.className === 'undefined') {
					delete filteredInputLabelProps.className;
				}
				return (
					<TextField
						{...restParams}
						slotProps={{
							inputLabel: filteredInputLabelProps,
						}}
						className='auto_complete_input'
						label={translator(TranslatorKeys.Search, currentLanguage)}
						placeholder={translator(TranslatorKeys.Name, currentLanguage)}
						size='small'
					/>
				);
			}}
			// Fix for strict typing: always provide a function, never undefined
			renderOption={(props, option, state, ownerState) =>
				typeof renderOption === 'function' ? (
					renderOption(props, option, state, ownerState)
				) : (
					<li {...props}>{option.label}</li>
				)
			}
			slotProps={{
				listbox: { component: ListboxComponent },
			}}
		/>
	);
};

export default SearchableDropdown;
