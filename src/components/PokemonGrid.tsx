import { useCallback, useEffect, useState } from 'react';
import IPokemon from '../DTOs/IPokemon';
import { Buffer } from 'buffer';
import axios from 'axios';

interface IPokemonGridProps {
    pokemonInfoList: IPokemon[]
}

const PokemonGrid = ({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 500;
    const scrollHeightLimit = 200;

    const [loadingFirstBatch, setLoadingFirstBatch] = useState(true);
    const [lastShownIndex, setLastShownIndex] = useState(0);
    const [globalImgData, setGlobalImgData] = useState<string[]>([]);

    const handleScrollCallback = useCallback(() => {
        if (loadingFirstBatch) {
            // Haven't finished loading the first batch. Too soon to handle scroll callbacks.
            return;
        }

        if (lastShownIndex >= pokemonInfoList.length) {
            // Already showing all pokemon available.
            return;
        }
        
        if (globalImgData.length < Math.min(pokemonInfoList.length, lastShownIndex + batchSize)) {
            // Next batch to show isn't ready yet.
            return;
        }

        if (window.innerHeight + window.scrollY >=
            document.body.offsetHeight - scrollHeightLimit
        ) {
            // Show next batch of pokemon if window scroll is less than scrollHeightLimit pixels from reaching the bottom of the page
            setLastShownIndex(previous => Math.min(previous + batchSize, pokemonInfoList.length));
        }
    }, [loadingFirstBatch, globalImgData, lastShownIndex, pokemonInfoList]);

    useEffect(() => {
        // Triggering the scroll callback whenever any dep in the dependencies array changes.
        // That's because the user might have reached the scroll threshold of the page when the next batch wasn't ready.
        handleScrollCallback();
    }, [loadingFirstBatch, globalImgData, lastShownIndex, pokemonInfoList]);

    const fetchPokemonBinaryImage = async (startIndex: number, endIndex: number, abortSignal: AbortSignal, callbackFinishAction?: () => void) => {
        const promises = pokemonInfoList
            .slice(startIndex, endIndex)
            .map(async pokemon => {
                const response = await axios.get(pokemon.imageUrl || pokemon.shinyUrl, { responseType: 'arraybuffer', signal: abortSignal });
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                return base64Image;
            });
        const results = await Promise.all(promises);
        setGlobalImgData(previous => [...previous, ...results]);
        callbackFinishAction?.();
    };

    useEffect(() => {
        const controller = new AbortController();
        const isFirstBatch = lastShownIndex === 0;

        const startIndex = lastShownIndex;
        const endIndex = lastShownIndex + batchSize;

        fetchPokemonBinaryImage(
            startIndex,
            endIndex,
            controller.signal,
            isFirstBatch ? () => setLoadingFirstBatch(false) : undefined
        );

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [lastShownIndex]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    console.log(globalImgData.length + " pokemon ready to be shown");
    console.log(lastShownIndex + " lastShown pokemon");

    return (
        <div>
            {globalImgData.length >= batchSize ?
                <div>
                    {pokemonInfoList.slice(0, lastShownIndex).map((p, i) => <img key={p.number} src={`data:image/jpeg;base64,${globalImgData[i]}`}/>)}
                </div> :
                <div>
                    Loading...
                </div>}
        </div>
    );
};

export default PokemonGrid;
