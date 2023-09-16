import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { experimentalStyled as styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import "./PokemonGrid.scss"
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import ThemeContext from '../contexts/theme-context';
import PokemonCard from './PokemonCard';
import { lastShownIndexStorageKey, readyImagesStorageKey } from '../utils/Resources';
import SessionContext from '../contexts/session-context';
import ControlPanel from './ControlPanel';
import ControlPanelContext from '../contexts/control-panel-context';

interface IPokemonGridProps {
    pokemonInfoList: IGamemasterPokemon[]
}

const PokemonGrid = memo(({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 24;
    const bufferSize = 5 * batchSize;
    const scrollHeightLimit = 200;

    const {lastShownIndex, setLastShownIndex, readyImages, setReadyImages} = useContext(SessionContext);
    const {collapsed} = useContext(ControlPanelContext);
    const { theme } = useContext(ThemeContext);
    const isCurrentDark = theme === "dark";

    const fetchedImages = useRef(new Set<string>());
    const renderDivRef = useRef<HTMLDivElement>(null);

    const shownPokemonSlice = pokemonInfoList.slice(0, lastShownIndex);

    const initialPropsSet = useRef(false);

    useEffect(() => {
        // Whenever the props change, let's reset the scrolling and the shown pokemon.
        if (initialPropsSet.current) {
            setLastShownIndex(0);
            sessionStorage.setItem(lastShownIndexStorageKey, "0");
        } else {
            initialPropsSet.current = true;
        }
    }, [pokemonInfoList]);

    const handleScrollCallback = useCallback(() => {
        if (lastShownIndex >= pokemonInfoList.length) {
            // Already showing all pokemon available.
            return;
        }

        if (pokemonInfoList
            .slice(lastShownIndex, Math.min(pokemonInfoList.length, lastShownIndex + batchSize))
            .some(pokemon => !readyImages.hasOwnProperty(pokemon.speciesId))) {
            // Next batch to show isn't ready yet.
            return;
        }

        if (window.innerHeight + window.scrollY >=
            renderDivRef.current!.offsetHeight - scrollHeightLimit
        ) {
            // Show next batch of pokemon if window scroll is less than scrollHeightLimit pixels from reaching the bottom of the page
            setLastShownIndex(previous => Math.min(previous + batchSize, pokemonInfoList.length));
        }
    }, [readyImages, lastShownIndex, pokemonInfoList]);

    const fetchPokemonBinaryImage = async (pokemonBatch: IGamemasterPokemon[]) => {
        try {
            const promises = pokemonBatch.map(pokemon => new Promise<string>(async (resolve, reject) => {
                try {
                    const image = new Image();
                    image.onload = () => resolve(pokemon.speciesId);
                    image.onerror = () => reject(`Failed to load image ${pokemon.imageUrl}.`);
                    image.src = pokemon.imageUrl;
                }
                catch (error) {
                    reject(error);
                }
            }));

            const answers = await Promise.all(promises);

            setReadyImages(previous => {
                var newGlobalData = { ...previous };
                answers.forEach(pokemonId => newGlobalData[pokemonId] = "");
                sessionStorage.setItem(readyImagesStorageKey, JSON.stringify(newGlobalData));
                return newGlobalData;
            });
        
        }
        catch (error) {
            console.error(error?.toString());
        }
    }

    useEffect(() => {
        const pokemonBatch: IGamemasterPokemon[] = [];
        const targetIndex = Math.min(pokemonInfoList.length, lastShownIndex + bufferSize);

        for (let i = 0; i < targetIndex && pokemonBatch.length < batchSize; i++) {
            const pokemonId = pokemonInfoList[i].speciesId;
            if (readyImages.hasOwnProperty(pokemonId) || fetchedImages.current.has(pokemonId)) {
                continue;
            }
            pokemonBatch.push(pokemonInfoList[i]);
        }
        
        if (pokemonBatch.length > 0) {
            pokemonBatch.forEach(p => fetchedImages.current.add(p.speciesId));
            fetchPokemonBinaryImage(pokemonBatch);
        }

    }, [lastShownIndex, pokemonInfoList, readyImages]);

    useEffect(() => {
        // Triggering the scroll callback whenever state or props changes.
        // That's because the user might have reached the scroll threshold of the page when the next batch wasn't ready.
        // Or because props may have changed, which means the scrolling has reset, and that it needs to trigger the scrolling callback
        // in order to show the initial batch again.
        handleScrollCallback();
    }, [readyImages, pokemonInfoList, lastShownIndex]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: isCurrentDark ? '#24292f' : '#fff',
        ...theme.typography.body2,
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    let gridClassName = "grid";
    gridClassName += ` ${collapsed ? "collapsed_top_pane" : "expanded_top_pane"}`

    return (
        <div className={gridClassName} ref={renderDivRef}>
            {pokemonInfoList.length === 0 && <div>No Pokémon matched your search!</div>}
            {pokemonInfoList.length > 0 && lastShownIndex >= Math.min(batchSize, pokemonInfoList.length) ?
                <Box sx={{ flexGrow: 1 }}>
                    <Grid container disableEqualOverflow spacing={{ xs: 2, md: 3 }}>
                        {shownPokemonSlice.map(p => (
                            <Grid xs={4} sm={3} md={3} key={p.speciesId}>
                                {readyImages.hasOwnProperty(p.speciesId) &&
                                <Item>
                                    <PokemonCard pokemon={p} />
                                </Item>}
                            </Grid>
                        ))}
                    </Grid>
                </Box>
                :
                pokemonInfoList.length > 0 && <div>
                    Loading...
                </div>
            }
        </div>
    );
});

export default PokemonGrid;
