import './PokemonGrid.scss';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ScrollParams } from 'react-virtualized';
import { AutoSizer, Grid } from 'react-virtualized';

import { useLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import useResize from '../hooks/useResize';
import {
	ConfigKeys,
	readSessionValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';
import translator, { TranslatorKeys } from '../utils/Translator';
import { ListType } from '../views/pokedex';
import PokemonCard from './PokemonCard';

interface IPokemonGridProps {
	pokemonInfoList: Array<IGamemasterPokemon>;
	cpStringOverrides: Record<string, string>;
	rankOverrides: Record<string, number>;
	listType: ListType;
	containerRef: React.RefObject<HTMLDivElement>;
}

// Define a type for the cell renderer props to ensure all required props are present
interface SafeGridCellProps {
	rowIndex: number;
	columnIndex: number;
	key: React.Key;
	style: React.CSSProperties;
}

const getDefaultScrollY = (): number => {
	const value = readSessionValue(ConfigKeys.GridScrollY);
	return typeof value === 'string' ? +value : 0;
};

const getDefaultListType = (): ListType | undefined => {
	const cachedValue = readSessionValue(ConfigKeys.LastListType);
	if (!cachedValue) {
		return undefined;
	}
	return +cachedValue as ListType;
};

const PokemonGrid = memo(function PokemonGrid(props: IPokemonGridProps) {
	const {
		pokemonInfoList,
		cpStringOverrides,
		rankOverrides,
		listType,
		containerRef,
	} = props;

	const { x } = useResize();

	const { currentLanguage } = useLanguage();
	const renderDivRef = useRef<HTMLDivElement>(null);

	const initialPropsSet = useRef(false);

	const location = useLocation();
	const currentRank = useMemo(() => location.pathname.substring(1), [location]);
	let typedCurrentRank = ListType.POKEDEX;

	switch (currentRank) {
		case 'great':
			typedCurrentRank = ListType.GREAT_LEAGUE;
			break;
		case 'ultra':
			typedCurrentRank = ListType.ULTRA_LEAGUE;
			break;
		case 'master':
			typedCurrentRank = ListType.MASTER_LEAGUE;
			break;
		case 'custom':
			typedCurrentRank = ListType.CUSTOM_CUP;
			break;
		case 'raid':
			typedCurrentRank = ListType.RAID;
			break;
	}

	useEffect(() => {
		if (typedCurrentRank === getDefaultListType()) {
			setTimeout(() => {
				const gridElement = document.getElementsByClassName('grid')[0] as
					| HTMLElement
					| undefined;
				if (gridElement) {
					gridElement.scrollTo(0, getDefaultScrollY());
				}
			}, 0);
		}
	}, [typedCurrentRank, containerRef]);

	useEffect(() => {
		// Whenever the pokemonInfoList prop changes, let's reset the scrolling and the shown pokemon.

		writeSessionValue(
			ConfigKeys.LastListType,
			JSON.stringify(typedCurrentRank)
		);

		if (initialPropsSet.current) {
			writeSessionValue(ConfigKeys.GridScrollY, '0');
			setTimeout(() => {
				const gridElement = document.getElementsByClassName('grid')[0] as
					| HTMLElement
					| undefined;
				if (gridElement) {
					gridElement.scrollTo(0, 0);
				}
			}, 0);
		} else {
			initialPropsSet.current = true;
		}
	}, [pokemonInfoList, typedCurrentRank]);

	const itemsPerRow = useMemo(
		() => (x >= 1600 ? 7 : x >= 1250 ? 6 : x >= 950 ? 5 : x >= 600 ? 4 : 3),
		[x]
	);

	const safeCellRenderer = ({
		rowIndex,
		columnIndex,
		key,
		style,
	}: SafeGridCellProps): React.ReactNode => {
		const idx = rowIndex * itemsPerRow + columnIndex;
		if (idx < pokemonInfoList.length) {
			const pokemon = pokemonInfoList[idx];
			const cpOverride = cpStringOverrides[pokemon.speciesId];
			const rankOverride = rankOverrides[pokemon.speciesId];
			return (
				<div key={key} className='card-wrapper-padding' style={style}>
					<div className='card-wrapper'>
						<PokemonCard
							pokemon={pokemon}
							listType={listType}
							cpStringOverride={cpOverride}
							rankOverride={rankOverride}
						/>
					</div>
				</div>
			);
		}
		return <div key={key} />;
	};

	const safeOnScroll = (e: ScrollParams): void => {
		const scrollTop = (e as { scrollTop: number }).scrollTop;
		if (typeof scrollTop !== 'number' || scrollTop === 0) {
			return;
		}
		writeSessionValue(ConfigKeys.GridScrollY, scrollTop.toString());
	};

	return (
		<div className='grid_container' ref={renderDivRef}>
			{pokemonInfoList.length === 0 && (
				<div>{translator(TranslatorKeys.PokemonNotFound, currentLanguage)}</div>
			)}
			{pokemonInfoList.length > 0 && (
				<AutoSizer>
					{({ height, width }: { height: number; width: number }) => (
						<Grid
							className='grid'
							cellRenderer={safeCellRenderer}
							rowCount={Math.ceil(pokemonInfoList.length / itemsPerRow) + 1}
							columnCount={itemsPerRow}
							height={height}
							width={
								containerRef.current ? containerRef.current.offsetWidth : 0
							}
							rowHeight={width / itemsPerRow - 1}
							columnWidth={width / itemsPerRow - 1}
							onScroll={safeOnScroll}
						/>
					)}
				</AutoSizer>
			)}
		</div>
	);
});

export default PokemonGrid;
