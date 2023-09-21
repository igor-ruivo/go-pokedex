import "./ControlPanel.scss";
import {
    Autocomplete,
    IconButton,
    Stack,
    TextField
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useContext, useEffect, useRef, useState } from "react";
import { Select, selectClasses } from '@mui/base/Select';
import { Option, optionClasses } from '@mui/base/Option';
import React from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PokemonContext from "../contexts/pokemon-context";
import { Theme, useTheme } from "../contexts/theme-context";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from "../utils/persistent-configs-handler";
import { ListType } from "../views/pokedex";

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

interface IControlPanel {
    getDefaultInputText: () => string,
    setInputText: (_: React.SetStateAction<string>) => void,
    controlPanelCollapsed: boolean,
    setControlPanelCollapsed: (_: React.SetStateAction<boolean>) => void,
    listType: ListType,
    setListType: (_: React.SetStateAction<ListType>) => void,
    showFamilyTree: boolean,
    setShowFamilyTree: (_: React.SetStateAction<boolean>) => void
}

const ControlPanel = ({getDefaultInputText, setInputText, controlPanelCollapsed, setControlPanelCollapsed, listType, setListType, showFamilyTree, setShowFamilyTree}: IControlPanel) => {
    const [debouncingInputText, setDebouncingInputText] = useState(getDefaultInputText());

    const { theme, toggleTheme } = useTheme();
    const isCurrentDark = theme === Theme.Dark;
    const { gamemasterPokemon } = useContext(PokemonContext);
    
    const expandCollapseDivRef = useRef<HTMLDivElement>(null);

    const handleThemeChange = () => {
        toggleTheme();
    };

    useEffect(() => {
        if (!debouncingInputText) {
            setInputText("");
            writeSessionValue(ConfigKeys.SearchInputText, "");
            return;
        }

        const timeoutId = setTimeout(() => {
            setInputText(debouncingInputText);
            writeSessionValue(ConfigKeys.SearchInputText, debouncingInputText);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [debouncingInputText]);

    const onExpandCollapseClick = () => {
        setControlPanelCollapsed(isCollapsed => {
            const toggledValue = !isCollapsed;
            writeSessionValue(ConfigKeys.ControlPanelCollapsed, toggledValue.toString());
            return toggledValue;
        });
    }

    const pokemonList = gamemasterPokemon
        .map(p => p.speciesName);

    const withDisabledClass = (className: string) => className + (!debouncingInputText ? " disabled" : "");

    return (<>
        {!controlPanelCollapsed &&
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
                            classes={{
                                root: 'autoComplete-root',
                                option: 'autoComplete-component',
                                focused: 'autoComplete-component',
                                inputFocused:'autoComplete-component',
                                input: 'autoComplete-component',
                                inputRoot: 'autoComplete-component',
                                clearIndicator: 'autoComplete-component'
                            }}
                            className="auto_complete_input"
                            inputValue={debouncingInputText}
                            onInputChange={(_e, newInputValue, _reason) => setDebouncingInputText(newInputValue)}
                            isOptionEqualToValue={(option, value) => option.toLowerCase().includes(value.toLocaleLowerCase())}
                            options={pokemonList}
                            autoComplete
                            freeSolo
                            autoHighlight
                            clearOnEscape
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
                                    writeSessionValue(ConfigKeys.ListType, JSON.stringify(name as ListType));
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
                            <input type="checkbox" className="checkbox" id="checkbox" checked={theme === Theme.Dark} onChange={handleThemeChange}/>
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
                                            writePersistentValue(ConfigKeys.ShowFamilyTree, newValue.toString());
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
        <ExpandCollapseToggle collapsed={controlPanelCollapsed} expandCollapseDivRef={expandCollapseDivRef} onExpandCollapseClick={onExpandCollapseClick} />
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