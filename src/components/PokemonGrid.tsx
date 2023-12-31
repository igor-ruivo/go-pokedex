import { memo, useEffect, useRef } from 'react';
import "./PokemonGrid.scss"
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import PokemonCard from './PokemonCard';
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';
import { ListType } from '../views/pokedex';
import { useLocation } from 'react-router-dom';
import translator, { TranslatorKeys } from '../utils/Translator';
import { useLanguage } from '../contexts/language-context';
import {AutoSizer, Grid, GridCellProps, ScrollParams} from 'react-virtualized';
import useResize from '../hooks/useResize';

interface IPokemonGridProps {
    pokemonInfoList: IGamemasterPokemon[],
    listType: ListType,
    containerRef: React.RefObject<HTMLDivElement>
}

const getDefaultScrollY = () => +(readSessionValue(ConfigKeys.GridScrollY) ?? "0");

const getDefaultListType = () => {
    const cachedValue = readSessionValue(ConfigKeys.LastListType);
    if (!cachedValue) {
        return undefined;
    }

    return +cachedValue as ListType;
}

const PokemonGrid = memo(({pokemonInfoList, listType, containerRef}: IPokemonGridProps) => {
    const {x} = useResize();

    const {currentLanguage} = useLanguage();
    const renderDivRef = useRef<HTMLDivElement>(null);

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
            setTimeout(() => {
                document.getElementsByClassName("grid")[0]?.scrollTo(0, getDefaultScrollY())
            }, 0);
        }
    }, [typedCurrentRank, containerRef]);

    useEffect(() => {
        // Whenever the pokemonInfoList prop changes, let's reset the scrolling and the shown pokemon.

        writeSessionValue(ConfigKeys.LastListType, JSON.stringify(typedCurrentRank));

        if (initialPropsSet.current) {
            writeSessionValue(ConfigKeys.GridScrollY, "0");
            setTimeout(() => {
                document.getElementsByClassName("grid")[0]?.scrollTo(0, 0);
            }, 0);
        } else {
            initialPropsSet.current = true;
        }
    }, [pokemonInfoList, typedCurrentRank]);

    const itemsPerRow = x >= 900 ? 5 : x >= 600 ? 4 : 3;
    const cardDimensions = (containerRef.current?.offsetWidth ?? 0) / itemsPerRow - 1;

    return (
        <div className="grid_container" ref={renderDivRef}>
            {pokemonInfoList.length === 0 && <div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div>}
            {pokemonInfoList.length > 0 &&
            <AutoSizer>
                {({height}) => (
                    <Grid className='grid'
                        cellRenderer={(props: GridCellProps) => {
                            const idx = props.rowIndex * itemsPerRow + props.columnIndex;
                            return idx < pokemonInfoList.length ?
                                <div key={props.key} className="card-wrapper-padding" style={props.style}>
                                    <div className='card-wrapper'>
                                        <PokemonCard pokemon={pokemonInfoList[idx]} listType={listType} />
                                    </div>
                                </div> : <div key={props.key}/>
                        }}
                        rowCount={Math.ceil(pokemonInfoList.length / itemsPerRow) + 1}
                        columnCount={itemsPerRow}
                        height={height}
                        width={containerRef.current?.offsetWidth ?? 0}
                        rowHeight={cardDimensions}
                        columnWidth={cardDimensions}
                        onScroll={(e: ScrollParams) => {
                            if (e.scrollTop === 0) {
                                return;
                            }
                            writeSessionValue(ConfigKeys.GridScrollY, e.scrollTop.toString() ?? "0");
                        }}
                    />
                )}
            </AutoSizer>
            }
        </div>
    );
});

export default PokemonGrid;
