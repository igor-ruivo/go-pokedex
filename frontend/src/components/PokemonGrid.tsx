import { useCallback, useEffect, useState } from 'react';
import IPokemon from '../DTOs/IPokemon';
import { Buffer } from 'buffer';
import axios from 'axios';

interface IPokemonGridProps {
    pokemonInfoList: IPokemon[]
}

const PokemonGrid = ({pokemonInfoList}: IPokemonGridProps) => {
    const batchSize = 12;
    const [lastSeenIndex, setLastSeenIndex] = useState(0);
    const [globalImgData, setGlobalImgData] = useState<string[]>([]);

    const handleScrollCallback = useCallback(() => {
        if (globalImgData.length >= lastSeenIndex + batchSize &&
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 200 // Adjust this value as needed
        ) {
            setLastSeenIndex(previous => previous + batchSize);
        }
    }, [globalImgData, lastSeenIndex]);
    
    useEffect(() => {
        window.addEventListener("scroll", handleScrollCallback);
        return () => {
            window.removeEventListener("scroll", handleScrollCallback);
        };
    }, [handleScrollCallback]);


    useEffect(() => {
        const fetchData = async () => {
            const promises = pokemonInfoList.slice(lastSeenIndex, lastSeenIndex + batchSize).map(async pokemon => {
                const response = await axios.get(pokemon.imageUrl, { responseType: 'arraybuffer' });
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                return base64Image;
            });
            const results = await Promise.all(promises);
            setGlobalImgData(previous => [...previous, ...results]);
        }
        fetchData();
    }, [lastSeenIndex]);

    return (
        <div>
            <div>
                {pokemonInfoList.slice(0, lastSeenIndex).map((p, i) => <img key={p.number} src={`data:image/jpeg;base64,${globalImgData[i]}`}/>)}
            </div>
            <button onClick = {() => setLastSeenIndex(previous => previous + batchSize)}>Render more</button>
        </div>
    );
};

export default PokemonGrid;
