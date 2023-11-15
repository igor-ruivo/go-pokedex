import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { experimentalStyled as styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import "./PokemonGrid.scss"
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import PokemonCard from './PokemonCard';
import Dictionary from '../utils/Dictionary';
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';
import { ListType } from '../views/pokedex';
import { useLocation } from 'react-router-dom';
import translator, { TranslatorKeys } from '../utils/Translator';
import { useLanguage } from '../contexts/language-context';

interface IPokemonGridProps {
    pokemonInfoList: IGamemasterPokemon[],
    listType: ListType
}

const getDefaultLastShownIndex = () => +(readSessionValue(ConfigKeys.LastShownImageIndex) ?? "0");

const getDefaultScrollY = () => +(readSessionValue(ConfigKeys.GridScrollY) ?? "0");

const getDefaultReadyImages = (): Dictionary<string> => {
    const storedInfo = readSessionValue(ConfigKeys.BrowserCachedImages);
    if (storedInfo) {
        return JSON.parse(storedInfo);
    }
    return {};
}

const getDefaultListType = () => {
    const cachedValue = readSessionValue(ConfigKeys.LastListType);
    if (!cachedValue) {
        return undefined;
    }

    return +cachedValue as ListType;
}

const PokemonGrid = memo(({pokemonInfoList, listType}: IPokemonGridProps) => {
    const batchSize = 24;
    const bufferSize = 120;
    const scrollHeightLimit = 200;

    const [lastShownIndex, setLastShownIndex] = useState(getDefaultLastShownIndex());
    const [readyImages, setReadyImages] = useState<Dictionary<string>>(getDefaultReadyImages());

    const {currentLanguage} = useLanguage();

    const fetchedImages = useRef(new Set<string>());
    const renderDivRef = useRef<HTMLDivElement>(null);

    const shownPokemonSlice = pokemonInfoList.slice(0, lastShownIndex);

    const initialPropsSet = useRef(false);
    
    const location = useLocation();
    const currentRank = location.pathname.substring(1);
    let typedCurrentRank = ListType.POKEDEX;

    switch (currentRank) {
        case "great":
            typedCurrentRank = ListType.GREAT_LEAGUE;
            break;
        case "ultra":
            typedCurrentRank = ListType.ULTRA_LEAGUE;
            break;
        case "master":
            typedCurrentRank = ListType.MASTER_LEAGUE;
            break;
    }

    useEffect(() => {
        if (typedCurrentRank === getDefaultListType()) {
            window.scrollTo(0, getDefaultScrollY());
            console.log("scroll restored");
        }
    }, [typedCurrentRank]);

    useEffect(() => {
        // Whenever the pokemonInfoList prop changes, let's reset the scrolling and the shown pokemon.

        writeSessionValue(ConfigKeys.LastListType, JSON.stringify(typedCurrentRank));

        if (initialPropsSet.current) {
            setLastShownIndex(0);
            writeSessionValue(ConfigKeys.LastShownImageIndex, "0");
            writeSessionValue(ConfigKeys.GridScrollY, "0");
        } else {
            initialPropsSet.current = true;
        }
    }, [pokemonInfoList, typedCurrentRank]);

    const handleScrollCallback = useCallback(() => {
        writeSessionValue(ConfigKeys.GridScrollY, window.scrollY.toString());

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
            setLastShownIndex(previous => {
                const newIndex = Math.min(previous + batchSize, pokemonInfoList.length);
                writeSessionValue(ConfigKeys.LastShownImageIndex, newIndex.toString());
                return newIndex;
            });
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
                writeSessionValue(ConfigKeys.BrowserCachedImages, JSON.stringify(newGlobalData));
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
    }, [handleScrollCallback]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: '#24292f',
        ...theme.typography.body2,
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    return (
        <div className="grid_container" ref={renderDivRef}>
            {pokemonInfoList.length === 0 && <div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div>}
            {pokemonInfoList.length > 0 && lastShownIndex >= Math.min(batchSize, pokemonInfoList.length) ?
                <Box sx={{ flexGrow: 1 }}>
                    <Grid container disableEqualOverflow spacing={{ xs: 1, md: 2 }}>
                        {shownPokemonSlice.map(p => (
                            <Grid xs={4} sm={3} md={3} key={p.speciesId} className="grid">
                                {readyImages.hasOwnProperty(p.speciesId) &&
                                <Item className="grid-item">
                                    <PokemonCard pokemon={p} listType={listType} />
                                </Item>}
                            </Grid>
                        ))}
                    </Grid>
                </Box>
                :
                pokemonInfoList.length > 0 && <div>
                    {translator(TranslatorKeys.Loading, currentLanguage)}
                </div>
            }
        </div>
    );
});

export default PokemonGrid;
