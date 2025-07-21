import './PokemonMiniatureGrid.scss';

import React, { useMemo, useRef } from 'react';
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
}

const PokemonMiniatureGrid: React.FC<PokemonMiniatureGridProps> = ({
	pokemonList,
	gamemasterPokemon,
	rankOverrides,
	listType,
	className = '',
}) => {
	const gridRef = useRef<Grid>(null);

	const getCardSize = (width: number) => (width < 500 ? 70 : 100);

	const cellRenderer = ({ columnIndex, rowIndex, key, style }: any) => {
		const itemsPerRow = gridRef.current?.props.columnCount || 3;
		const idx = rowIndex * itemsPerRow + columnIndex;
		if (idx >= pokemonList.length) return <div key={key} style={style} />;
		const p = pokemonList[idx];
		return (
			<div key={key} className="mini-card-wrapper-padding dynamic-size" style={style}>
				<div className="mini-card-wrapper">
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

	return (
		<div style={{ width: '100%' }} className={className}>
			<AutoSizer disableHeight>
				{({ width }) => {
					const CARD_SIZE = getCardSize(width);
					const maxColumns = width <= 500 ? 5 : 10;
					const itemsPerRow = Math.min(maxColumns, Math.max(1, Math.floor(width / CARD_SIZE)));
					const rowCount = Math.ceil(pokemonList.length / itemsPerRow);
					const gridWidth = itemsPerRow * CARD_SIZE;
					return (
						<div style={{ width: gridWidth, margin: '0 auto' }}>
							<Grid
								ref={gridRef}
								columnCount={itemsPerRow}
								rowCount={rowCount}
								height={rowCount * CARD_SIZE}
								columnWidth={CARD_SIZE}
								rowHeight={CARD_SIZE}
								width={gridWidth}
								cellRenderer={cellRenderer}
								style={{ outline: 'none' }}
							/>
						</div>
					);
				}}
			</AutoSizer>
		</div>
	);
};

export default PokemonMiniatureGrid; 