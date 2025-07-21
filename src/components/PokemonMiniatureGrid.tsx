import './PokemonMiniatureGrid.scss';

import React, { useEffect, useRef, useState } from 'react';
import type { GridCellProps } from 'react-virtualized';
import { AutoSizer, Grid } from 'react-virtualized';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { ListType } from '../views/pokedex';
import PokemonMiniature from './PokemonMiniature';

interface PokemonMiniatureGridProps {
	pokemonList: Array<IGamemasterPokemon>;
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	rankOverrides: Record<string, number>;
	listType: ListType;
	className?: string;
	parentRef?: React.RefObject<HTMLElement | null>;
}

const PokemonMiniatureGrid: React.FC<PokemonMiniatureGridProps> = ({
	pokemonList,
	gamemasterPokemon,
	rankOverrides,
	listType,
	className = '',
	parentRef,
}) => {
	const gridRef = useRef<Grid>(null);
	const [parentWidth, setParentWidth] = useState<number | null>(null);

	const getCardSize = (width: number) => (width <= 500 ? 70 : 100);

	useEffect(() => {
		if (!parentRef?.current) return;
		const updateWidth = () => setParentWidth(parentRef.current!.offsetWidth);
		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	}, [parentRef]);

	const cellRenderer = ({ columnIndex, rowIndex, key, style }: GridCellProps): React.ReactNode => {
		const itemsPerRow = gridRef.current?.props.columnCount ?? 3;
		const idx = rowIndex * itemsPerRow + columnIndex;
		if (idx >= pokemonList.length) return <div key={key} style={style} />;
		const p = pokemonList[idx];
		return (
			<div key={key} className='mini-card-wrapper-padding' style={style}>
				<div className='mini-card-wrapper'>
					<PokemonMiniature
						pokemon={gamemasterPokemon[p.speciesId]}
						withBackground={false}
						withNumber
						numberOverride={rankOverrides[p.speciesId]}
						listType={listType}
					/>
				</div>
			</div>
		);
	};

	const renderGrid = (width: number) => {
		const CARD_SIZE = getCardSize(width);
		const hardLimitOfCardsPerRow = width <= 500 ? 5 : 10;
		const itemsPerRow = Math.min(
			hardLimitOfCardsPerRow,
			Math.max(1, Math.floor(((parentWidth ?? width) - 20) / CARD_SIZE))
		);
		const gridWidth = parentWidth !== null ? parentWidth - 12 : itemsPerRow * CARD_SIZE;
		const rowCount = Math.ceil(pokemonList.length / itemsPerRow);
		const grid = (
			<div style={{ width: gridWidth }}>
				<Grid
					ref={gridRef}
					columnCount={itemsPerRow}
					rowCount={rowCount}
					height={
						window.innerHeight -
						(window.innerWidth <= 500 ? 86 : 56.13) -
						(window.innerWidth <= 500 ? 49.25 : 52.13) -
						(window.innerWidth <= 500 ? 99 : 119) -
						(window.innerWidth <= 500 ? 55 : 65)
					}
					columnWidth={CARD_SIZE}
					rowHeight={CARD_SIZE}
					width={gridWidth}
					cellRenderer={cellRenderer}
					style={{ outline: 'none' }}
				/>
			</div>
		);
		if (gridWidth < width) {
			return <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>{grid}</div>;
		}
		return grid;
	};

	return (
		<div className={className} style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
			<AutoSizer>{({ width }) => renderGrid(window.innerWidth)}</AutoSizer>
		</div>
	);
};

export default PokemonMiniatureGrid;
