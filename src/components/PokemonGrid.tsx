import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { experimentalStyled as styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import "./PokemonGrid.scss"
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import ThemeContext from '../contexts/theme-context';

interface IPokemonGridProps {
    pokemonInfoList: IGamemasterPokemon[]
}

const PokemonGrid = memo(({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 12;
    const bufferSize = 3 * batchSize;
    const scrollHeightLimit = 200;

    const [lastShownIndex, setLastShownIndex] = useState(0);
    const [readyImages, setReadyImages] = useState(new Set<string>());

    const fetchedImages = useRef(new Set<string>());
    const renderDivRef = useRef<HTMLDivElement>(null);

    const shownPokemonSlice = pokemonInfoList.slice(0, lastShownIndex);

    const { theme } = useContext(ThemeContext);
    const isCurrentDark = theme === "dark";

    useEffect(() => {
        // Whenever the props change, let's reset the scrolling and the shown pokemon.
        setLastShownIndex(0);
    }, [pokemonInfoList]);

    const handleScrollCallback = useCallback(() => {
        if (lastShownIndex >= pokemonInfoList.length) {
            // Already showing all pokemon available.
            return;
        }

        if (pokemonInfoList
            .slice(lastShownIndex, Math.min(pokemonInfoList.length, lastShownIndex + batchSize))
            .some(pokemon => !readyImages.has(pokemon.speciesId))) {
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
                var newGlobalData = new Set(previous);
                answers.forEach(pokemonId => newGlobalData.add(pokemonId));
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

        for (let i = lastShownIndex; i < targetIndex && pokemonBatch.length < batchSize; i++) {
            const pokemonId = pokemonInfoList[i].speciesId;
            if (readyImages.has(pokemonId) || fetchedImages.current.has(pokemonId)) {
                continue;
            }
            pokemonBatch.push(pokemonInfoList[i]);
        }
        
        if (pokemonBatch.length > 0) {
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

    return (
        <div className="grid" ref={renderDivRef}>
            {pokemonInfoList.length === 0 && <div>No Pokémon matched your search!</div>}
            {pokemonInfoList.length > 0 && lastShownIndex >= Math.min(batchSize, pokemonInfoList.length) ?
                <>
                    <Box sx={{ flexGrow: 1 }}>
                        <Grid container disableEqualOverflow spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
                            {shownPokemonSlice.map(p => (
                                <Grid xs={2} sm={4} md={4} key={p.speciesId}>
                                    {readyImages.has(p.speciesId) &&
                                    <Item>
                                        <div className="images_container" key={p.speciesId}>
                                            <img className="image" alt={p.speciesName} height={475} width={475} src={p.imageUrl}/>
                                            {p.isShadow && <img className='image shadow-overlay' src="https://i.imgur.com/4FYNAqX.png" alt={p.speciesName} height={475} width={475} />}
                                        </div>
                                    </Item>}
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </> 
                :
                pokemonInfoList.length > 0 && <div>
                    Loading...
                </div>
            }
        </div>
    );
});

export default PokemonGrid;
