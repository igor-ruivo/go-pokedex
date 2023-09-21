import { useContext, useEffect, useRef, useState } from 'react';
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
import { Button } from '@mui/material';
import useSwipe from '../hooks/useSwipe';
import AppraisalBar from '../components/AppraisalBar';
import { computeBestIVs } from '../utils/pokemonIv';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import PokemonInfoCard from '../components/PokemonInfo/PokemonInfoCard';

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

    const handleThemeChange = () => {
        setTheme(isDarkMode ? "light" : "dark");
        localStorage.setItem('default-theme', isDarkMode ? "light" : "dark");
    };

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
                    <div className="dark_mode_switch">
                        <input type="checkbox" className="checkbox" id="checkbox" checked={theme === "dark"} onChange={handleThemeChange}/>
                        <label htmlFor="checkbox" className="checkbox-label">
                            <i className="fas fa-moon"></i>
                            <i className="fas fa-sun"></i>
                            <span className="ball"></span>
                        </label>
                    </div>
                </div>
                <StyledTabPanel value={0}>
                    <PokemonInfo pokemon={pokemon} changeTab={onChangeTab}/>
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

interface IPokemonInfoProps {
    pokemon: IGamemasterPokemon,
    changeTab: (nextTab: boolean) => void
}

interface ILeagueProps {
    pokemon: IGamemasterPokemon,
    leagueIndex: number,
    changeTab: (nextTab: boolean) => void
}

const PokemonInfo = ({pokemon, changeTab}: IPokemonInfoProps) => {
    interface IIvPercents {
        greatLeagueRank: number,
        greatLeagueLvl: number,
        greatLeagueCP: number,
        ultraLeagueRank: number,
        ultraLeagueLvl: number,
        ultraLeagueCP: number,
        masterLeagueRank: number,
        masterLeagueLvl: number,
        masterLeagueCP: number
    }

    const [onTouchStart, onTouchMove, onTouchEnd] = useSwipe({swipeLeftCallback: () => changeTab(true), swipeRightCallback: () => changeTab(false), minSwipeDistance: 50});
    const [ivPercents, setIvPercents] = useState<IIvPercents[]>([]);
    const {gamemasterPokemon} = useContext(PokemonContext);
    const {theme} = useContext(ThemeContext);
    const isDarkMode = theme === "dark";

    const familyTree = !gamemasterPokemon ? [] : pokemon.familyId ? gamemasterPokemon.filter(p => p.familyId === pokemon.familyId && !p.isMega && !p.isShadow) : [pokemon];

    useEffect(() => {
        console.log("mounting pokemon");
        return () => {
            console.log("unmounting pokemon")
        };
    }, []);

    const onInputChanged = (attack: number, defense: number, hp: number) => {
        if (!pokemon) {
            return;
        }

        const familyIvPercents: IIvPercents[] = [];

        familyTree.forEach(p => {
            const resGL = computeBestIVs(p.atk, p.def, p.hp, 1500);
            const resUL = computeBestIVs(p.atk, p.def, p.hp, 2500);
            const resML = computeBestIVs(p.atk, p.def, p.hp, Number.MAX_VALUE);

            const flatGLResult = Object.values(resGL).flat();
            const flatULResult = Object.values(resUL).flat();
            const flatMLResult = Object.values(resML).flat();

            const rankGLIndex = flatGLResult.findIndex(r => r.IVs.A === attack && r.IVs.D === defense && r.IVs.S === hp);
            const rankULIndex = flatULResult.findIndex(r => r.IVs.A === attack && r.IVs.D === defense && r.IVs.S === hp);
            const rankMLIndex = flatMLResult.findIndex(r => r.IVs.A === attack && r.IVs.D === defense && r.IVs.S === hp);

            familyIvPercents.push({
                greatLeagueRank: rankGLIndex,
                greatLeagueLvl: flatGLResult[rankGLIndex].L,
                greatLeagueCP: flatGLResult[rankGLIndex].CP,
                ultraLeagueRank: rankULIndex,
                ultraLeagueLvl: flatULResult[rankULIndex].L,
                ultraLeagueCP: flatULResult[rankULIndex].CP,
                masterLeagueRank: rankMLIndex,
                masterLeagueLvl: flatMLResult[rankMLIndex].L,
                masterLeagueCP: flatMLResult[rankMLIndex].CP
            });
        });
        
        setIvPercents(familyIvPercents);
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
    
    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: isDarkMode ? '#24292f' : '#fff',
        ...theme.typography.body2,
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    const convertImgUrl = (imageUrl: string) => imageUrl.replace("/detail/", "/full/");
    
    return (
        <div>
            <AppraisalBar inputChangedCallback={onInputChanged}/>
            {pokemon && <div className="tab_panel_container images_container grid_container" tabIndex={0} onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <Box sx={{ flexGrow: 1 }}>
                    <Grid container disableEqualOverflow spacing={{ xs: 2, md: 3 }}>
                        {familyTree.map((p, index) => (
                            <Grid xs={12} sm={12} md={12} key={p.speciesId} className="grid">
                                <Item>
                                    <PokemonInfoCard pokemon={p} ivPercents={ivPercents[index]} />
                                </Item>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </div>}
            
        </div>
    );
}

const League = ({pokemon, leagueIndex, changeTab}: ILeagueProps) => {
    const [onTouchStart, onTouchMove, onTouchEnd] = useSwipe({swipeLeftCallback: () => changeTab(true), swipeRightCallback: () => changeTab(false), minSwipeDistance: 50});
    
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
    
    useEffect(() => {
        console.log("mounting " + leagueIndex);
        return () => {
            console.log("unmounting " + leagueIndex)
        };
    }, []);

    return <div onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        League {leagueIndex}
    </div>;
}




export default Pokemon;