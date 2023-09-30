import { useEffect, useState } from "react";
import "./SearchableDropdown.scss";
import { useNavbarSearchInput } from "../contexts/navbar-search-context";
import { Autocomplete, TextField } from "@mui/material";

interface ISearchableDropdownProps {
    options: any[];
    isLoading: boolean;
    onSelection: (selectedEntry: any) => void;
}

const SearchableDropdown = ({options, isLoading, onSelection}: ISearchableDropdownProps) => {
    const {inputText, updateInputText} = useNavbarSearchInput();
    const [debouncingInputText, setDebouncingInputText] = useState(inputText);

    useEffect(() => {
        if (!debouncingInputText) {
            updateInputText("");
            return;
        }

        const timeoutId = setTimeout(() => {
            updateInputText(debouncingInputText);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [debouncingInputText]);
    
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
        loadingText="Loading pokémons..."
        clearOnEscape
        renderInput={(params) => (
            <TextField {...params} className="auto_complete_input" label="Search…" placeholder="Pokémon name" />
        )} 
    />
}

export default SearchableDropdown;