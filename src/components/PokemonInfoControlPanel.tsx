import "./ControlPanel.scss";
import "./ControlPanelPokemonInfo.scss";
import {
    Autocomplete,
    AutocompleteChangeReason,
    IconButton,
    Stack,
    TextField
} from "@mui/material";
import '../styles/theme-variables.scss';
import { useRef } from "react";
import React from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { usePokemon } from "../contexts/pokemon-context";
import { Theme, useTheme } from "../contexts/theme-context";
import { ConfigKeys, writeSessionValue } from "../utils/persistent-configs-handler";
import { Link, useNavigate } from "react-router-dom";
  
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

interface IMuiStyleProps {
    isDarkMode: boolean
}

const InputStyles = ({isDarkMode}: IMuiStyleProps) => (
    <style>
        {`
            .CustomInputIntroduction {
                min-width: 200px;
                width: 200px;
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
    controlPanelCollapsed: boolean,
    setControlPanelCollapsed: (_: React.SetStateAction<boolean>) => void
}

const ControlPanel = ({controlPanelCollapsed, setControlPanelCollapsed}: IControlPanel) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isCurrentDark = theme === Theme.Dark;
    const { gamemasterPokemon } = usePokemon();
    
    const expandCollapseDivRef = useRef<HTMLDivElement>(null);

    const handleThemeChange = () => {
        toggleTheme();
    };

    const onExpandCollapseClick = () => {
        setControlPanelCollapsed(isCollapsed => {
            const toggledValue = !isCollapsed;
            writeSessionValue(ConfigKeys.ControlPanelCollapsed, toggledValue.toString());
            return toggledValue;
        });
    }

    interface SpeciesIdentifier {
        speciesId: string,
        speciesName: string
    }

    const pokemonList: SpeciesIdentifier[] = gamemasterPokemon
        .map(p => ({speciesId: p.speciesId, speciesName: p.speciesName}));

    return (<>
        {!controlPanelCollapsed &&
            <div className="top_pane expanded_info_pane">
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
                                root: 'autoComplete-root-info',
                                option: 'autoComplete-component',
                                focused: 'autoComplete-component',
                                inputFocused:'autoComplete-component',
                                input: 'autoComplete-component',
                                inputRoot: 'autoComplete-component',
                                clearIndicator: 'autoComplete-component'
                            }}
                            className="auto_complete_input"
                            onChange={(_event, newInputValue, reason, _details) => {
                                if (reason === "selectOption") {
                                    navigate(`/pokemon/${(newInputValue as SpeciesIdentifier).speciesId.replace("_shadow", "")}`)
                                }
                            }}
                            isOptionEqualToValue={(option, value) => option.speciesName.toLowerCase().includes(value.speciesName?.toLocaleLowerCase())}
                            options={pokemonList}
                            autoComplete
                            getOptionLabel={(option) => (option as SpeciesIdentifier).speciesName}
                            autoHighlight
                            clearOnEscape
                            renderInput={(params) => (
                                <TextField {...params} className="auto_complete_input" label="Search…" placeholder="Pokémon name" />
                            )} 
                        />
                        <InputStyles isDarkMode = {isCurrentDark}/>
                    </Stack>
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Link to="/">&#60; Pokédex</Link>
                        <div>
                            <input type="checkbox" className="checkbox" id="checkbox" checked={theme === Theme.Dark} onChange={handleThemeChange}/>
                            <label htmlFor="checkbox" className="checkbox-label">
                                <i className="fas fa-moon"></i>
                                <i className="fas fa-sun"></i>
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