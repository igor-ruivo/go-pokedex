import { useEffect, useState } from "react";
import "./SearchableDropdown.scss";
import Select from 'react-select';
import { useNavbarSearchInput } from "../contexts/navbar-search-context";

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

    return <Select
        className="basic-single"
        classNamePrefix="select"
        classNames={{
            control: (state) => state.isFocused ? "dropdown-control-focused" : "dropdown-control-blurred",
            option: (state) => state.isFocused ? "dropdown-option-focused" :  "dropdown-option-blurred",
            placeholder: _ => "dropdown-placeholder",
            clearIndicator: _ => "dropdown-clear-indicator",
            dropdownIndicator: _ => "dropdown-indicator",
            singleValue: _ => "dropdown-singleValue",
            input: _ => "dropdown-input",
            noOptionsMessage: _ => "dropdown-noOptions",
            menuList: _ => "dropdown-menuList",
            loadingIndicator: _ => "dropdown-loading"
        }}
        isDisabled={isLoading}
        isLoading={isLoading}
        isClearable={true}
        isRtl={false}
        isSearchable={true}
        blurInputOnSelect
        name="pokemon"
        options={options}
        inputValue={debouncingInputText}
        onInputChange={(newValue, actionMeta) => (actionMeta.action === "input-change" || actionMeta.action === "set-value") && setDebouncingInputText(newValue)}
        onChange={newValue => {
            if (!newValue?.value) {
                return;
            }

            updateInputText(newValue.label)
            onSelection(newValue)}
        }
    />
}

export default SearchableDropdown;