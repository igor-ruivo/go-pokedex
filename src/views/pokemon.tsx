import { useContext, useRef, useState } from 'react';
import './pokemon.scss';
import '../components/PokemonImage.css';
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
    const { gamemasterPokemon, rankLists, fetchCompleted, errors } = useContext(PokemonContext);
    const navigate = useNavigate();
    const { speciesId } = useParams();

    const tabsListRef = useRef<HTMLElement>(null);

    const isDarkMode = theme === "dark";
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
            outline: 1px solid ${isDarkMode ? grey[900] : "black"};
        }

        &.${tabClasses.selected} {
            background-color: ${isDarkMode ? grey[200] : grey[200]};
            color: ${isDarkMode ? grey[600] : "black"};
            outline: 1px solid ${isDarkMode ? grey[900] : "black"};
        }

        &.${buttonClasses.disabled} {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;

    const StyledTabsList = styled(TabsList)(
        ({ }) => `
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
        `,
    );

    const onChangeTab = (nextTab: boolean) => {
        const tabElements = tabsListRef.current!.children;
            
        const currentIndex = Array.from(tabElements).findIndex(t => t.getAttribute("aria-selected") === "true");
        const nextIndex = currentIndex + (nextTab ? 1 : -1);
        
        const moduloResult = ((nextIndex % tabElements.length) + tabElements.length) % tabElements.length;
        const nextTabElement = tabElements[moduloResult] as HTMLElement;
        nextTabElement.click();
    }

    return (
        <div className="pokemon">
            <Tabs
                defaultValue={0}
                aria-label="Tab"
                selectionFollowsFocus
                className="pokemon_tab"
            >
                <StyledTabsList ref={tabsListRef}>
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
                <StyledTabPanel value={0}>
                    <League pokemon={pokemon} leagueIndex={0} changeTab={onChangeTab}/>
                </StyledTabPanel>
                <StyledTabPanel value={1}>
                    <League pokemon={pokemon} leagueIndex={1} changeTab={onChangeTab}/>
                </StyledTabPanel>
                <StyledTabPanel value={2}>
                    <League pokemon={pokemon} leagueIndex={2} changeTab={onChangeTab}/>
                </StyledTabPanel>
                <StyledTabPanel value={3}>
                    <League pokemon={pokemon} leagueIndex={3} changeTab={onChangeTab}/>
                </StyledTabPanel>
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

interface ILeagueProps {
    pokemon: IGamemasterPokemon,
    leagueIndex: number,
    changeTab: (nextTab: boolean) => void
}

const League = ({pokemon, leagueIndex, changeTab}: ILeagueProps) => {
    const minSwipeDistance = 50;
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        switch (e.code) {
            case "ArrowRight":
                changeTab(true);
                break;
            case "ArrowLeft":
                changeTab(false);
                break;
        }
    }

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            changeTab(isLeftSwipe);
            /*const tabElements = tabsListRef.current!.children;
            
            const currentIndex = Array.from(tabElements).findIndex(t => t.getAttribute("aria-selected") === "true");
            const nextIndex = currentIndex + (isLeftSwipe ? 1 : -1);
            
            const moduloResult = ((nextIndex % tabElements.length) + tabElements.length) % tabElements.length;
            const nextTabElement = tabElements[moduloResult] as HTMLElement;
            nextTabElement.click();*/
        }
    }

    const convertImgUrl = (imageUrl: string) => imageUrl.replace("/detail/", "/full/");
    
    return pokemon && <div className="tab_panel_container images_container" tabIndex={0} onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <img className="image" onKeyDown={onKeyDown} src={convertImgUrl(pokemon.imageUrl)} width={475} height={475} alt={pokemon.speciesName}/>
    </div>
}




export default Pokemon;