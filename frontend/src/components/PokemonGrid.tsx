import React, { useEffect, useState } from 'react';
import PokemonCard from './PokemonCard';
import IPokemon from '../DTOs/IPokemon';
import Spinner from './Spinner';
import ImageBatchLoader from '../hooks/useImageBatchLoader';
import useImageBatchLoader from '../hooks/useImageBatchLoader';

interface IPokemonGridProps {
    pokemonInfoList: IPokemon[]
}

const PokemonGrid = ({pokemonInfoList}: IPokemonGridProps) => {
    console.log("mega length: " + pokemonInfoList.length);
    const batchSize = 12;
    const [lastSeenIndex, setLastSeenIndex] = useState(0);
    const [imgData, loading] = useImageBatchLoader(pokemonInfoList.map(p => p.imageUrl), lastSeenIndex, Math.min(pokemonInfoList.length, lastSeenIndex + batchSize));
    const [globalImgData, setGlobalImgData] = useState<string[]>([]);
    const handleScroll = () => {
        if (
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 200 // Adjust this value as needed
        ) {
            console.log("setting up next batch");
            setLastSeenIndex((prevIndex) =>
            Math.min(prevIndex + batchSize, pokemonInfoList.length)
        );
        }
    };

    useEffect(() => {
        if (imgData) {
            setGlobalImgData(prevGlobalImgData => [
                ...prevGlobalImgData,
                ...imgData
            ]);
        }
    }, [imgData]);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div>
            <div>
                {pokemonInfoList.slice(0, lastSeenIndex + Math.min(pokemonInfoList.length, lastSeenIndex + batchSize)).map((p, i) => <img key={p.number} src={`data:image/jpeg;base64,${globalImgData[i]}`}/>)}
            </div>
        </div>
    );
};

export default PokemonGrid;
