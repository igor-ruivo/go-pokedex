import "./ControlPanel.scss";
import {
    Autocomplete,
    AutocompleteChangeReason,
    FormControlLabel,
    FormGroup,
    IconButton,
    Stack,
    Switch,
    TextField
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import ThemeContext from "../contexts/theme-context";
import { Input } from '@mui/base/Input';
import { Select, selectClasses } from '@mui/base/Select';
import { Option, optionClasses } from '@mui/base/Option';
import React from "react";
import { collapsedStorageKey, familyTreeStorageKey, inputTextStorageKey, listTypeStorageKey } from "../utils/Resources";
import ControlPanelContext, { ListType } from "../contexts/control-panel-context";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PokemonContext from "../contexts/pokemon-context";

const cyan = {
    50: '#E9F8FC',
    100: '#BDEBF4',
    200: '#99D8E5',
    300: '#66BACC',
    400: '#1F94AD',
    500: '#0D5463',
    600: '#094855',
    700: '#063C47',
    800: '#043039',
    900: '#022127',
  };
  
  const grey = {
    50: '#f6f8fa',
    100: '#eaeef2',
    200: '#d0d7de',
    300: '#afb8c1',
    400: '#8c959f',
    500: '#6e7781',
    600: '#57606a',
    700: '#424a53',
    800: '#32383f',
    900: '#24292f',
  };

const DropdownStyles = ({isDarkMode}: IMuiStyleProps) => (
    <style>
        {`
            .CustomSelect {
                font-family: IBM Plex Sans, sans-serif;
                font-size: 0.875rem;
                box-sizing: border-box;
                min-width: 150px;
                padding: 8px 12px;
                border-radius: 8px;
                text-align: left;
                line-height: 1.5;
                background: ${isDarkMode ? grey[900] : '#fff'};
                border: 1px solid ${isDarkMode ? grey[700] : grey[200]};
                color: ${isDarkMode ? grey[300] : grey[900]};
                box-shadow: 0px 4px 6px ${
                    isDarkMode ? 'rgba(0,0,0, 0.50)' : 'rgba(0,0,0, 0.05)'
                };
        
        
                transition-property: all;
                transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                transition-duration: 120ms;
        
                &:hover {
                    background: ${isDarkMode ? grey[800] : grey[50]};
                    border-color: ${isDarkMode ? grey[600] : grey[300]};
                }
        
                &.${selectClasses.focusVisible} {
                    border-color: ${cyan[400]};
                    outline: 3px solid ${isDarkMode ? cyan[500] : cyan[200]};
                }
        
                &.${selectClasses.expanded} {
                    &::after {
                    content: '▴';
                    }
                }
        
                &::after {
                    content: '▾';
                    float: right;
                }
            }

            .CustomSelect-listbox {
                font-family: IBM Plex Sans, sans-serif;
                font-size: 0.875rem;
                box-sizing: border-box;
                padding: 6px;
                margin: 12px 0;
                min-width: 150px;
                border-radius: 12px;
                overflow: auto;
                outline: 0px;
                background: ${isDarkMode ? grey[900] : '#fff'};
                border: 1px solid ${isDarkMode ? grey[700] : grey[200]};
                color: ${isDarkMode ? grey[300] : grey[900]};
                box-shadow: 0px 4px 6px ${
                    isDarkMode ? 'rgba(0,0,0, 0.50)' : 'rgba(0,0,0, 0.05)'
                };
            }

            .CustomSelect-popper {
                z-index: 2;
            }

            .CustomSelect-option {
                list-style: none;
                padding: 8px;
                border-radius: 8px;
                cursor: default;
        
                &:last-of-type {
                    border-bottom: none;
                }
        
                &.${optionClasses.selected} {
                    background-color: ${isDarkMode ? cyan[700] : cyan[100]};
                    color: ${isDarkMode ? cyan[50] : cyan[900]};
                }
        
                &.${optionClasses.highlighted} {
                    background-color: ${isDarkMode ? grey[800] : grey[100]};
                    color: ${isDarkMode ? grey[300] : grey[900]};
                }
        
                &.${optionClasses.highlighted}.${optionClasses.selected} {
                    background-color: ${isDarkMode ? cyan[700] : cyan[100]};
                    color: ${isDarkMode ? cyan[50] : cyan[900]};
                }
        
                &.${optionClasses.disabled} {
                    color: ${isDarkMode ? grey[700] : grey[400]};
                }
        
                &:hover:not(.${optionClasses.disabled}) {
                    background-color: ${isDarkMode ? grey[800] : grey[100]};
                    color: ${isDarkMode ? grey[300] : grey[900]};
                }
            }
        `}
    </style>
);

interface IMuiStyleProps {
    isDarkMode: boolean
}

const InputStyles = ({isDarkMode}: IMuiStyleProps) => (
    <style>
        {`
            .CustomInputIntroduction {
                min-width: 150px;
                width: 150px;
                font-family: IBM Plex Sans, sans-serif;
                font-size: 0.875rem;
                font-weight: 400;
                line-height: 1.5;
                padding: 8px 12px;
                border-radius: 8px;
                color: ${isDarkMode ? grey[300] : grey[900]};
                background: ${isDarkMode ? grey[900] : '#fff'};
                border: 1px solid ${isDarkMode ? grey[700] : grey[200]};
                box-shadow: 0px 2px 24px ${isDarkMode ? grey[800] : grey[100]};
                
                &:hover {
                    border-color: ${grey[400]};
                }

                &:focus {
                    border-color: ${grey[400]};
                    box-shadow: 0 0 0 3px ${isDarkMode ? grey[600] : grey[200]};
                }

                &:focus-visible {
                    outline: 0;
                }
            }
        `}
    </style>
);

const ControlPanel = () => {
    const {listType, setListType, inputText, setInputText, showFamilyTree, setShowFamilyTree, collapsed, setCollapsed} = useContext(ControlPanelContext);
    const { theme, setTheme } = useContext(ThemeContext);
    const { gamemasterPokemon } = useContext(PokemonContext);
    const [ debouncingInputText, setDebouncingInputText ] = useState(sessionStorage.getItem(inputTextStorageKey) ?? "");
    const expandCollapseDivRef = useRef<HTMLDivElement>(null);
    const isCurrentDark = theme === "dark";

    const handleThemeChange = () => {
        setTheme(isCurrentDark ? "light" : "dark");
        localStorage.setItem('default-theme', isCurrentDark ? "light" : "dark");
    };

    useEffect(() => {
        if (!debouncingInputText) {
            setInputText("");
            sessionStorage.setItem(inputTextStorageKey, "");
            return;
        }

        const timeoutId = setTimeout(() => {
            setInputText(debouncingInputText);
            sessionStorage.setItem(inputTextStorageKey, debouncingInputText);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [debouncingInputText]);

    const onExpandCollapseClick = () => {
        setCollapsed(isCollapsed => {
            const toggledValue = !isCollapsed;
            sessionStorage.setItem(collapsedStorageKey, toggledValue.toString());
            return toggledValue;
        });
    }

    const pokemonList = gamemasterPokemon
        //.filter(p => p.speciesName.toLowerCase().includes(debouncingInputText.toLocaleLowerCase()))
        .map(p => p.speciesName);

    const withDisabledClass = (className: string) => className + (!debouncingInputText ? " disabled" : "");

    return (<>
        {!collapsed &&
            <div className="top_pane expanded_pane">
                <Stack
                    direction="column"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Autocomplete
                            size="small"
                            className="auto_complete_input"
                            inputValue={debouncingInputText}
                            /*onChange={(e, value, reason, details) => {
                                console.log(e);
                                console.log(reason);
                                console.log(details);
                                if (reason === "selectOption") {
                                    setDebouncingInputText(value ?? "");
                                }
                                if (reason === "clear") {
                                    setDebouncingInputText("");
                                    setInputText("");
                                }
                            }} */
                            onInputChange={(e, newInputValue, reason) => setDebouncingInputText(newInputValue)}
                            isOptionEqualToValue={(option, value) => option.toLowerCase().includes(value.toLocaleLowerCase())}
                            options={pokemonList}
                            //autoComplete
                            freeSolo
                            //autoSelect
                            clearOnEscape
                            getOptionLabel={(option) => option}
                            renderInput={(params) => (
                                <TextField {...params} className="auto_complete_input" label="Search…" placeholder="Pokémon name" />
                            )} 
                        />
                        <InputStyles isDarkMode = {isCurrentDark}/>
                        <React.Fragment>
                            <Select
                                className="CustomSelect"
                                slotProps={{
                                    listbox: { className: 'CustomSelect-listbox' },
                                    popper: { className: 'CustomSelect-popper' },
                                }}
                                defaultValue={listType}
                                onChange={(_e, name) => {
                                    setListType(name as ListType);
                                    sessionStorage.setItem(listTypeStorageKey, JSON.stringify(name as ListType));
                                }}
                            >
                                <Option className="CustomSelect-option" value={ListType.POKEDEX}>
                                    Pokédex
                                </Option>
                                <Option className="CustomSelect-option" value={ListType.GREAT_LEAGUE}>
                                    Great League
                                </Option>
                                <Option className="CustomSelect-option" value={ListType.ULTRA_LEAGUE}>
                                    Ultra League
                                </Option>
                                <Option className="CustomSelect-option" value={ListType.MASTER_LEAGUE}>
                                    Master League
                                </Option>
                            </Select>
                            <DropdownStyles isDarkMode = {isCurrentDark}/>
                        </React.Fragment>
                    </Stack>
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                    >
                        <div>
                            <input type="checkbox" className="checkbox" id="checkbox" checked={theme === "dark"} onChange={handleThemeChange}/>
                            <label htmlFor="checkbox" className="checkbox-label">
                                <i className="fas fa-moon"></i>
                                <i className="fas fa-sun"></i>
                                <span className="ball"></span>
                            </label>
                        </div>
                        <div>
                            <input type="checkbox" disabled={!debouncingInputText} className="checkbox" id="checkbox2" checked={showFamilyTree} onChange={_e => 
                                        setShowFamilyTree(previousFilter => {
                                            const newValue = !previousFilter;
                                            localStorage.setItem(familyTreeStorageKey, newValue.toString());
                                            return newValue;
                                        })}/>
                            <label htmlFor="checkbox2" className={withDisabledClass("checkbox-label")}>
                                <i className={withDisabledClass("fas fa-ontree")}></i>
                                <i className="fas fa-offtree"></i>
                                <span className="ball"></span>
                            </label>
                        </div>
                    </Stack>
                </Stack>
            </div>
        }
        <ExpandCollapseToggle collapsed={collapsed} expandCollapseDivRef={expandCollapseDivRef} onExpandCollapseClick={onExpandCollapseClick} />
    </>
    );
}

interface ExpandCollapseToggleProps {
    collapsed: boolean,
    onExpandCollapseClick: () => void,
    expandCollapseDivRef: React.RefObject<HTMLDivElement>
}

const ExpandCollapseToggle = ({collapsed, onExpandCollapseClick, expandCollapseDivRef}: ExpandCollapseToggleProps) => {
    let className = "top_pane expand_collapse_toggle"
    
    if (collapsed && !expandCollapseDivRef.current?.classList.contains("collapsing_toggle")) {
        className += " collapsed_toggle"
    }

    const handleOnClick = () => {
        onExpandCollapseClick();
        const divRef = expandCollapseDivRef.current;
        if (!divRef) {
            return;
        }

        if (collapsed) {
            divRef.classList.remove("collapsed_toggle");
            return;
        }
        
        divRef.classList.add("collapsing_toggle");
        setTimeout(() => {
            divRef.classList.add("collapsed_toggle");
            divRef.classList.remove("collapsing_toggle");
        }, 500);
    };

    return <div ref={expandCollapseDivRef} className={className}>
        <IconButton onClick={handleOnClick} size="large">
            {collapsed ? <ExpandMoreIcon color="primary" fontSize="large"/> : <ExpandLessIcon color="primary" fontSize="large"/>}
        </IconButton>
    </div>
}

export default ControlPanel