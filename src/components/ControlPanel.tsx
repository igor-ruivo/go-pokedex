import "./ControlPanel.scss";
import {
    FormControlLabel,
    FormGroup,
    Stack,
    Switch
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useContext, useEffect, useState } from "react";
import ThemeContext from "../contexts/theme-context";
import { Input } from '@mui/base/Input';
import { Select, selectClasses } from '@mui/base/Select';
import { Option, optionClasses } from '@mui/base/Option';
import React from "react";

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE
}

interface IControlPanelProps {
    onSearchInputChange: React.Dispatch<React.SetStateAction<string>>,
    filterGo: boolean,
    onFilterGo: React.Dispatch<React.SetStateAction<boolean>>,
    listType: ListType,
    onChangeListType: React.Dispatch<React.SetStateAction<ListType>>,
    showFamilyTree: boolean,
    onShowFamilyTree: React.Dispatch<React.SetStateAction<boolean>>
}

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
                min-width: 320px;
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
                min-width: 320px;
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
                z-index: 1;
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
                width: 320px;
                font-family: IBM Plex Sans, sans-serif;
                font-size: 0.875rem;
                font-weight: 400;
                line-height: 1.5;
                padding: 8px 12px;
                border-radius: 8px;
                color: ${isDarkMode ? grey[300] : grey[900]};
                background: ${isDarkMode ? grey[900] : '#fff'};
                border: 1px solid ${isDarkMode ? grey[700] : grey[200]};
                box-shadow: 0px 2px 24px ${isDarkMode ? cyan[800] : cyan[100]};
                
                &:hover {
                    border-color: ${cyan[400]};
                }

                &:focus {
                    border-color: ${cyan[400]};
                    box-shadow: 0 0 0 3px ${isDarkMode ? cyan[600] : cyan[200]};
                }

                &:focus-visible {
                    outline: 0;
                }
            }
        `}
    </style>
);

const ControlPanel = ({onSearchInputChange, filterGo, onFilterGo, listType, onChangeListType, showFamilyTree, onShowFamilyTree}: IControlPanelProps) => {
    const { theme, setTheme } = useContext(ThemeContext);
    const [ inputText, setInputText ] = useState("");
    const isCurrentDark = theme === "dark";

    const handleThemeChange = () => {
        setTheme(isCurrentDark ? "light" : "dark");
        localStorage.setItem('default-theme', isCurrentDark ? "light" : "dark");
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => onSearchInputChange(inputText), 500);
        return () => clearTimeout(timeoutId);
    }, [inputText]);

    return (
        <div className="top-pane">
            <Stack
                direction="column"
                spacing={2}
                justifyContent="center"
                alignItems="center"
            >
                <FormGroup>
                    <FormControlLabel
                        control={
                            <Switch
                                color="default"
                                checked={theme === "dark"}
                                onChange={handleThemeChange}
                                inputProps={{ "aria-label": "controlled" }}
                            />
                        }
                        label={"Dark mode"}
                    />
                </FormGroup>
                
                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Input
                        slotProps={{ input: { className: 'CustomInputIntroduction' } }}
                        aria-label="Search Pokémon…"
                        placeholder="Search Pokémon…"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    />
                    <InputStyles isDarkMode = {isCurrentDark}/>
                    <FormControlLabel
                        control={
                            <Switch
                                color="default"
                                className="toggle-switch"
                                checked={showFamilyTree}
                                onChange={_e => onShowFamilyTree(previousFilter => !previousFilter)}
                                inputProps={{ "aria-label": "controlled" }}
                            />
                        }
                        label={"Family tree"}
                    />
                </Stack>
                <React.Fragment>
                    <Select
                        className="CustomSelect"
                        slotProps={{
                            listbox: { className: 'CustomSelect-listbox' },
                            popper: { className: 'CustomSelect-popper' },
                        }}
                        defaultValue={ListType.POKEDEX}
                        onChange={(_e, name) => onChangeListType(name as ListType)}
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
                {listType === ListType.POKEDEX && <FormControlLabel
                    control={
                        <Switch
                            color="default"
                            className="toggle-switch"
                            checked={filterGo}
                            onChange={_e => onFilterGo(previousFilter => !previousFilter)}
                            inputProps={{ "aria-label": "controlled" }}
                        />
                    }
                    label={"Only released in Pokémon GO"}
                />}
            </Stack>
        </div>
    );
}

export default ControlPanel