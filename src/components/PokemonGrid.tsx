import { useCallback, useEffect, useState } from 'react';
import IPokemon from '../DTOs/IPokemon';
import { Buffer } from 'buffer';
import axios from 'axios';

interface IPokemonGridProps {
    pokemonInfoList: IPokemon[]
}

const PokemonGrid = ({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 12;
    const [loadingFirstBatch, setLoadingFirstBatch] = useState(true);
    const [batchIteration, setBatchIteration] = useState(0);
    const [globalImgData, setGlobalImgData] = useState<string[]>([]);

    const handleScrollCallback = useCallback(() => {
        if (!loadingFirstBatch && globalImgData.length >= (batchIteration + 2) * batchSize &&
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 200
        ) {
            setBatchIteration(previous => previous + 1);
        }
    }, [loadingFirstBatch, globalImgData, batchIteration]);

    useEffect(() => {
        handleScrollCallback();
    }, [loadingFirstBatch, globalImgData, batchIteration]);

    const fetchPokemonBinaryImage = async (startIndex: number, endIndex: number, abortSignal: AbortSignal, callbackFinishAction?: () => void) => {
        const promises = pokemonInfoList
            .slice(startIndex, endIndex)
            .map(async pokemon => {
                const response = await axios.get(pokemon.imageUrl, { responseType: 'arraybuffer', signal: abortSignal });
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                return base64Image;
            });
        const results = await Promise.all(promises);
        setGlobalImgData(previous => [...previous, ...results]);
        callbackFinishAction?.();
    };

    useEffect(() => {
        const controller = new AbortController();
        const isFirstBatch = batchIteration === 0;

        const startIndex = isFirstBatch ? 0 : (batchIteration + 1) * batchSize;
        const endIndex = isFirstBatch ? 2 * batchSize : (batchIteration + 2) * batchSize;

        fetchPokemonBinaryImage(
            startIndex,
            endIndex,
            controller.signal,
            isFirstBatch ? () => setLoadingFirstBatch(false) : undefined
        );

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [batchIteration]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);

    console.log(globalImgData.length + " ready");
    console.log(batchIteration + " batchIteration");

    return (
        <div>
            {globalImgData.length >= batchSize ?
                <div>
                    {pokemonInfoList.slice(0, (batchIteration + 1) * batchSize).map(p => <img key={p.number} src={`data:image/jpeg;base64,${globalImgData[p.number - 1]}`}/>)}
                </div> :
                <div>
                    Loading...
                </div>}
        </div>
    );
};

export default PokemonGrid;
