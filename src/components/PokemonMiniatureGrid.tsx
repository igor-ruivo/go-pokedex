import React, { useMemo, useRef } from 'react';
import { AutoSizer, Grid } from 'react-virtualized';
import PokemonMiniature from './PokemonMiniature';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { ListType } from '../views/pokedex';

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

	// Responsive columns: match the breakpoints from legacy grid
	const getItemsPerRow = (width: number) => {
		if (width >= 1600) return 7;
		if (width >= 1250) return 6;
		if (width >= 950) return 5;
		if (width >= 600) return 4;
		return 3;
	};

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

	const CARD_SIZE = 100;

	return (
		<div style={{ width: '100%' }} className={className}>
			<AutoSizer disableHeight>
				{({ width }) => {
					const itemsPerRow = Math.max(1, Math.floor(width / CARD_SIZE));
					const rowCount = Math.ceil(pokemonList.length / itemsPerRow);
					return (
						<Grid
							ref={gridRef}
							columnCount={itemsPerRow}
							rowCount={rowCount}
							columnWidth={CARD_SIZE}
							rowHeight={CARD_SIZE}
							height={rowCount * CARD_SIZE}
							width={width}
							cellRenderer={cellRenderer}
							style={{ outline: 'none' }}
						/>
					);
				}}
			</AutoSizer>
		</div>
	);
};

export default PokemonMiniatureGrid; 