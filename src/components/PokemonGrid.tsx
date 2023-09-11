import { useCallback, useEffect, useRef, useState } from 'react';
import IPokemon from '../DTOs/IPokemon';
import { Buffer } from 'buffer';
import { fetchUrls } from '../utils/network';
import "./PokemonGrid.scss"

interface IPokemonGridProps {
    pokemonInfoList: IPokemon[]
}

const PokemonGrid = ({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 12;
    const bufferSize = 3 * batchSize;
    const scrollHeightLimit = 200;

    const [lastShownIndex, setLastShownIndex] = useState(0);
    const [globalImgData, setGlobalImgData] = useState(new Map<number, string>());

    const pokemonImagesAlreadyFetched = useRef(new Set<number>());
    const renderDivRef = useRef<HTMLDivElement>(null);

    const shownPokemonSlice = pokemonInfoList.slice(0, lastShownIndex);

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
            .some(pokemon => !globalImgData.has(pokemon.number))) {
            // Next batch to show isn't ready yet.
            return;
        }

        if (window.innerHeight + window.scrollY >=
            renderDivRef.current!.offsetHeight - scrollHeightLimit
        ) {
            // Show next batch of pokemon if window scroll is less than scrollHeightLimit pixels from reaching the bottom of the page
            setLastShownIndex(previous => Math.min(previous + batchSize, pokemonInfoList.length));
        }
    }, [globalImgData, lastShownIndex, pokemonInfoList]);

    const fetchPokemonBinaryImage = async (pokemonBatch: IPokemon[]) => {
        try {
            pokemonBatch
                .map(pokemon => pokemon.number)
                .forEach(pokemonNumber => pokemonImagesAlreadyFetched.current.add(pokemonNumber));

            const response: string[] = await fetchUrls(
                pokemonBatch.map(pokemon => pokemon.imageUrl || pokemon.shinyUrl),
                false,
                { responseType: 'arraybuffer' },
                (response) => Buffer.from(response, 'binary').toString('base64')
            );
            
            setGlobalImgData(previous => {
                var newGlobalData = new Map(previous);
                response.forEach((imageData, index) => newGlobalData.set(pokemonBatch[index].number, imageData));
                return newGlobalData;
            });
        }
        catch (error) {
            console.error(error?.toString());
        }
    }

    useEffect(() => {
        // Not using an AbortController because it's ok to let previous axios requests finish.
        // If anything, they will always contribute to the completeness of the globalImgData map.
        const pokemonBatch: IPokemon[] = [];
        const targetIndex = Math.min(pokemonInfoList.length, lastShownIndex + bufferSize);

        for (let i = lastShownIndex; i < targetIndex && pokemonBatch.length < batchSize; i++) {
            const pokemonNumber = pokemonInfoList[i].number;
            if (globalImgData.has(pokemonNumber) || pokemonImagesAlreadyFetched.current.has(pokemonNumber)) {
                continue;
            }
            pokemonBatch.push(pokemonInfoList[i]);
        }
        if (pokemonBatch.length > 0) {
            fetchPokemonBinaryImage(pokemonBatch);
        }

    }, [lastShownIndex, pokemonInfoList, globalImgData]);

    useEffect(() => {
        // Triggering the scroll callback whenever state or props changes.
        // That's because the user might have reached the scroll threshold of the page when the next batch wasn't ready.
        // Or because props may have changed, which means the scrolling has reset, and that it needs to trigger the scrolling callback
        // in order to show the initial batch again.
        handleScrollCallback();
    }, [globalImgData, pokemonInfoList, lastShownIndex]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    return (
        <div className="grid-container">
            <div className="grid" ref={renderDivRef}>
                {shownPokemonSlice.every(pokemon => globalImgData.has(pokemon.number)) ?
                    <div>
                        {shownPokemonSlice.map(p => globalImgData.has(p.number) && <img key={p.number} alt={p.name} src={`data:image/jpeg;base64,${globalImgData.get(p.number)}`}/>)}
                    </div> :
                    <div>
                        Loading...
                    </div>
                }
            </div>
        </div>
    );
};

export default PokemonGrid;
