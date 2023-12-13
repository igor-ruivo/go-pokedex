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
import { ImageSource, useImageSource } from '../contexts/language-context copy';
import { goBaseUrl } from '../utils/Configs';

interface IPokemonGridProps {
    pokemonInfoList: IGamemasterPokemon[],
    listType: ListType,
    containerRef: React.RefObject<HTMLDivElement>
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

const PokemonGrid = memo(({pokemonInfoList, listType, containerRef}: IPokemonGridProps) => {
    const batchSize = 30;
    const bufferSize = 150;
    const scrollHeightLimit = 200;

    const [lastShownIndex, setLastShownIndex] = useState(getDefaultLastShownIndex());
    const [readyImages, setReadyImages] = useState<Dictionary<string>>(getDefaultReadyImages());

    const {currentLanguage} = useLanguage();
    const {imageSource} = useImageSource();

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
        case "custom":
            typedCurrentRank = ListType.CUSTOM_CUP;
            break;
    }

    useEffect(() => {
        if (typedCurrentRank === getDefaultListType()) {
            containerRef.current?.scrollTo(0, getDefaultScrollY());
        }
    }, [typedCurrentRank, containerRef]);

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
        writeSessionValue(ConfigKeys.GridScrollY, containerRef.current?.scrollTop.toString() ?? "0");

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

        if (containerRef.current!.clientHeight + containerRef.current!.scrollTop + scrollHeightLimit >= renderDivRef.current!.offsetHeight) {
            // Show next batch of pokemon if window scroll is less than scrollHeightLimit pixels from reaching the bottom of the page
            setLastShownIndex(previous => {
                const newIndex = Math.min(previous + batchSize, pokemonInfoList.length);
                writeSessionValue(ConfigKeys.LastShownImageIndex, newIndex.toString());
                return newIndex;
            });
        }
    }, [readyImages, lastShownIndex, pokemonInfoList, containerRef]);

    const getSpecificPokemonUrl = useCallback((pokemon: IGamemasterPokemon, urlKind: ImageSource) => {
        switch (urlKind) {
            case ImageSource.Official:
                return pokemon.imageUrl;
            case ImageSource.GO:
                return goBaseUrl + pokemon.goImageUrl;
            case ImageSource.Shiny:
                return goBaseUrl + pokemon.shinyGoImageUrl;
        }
    }, []);

    const tryLoadImage = useCallback((resolve: (value: string | PromiseLike<string>) => void, pokemon: IGamemasterPokemon, urlKind: ImageSource) => {
        const image = new Image();
        const url = getSpecificPokemonUrl(pokemon, urlKind);
        image.onerror = (e: any) => {
            console.error(`Failed to load resource ${url} (${ImageSource[urlKind]})`);
            switch (urlKind) {
                case ImageSource.Official:
                    resolve(pokemon.speciesId);
                    return;
                case ImageSource.GO:
                    console.log(`Trying Official...`);
                    const goResourceTarget = e.target as HTMLImageElement;
                    goResourceTarget.onerror = null;
                    tryLoadImage(resolve, pokemon, ImageSource.Official);
                    return;
                case ImageSource.Shiny:
                    console.log(`Trying GO resource...`);
                    const shinyGoResourceTarget = e.target as HTMLImageElement;
                    shinyGoResourceTarget.onerror = null;
                    tryLoadImage(resolve, pokemon, ImageSource.GO);
                    return;
            }
        };
        image.onload = () => resolve(pokemon.speciesId);
        image.src = url;
    }, [getSpecificPokemonUrl]);

    const fetchPokemonBinaryImage = useCallback(async (pokemonBatch: IGamemasterPokemon[]) => {
        try {
            const promises = pokemonBatch.map(pokemon => new Promise<string>(async (resolve, reject) => {
                try {
                    tryLoadImage(resolve, pokemon, imageSource);
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
    }, [imageSource, setReadyImages, tryLoadImage]);

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

    }, [lastShownIndex, pokemonInfoList, readyImages, fetchPokemonBinaryImage]);

    useEffect(() => {
        // Triggering the scroll callback whenever state or props changes.
        // That's because the user might have reached the scroll threshold of the page when the next batch wasn't ready.
        // Or because props may have changed, which means the scrolling has reset, and that it needs to trigger the scrolling callback
        // in order to show the initial batch again.
        handleScrollCallback();
    }, [handleScrollCallback]);
    
    useEffect(() => {
        const container = containerRef.current;
        container?.addEventListener("scroll", handleScrollCallback);
        return () => {
            container?.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback, containerRef]);

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
                    <Grid container disableEqualOverflow spacing={{ xs: 1, md: 1 }}>
                        {shownPokemonSlice.map(p => (
                            <Grid xs={4} sm={3} md={2.4} key={p.speciesId} className="grid">
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
