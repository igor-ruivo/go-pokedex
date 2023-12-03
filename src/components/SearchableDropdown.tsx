import { useEffect, useState } from "react";
import "./SearchableDropdown.scss";
import { useNavbarSearchInput } from "../contexts/navbar-search-context";
import { Autocomplete, TextField } from "@mui/material";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import { EntryType } from "./Template/Navbar";

interface ISearchableDropdownProps {
    options: EntryType[];
    isLoading: boolean;
    onSelection: (selectedEntry: any) => void;
}

const SearchableDropdown = ({options, isLoading, onSelection}: ISearchableDropdownProps) => {
    const {inputText, updateInputText} = useNavbarSearchInput();
    const [debouncingInputText, setDebouncingInputText] = useState(inputText);
    const {currentLanguage} = useLanguage();

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
        size="small"
        classes={{
            root: 'autoComplete-root',
            option: 'autoComplete-option'
        }}
        className="auto_complete_input"
        inputValue={debouncingInputText}
        onInputChange={(_e, newInputValue, _reason) => setDebouncingInputText(newInputValue)}
        onChange={(_event, value, reason, _details) => reason === "selectOption" && onSelection(value)}
        isOptionEqualToValue={(option, value) => option.label.toLowerCase().includes(value.label.toLocaleLowerCase())}
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
    />
}

export default SearchableDropdown;