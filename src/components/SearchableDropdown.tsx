import { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableDropdown.scss";
import { useNavbarSearchInput } from "../contexts/navbar-search-context";
import { Autocomplete, TextField } from "@mui/material";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import { EntryType } from "./Template/Navbar";
import React from "react";
import { List } from "react-virtualized";

interface ISearchableDropdownProps {
    searchOpen: boolean;
    setSearchOpen: (_: React.SetStateAction<boolean>) => void;
    options: EntryType[];
    isLoading: boolean;
    onSelection: (selectedEntry: any) => void;
    renderOption?: (props: any, option: EntryType) => any;
}

const SearchableDropdown = ({options, isLoading, onSelection, renderOption, searchOpen, setSearchOpen}: ISearchableDropdownProps) => {
    const {inputText, updateInputText} = useNavbarSearchInput();
    const [debouncingInputText, setDebouncingInputText] = useState(inputText);
    const {currentLanguage} = useLanguage();
    const autoCompleteRef = useRef<HTMLDivElement>(null);

    const ListboxComponent = React.forwardRef((props: any, ref: any) => {
        const { children, role, ...other } = props;
        const itemCount = useMemo(() => Array.isArray(children) ? children.length : 0, [children]);
        const itemSize = 41.6;
    
        return (
            <div ref={ref}>
                <div {...other}>
                    <List
                        height={Math.min(6, itemCount) * itemSize}
                        width={autoCompleteRef.current?.clientWidth ?? 300}
                        rowHeight={itemSize}
                        overscanCount={5}
                        rowCount={itemCount}
                        rowRenderer={props => {
                            return React.cloneElement(children[props.index], {
                                style: props.style
                            });
                        }}
                        role={role}
                    />
                </div>
            </div>
        );
    });

    useEffect(() => {
        if (!debouncingInputText) {
            updateInputText("");
            return;
        }

        const timeoutId = setTimeout(() => {
            updateInputText(debouncingInputText);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [debouncingInputText, updateInputText]);
    
    return <Autocomplete
        ref={autoCompleteRef}
        size="small"
        classes={{
            root: 'autoComplete-root',
            option: 'autoComplete-option'
        }}
        open={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
        className="auto_complete_input"
        inputValue={debouncingInputText}
        onInputChange={(_e, newInputValue, _reason) => setDebouncingInputText(newInputValue)}
        onChange={(_event, value, reason, _details) => reason === "selectOption" && onSelection(value)}
        isOptionEqualToValue={(option, value) => option.label?.toLocaleLowerCase().includes(value.label?.toLocaleLowerCase() ?? "") ?? false}
        options={options}
        autoComplete
        freeSolo
        autoHighlight
        loading={isLoading}
        loadingText={translator(TranslatorKeys.Loading, currentLanguage)}
        clearOnEscape
        selectOnFocus
        getOptionKey={(option) => (option as EntryType).value}
        renderInput={(params) => (
            <TextField {...params} className="auto_complete_input" label={translator(TranslatorKeys.Search, currentLanguage)} placeholder={translator(TranslatorKeys.Name, currentLanguage)} />
        )}
        renderOption={renderOption}
        ListboxComponent={ListboxComponent}
    />
}

export default SearchableDropdown;