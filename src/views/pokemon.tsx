import { useContext } from 'react';
import './pokemon.scss';
import PokemonContext from '../contexts/pokemon-context';
import { useNavigate, useParams } from 'react-router-dom';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { styled } from '@mui/material/styles';
import { buttonClasses } from '@mui/base/Button';
import { Tabs } from '@mui/base/Tabs';
import { Tab, tabClasses } from '@mui/base/Tab';
import { TabsList } from '@mui/base/TabsList';
import { TabPanel } from '@mui/base/TabPanel';
import ThemeContext from '../contexts/theme-context';
import { FormGroup, FormControlLabel, Switch, Button } from '@mui/material';

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

const Pokemon = () => {
    const {theme, setTheme} = useContext(ThemeContext);
    const navigate = useNavigate();
    const isDarkMode = theme === "dark";
    const { gamemasterPokemon, rankLists, fetchCompleted, errors } = useContext(PokemonContext);
    const { speciesId } = useParams();
    const pokemon = gamemasterPokemon?.find(p => p.speciesId === speciesId) as IGamemasterPokemon;
    
    const StyledTab = styled(Tab)`
        font-family: 'IBM Plex Sans', sans-serif;
        color: ${isDarkMode ? "white" : "black"};
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: bold;
        background-color: ${isDarkMode ? grey[800] : grey[100]};
        width: 100%;
        padding: 12px;
        margin: 6px;
        border: none;
        border-radius: 7px;
        display: flex;
        justify-content: center;

        &:hover {
            background-color: ${isDarkMode ? grey[400] : grey[200]};
        }

        &:focus {
            color: ${isDarkMode ? "#fff" : "black"};
            outline: 3px solid ${isDarkMode ? grey[200] : grey[200]};
        }

        &.${tabClasses.selected} {
            background-color: ${isDarkMode ? grey[200] : grey[200]};
            color: ${isDarkMode ? grey[600] : "black"};
        }

        &.${buttonClasses.disabled} {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;

    const StyledTabsList = styled(TabsList)(
        ({ }) => `
        min-width: 400px;
        background-color: ${isDarkMode ? grey[900] : "white"};
        border-radius: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        align-content: space-between;
        `,
    );

    const StyledTabPanel = styled(TabPanel)(
        ({ }) => `
        font-family: IBM Plex Sans, sans-serif;
        font-size: 0.875rem;
        padding: 20px 12px;
        background: ${isDarkMode ? grey[900] : '#fff'};
        border: 1px solid ${isDarkMode ? grey[700] : grey[200]};
        border-radius: 12px;
        opacity: 0.6;
        `,
    );

    return (
        <div className="pokemon">
            <Tabs
                defaultValue={0}
                aria-label="Tab"
                selectionFollowsFocus
                className="pokemon_tab"
            >
                <StyledTabsList>
                    <StyledTab value={0}>Pokémon</StyledTab>
                    <StyledTab value={1}>Great</StyledTab>
                    <StyledTab value={2}>Ultra</StyledTab>
                    <StyledTab value={3}>Master</StyledTab>
                </StyledTabsList>
                <div className="control_panel">
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </Button>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch
                                    className="dark_mode_switch"
                                    color="default"
                                    checked={theme === "dark"}
                                    onChange={() => setTheme(isDarkMode ? "light" : "dark")}
                                    inputProps={{ "aria-label": "controlled" }}
                                />
                            }
                            label={"Dark mode"}
                        />
                    </FormGroup>
                </div>
                <StyledTabPanel value={0}>Pokémon</StyledTabPanel>
                <StyledTabPanel value={1}>Great League</StyledTabPanel>
                <StyledTabPanel value={2}>Ultra League</StyledTabPanel>
                <StyledTabPanel value={3}>Master League</StyledTabPanel>
            </Tabs>
        </div>
/*
        <div className="pokemon">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <>
                    {
                        !pokemon ?
                            <div>Pokémon not found</div> :
                            <PokemonImage pokemon={pokemon} />
                    }
                </>
            </LoadingRenderer>
        </div>*/
    );
}




export default Pokemon;