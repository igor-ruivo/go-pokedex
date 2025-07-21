import './PokemonMiniatureGrid.scss';

import React, { useEffect, useRef, useState } from 'react';
import type { GridCellProps } from 'react-virtualized';
import { AutoSizer, Grid } from 'react-virtualized';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import useResize from '../hooks/useResize';
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
	const { x } = useResize();
	const [parentWidth, setParentWidth] = useState<number | null>(null);

	const getCardSize = (baseWidth: number, computedContainerWidth: number, itemsPerRow: number) => {
		if (baseWidth > 500) {
			return 100;
		}

		return computedContainerWidth / itemsPerRow;
	};

	const getItemsPerRow = (baseWidth: number, computedContainerWidth: number) => {
		if (baseWidth <= 381) {
			return 4;
		}

		if (baseWidth <= 500) {
			return 5;
		}

		return Math.max(1, Math.floor(computedContainerWidth / 100));
	};

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
						withTypes
						numberOverride={rankOverrides[p.speciesId]}
						listType={listType}
						megaBall={false}
						megaBackground={true}
					/>
				</div>
			</div>
		);
	};

	const renderGrid = (width: number) => {
		const computedContainerWidth = (parentWidth ?? width) - 20;
		const itemsPerRow = getItemsPerRow(width, computedContainerWidth);
		const CARD_SIZE = getCardSize(width, computedContainerWidth, itemsPerRow);
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
						(x <= 500 ? 86 : 56.13) -
						(x <= 500 ? 49.25 : 52.13) -
						(x <= 500 ? 99 : 119) -
						(x <= 500 ? 55 : 65)
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
			<AutoSizer>{({ width }) => renderGrid(x)}</AutoSizer>
		</div>
	);
};

export default PokemonMiniatureGrid;
