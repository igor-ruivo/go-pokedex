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

    const previousPokemonInfoList = useRef<IPokemon[]>();
    const fetchedBatchIndexes = useRef<Map<number, number>>(new Map<number, number>());

    const handleScrollCallback = useCallback(() => {
        if (lastShownIndex >= pokemonInfoList.length) {
            // Already showing all pokemon available.
            return;
        }

        if (pokemonInfoList
            .slice(lastShownIndex, Math.min(pokemonInfoList.length, lastShownIndex + batchSize))
            .filter(pokemon => !globalImgData.has(pokemon.number))
            .length) {
            // Next batch to show isn't ready yet.
            return;
        }

        if (window.innerHeight + window.scrollY >=
            document.body.offsetHeight - scrollHeightLimit
        ) {
            // Show next batch of pokemon if window scroll is less than scrollHeightLimit pixels from reaching the bottom of the page
            setLastShownIndex(previous => Math.min(previous + batchSize, pokemonInfoList.length));
        }
    }, [globalImgData, lastShownIndex, pokemonInfoList]);

    useEffect(() => {
        // Triggering the scroll callback whenever any dep in the dependencies array changes.
        // That's because the user might have reached the scroll threshold of the page when the next batch wasn't ready.
        handleScrollCallback();
    }, [globalImgData]);

    const fetchPokemonBinaryImage = async (pokemonBatch: IPokemon[]) => {
        try {
            console.log("Fetching " + pokemonBatch.map(p => p.number).join(", "));

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
            console.log("done fetching " + pokemonBatch.map(p => p.number).join(", ") + "!");
        }
        catch (err) {
            console.error(err?.toString());
        }
    }

    useEffect(() => {
        // Sync data in case of a prop change

        const pokemonHasDifferentImage = (pokemonNumber: number): boolean => {
            if (!previousPokemonInfoList.current) {
                return false;
            }
    
            const previousPokemon = previousPokemonInfoList.current.find(pokemon => pokemon.number === pokemonNumber);
            const currentPokemon = pokemonInfoList.find(pokemon => pokemon.number === pokemonNumber);
    
            if (!previousPokemon) {
                return false;
            }
    
            if (!currentPokemon) {
                return false;
            }
    
            return (previousPokemon.imageUrl || previousPokemon.shinyUrl) !== (currentPokemon.imageUrl || currentPokemon.shinyUrl);
        }

        if (previousPokemonInfoList.current) {
            console.log("noticed a change of props");
            let anythingChanged = false;

            // Fetching missing new pokemon that should already be visible by now.
            const missingPokemon = pokemonInfoList
                .slice(0, lastShownIndex)
                .filter(pokemon => !globalImgData.has(pokemon.number));
            if (missingPokemon.length) {
                anythingChanged = true;
                fetchPokemonBinaryImage(missingPokemon);
            }

            // Updating image urls that have changed in the meantime
            const outdatedPokemon = Array.from(globalImgData.keys())
                .filter(storedPokemonNumber => pokemonHasDifferentImage(storedPokemonNumber))
                .map(outdatedPokemonNumber => pokemonInfoList.find(pokemon => pokemon.number === outdatedPokemonNumber) as IPokemon);
            if (outdatedPokemon.length) {
                anythingChanged = true;
                fetchPokemonBinaryImage(outdatedPokemon);
            }

            if (anythingChanged) {
                //setLastShownIndex(p => Math.min(p, pokemonInfoList.length));
            }
        }
        console.log("changing props");
        previousPokemonInfoList.current = pokemonInfoList;
    }, [pokemonInfoList]);

    useEffect(() => {
        // Not using an AbortController because it's ok to let previous axios requests finish.
        // If anything, they will always contribute to the completeness of the globalImgData map.

        if (globalImgData.size >= pokemonInfoList.length && pokemonInfoList.every(pokemon => globalImgData.has(pokemon.number))) {
            console.log("tried to fetch more pokémon");
            // No more pokémon to fetch.
            return;
        }

        if (globalImgData.size >= lastShownIndex + bufferSize &&
            pokemonInfoList
                .slice(lastShownIndex, Math.min(lastShownIndex + bufferSize, pokemonInfoList.length))
                .every(pokemon => globalImgData.has(pokemon.number))) {
            console.log("Too soon to fetch more images");
            // Too soon to fetch more images.
            return;
        }

        const startIndex = pokemonInfoList
                .findIndex(pokemon => !globalImgData.has(pokemon.number)) as number;
        const endIndex = Math.min(startIndex + batchSize, pokemonInfoList.length);
        
        if(!fetchedBatchIndexes.current.has(startIndex)) {
            fetchedBatchIndexes.current.set(startIndex, startIndex);
            fetchPokemonBinaryImage(pokemonInfoList.slice(startIndex, endIndex));
        } else {
            console.log("Already fetching the following batch");
        }
    }, [lastShownIndex, globalImgData, pokemonInfoList]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    console.log(pokemonInfoList.filter(p => globalImgData.has(p.number)).length + " pokemon ready to be shown");
    console.log(lastShownIndex + " lastShown pokemon");
    console.log(pokemonInfoList.length + " total pokemon")

    return (
        <div className="grid">
            {pokemonInfoList.slice(0, lastShownIndex).every(pokemon => globalImgData.has(pokemon.number)) ?
                <div>
                    {pokemonInfoList.slice(0, lastShownIndex).map(p => globalImgData.has(p.number) && <img key={p.number} alt={p.name} src={`data:image/jpeg;base64,${globalImgData.get(p.number)}`}/>)}
                </div> :
                <div>
                    Loading...
                </div>
            }
        </div>
    );
};

export default PokemonGrid;
