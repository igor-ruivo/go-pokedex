import './PokemonIVTables.scss';

import { TableCell, TableRow, TableSortLabel } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import type { ComponentProps, TableHTMLAttributes } from 'react';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso } from 'react-virtuoso';

import { useLanguage } from '../contexts/language-context';
import { usePokemon } from '../contexts/pokemon-context';
import { customCupCPLimit } from '../contexts/pvp-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { LeagueType } from '../hooks/useLeague';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { computeBestIVs } from '../utils/pokemon-helper';
import translator, { TranslatorKeys } from '../utils/Translator';
import LoadingRenderer from './LoadingRenderer';

interface IPokemonIVTables {
	pokemon: IGamemasterPokemon;
	league: LeagueType;
	attackIV: number;
	setAttackIV: React.Dispatch<React.SetStateAction<number>>;
	defenseIV: number;
	setDefenseIV: React.Dispatch<React.SetStateAction<number>>;
	hpIV: number;
	setHPIV: React.Dispatch<React.SetStateAction<number>>;
}

interface Data {
	top: number;
	ivs: string;
	cp: number;
	lvl: number;
	attack: number;
	defense: number;
	hp: number;
	product: number;
	productPercentage: string;
}

interface ColumnData {
	dataKey: keyof Data;
	label: string;
	sortable: boolean;
	width: number;
}

const createData = (
	top: number,
	ivs: string,
	cp: number,
	lvl: number,
	attack: number,
	defense: number,
	hp: number,
	product: number,
	productPercentage: string
): Data => {
	return { top, ivs, cp, lvl, attack, defense, hp, product, productPercentage };
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
	if (b[orderBy] < a[orderBy]) {
		return -1;
	}
	if (b[orderBy] > a[orderBy]) {
		return 1;
	}
	return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof Data>(order: Order, orderBy: Key): (a: Data, b: Data) => number {
	return order === 'desc'
		? (a, b) => descendingComparator(a, b, orderBy)
		: (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: ReadonlyArray<T>, comparator: (a: T, b: T) => number) {
	const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
	stabilizedThis.sort((a, b) => {
		const order = comparator(a[0], b[0]);
		if (order !== 0) {
			return order;
		}
		return a[1] - b[1];
	});
	return stabilizedThis.map((el) => el[0]);
}

interface VirtuosoTableRowProps extends ComponentProps<typeof TableRow> {
	'item': Data;
	'data-index': number;
	'data-item-group-index'?: number;
	'data-item-index': number;
	'data-known-size': number;
	'context': unknown;
}

const VirtuosoTableRow: React.FC<VirtuosoTableRowProps> = (props) => {
	const { 'data-index': dataIndex, ...rest } = props;
	return <TableRow hover data-index={dataIndex} {...rest} />;
};
VirtuosoTableRow.displayName = 'VirtuosoTableRow';

const PokemonIVTables: React.FC<IPokemonIVTables> = ({
	pokemon,
	league,
	attackIV,
	setAttackIV,
	defenseIV,
	setDefenseIV,
	hpIV,
	setHPIV,
}) => {
	const { currentLanguage, currentGameLanguage } = useLanguage();
	const [order, setOrder] = useState<Order>('asc');
	const [orderBy, setOrderBy] = useState<keyof Data>('top');

	const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();

	const columns: Array<ColumnData> = useMemo(
		() => [
			{
				width: 70,
				label: '#',
				dataKey: 'top',
				sortable: true,
			},
			{
				width: 120,
				label: 'IVs',
				dataKey: 'ivs',
				sortable: false,
			},
			{
				width: 70,
				label: gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase(),
				dataKey: 'cp',
				sortable: true,
			},
			{
				width: 60,
				label: translator(TranslatorKeys.LVL, currentLanguage),
				dataKey: 'lvl',
				sortable: true,
			},
			{
				width: 60,
				label: translator(TranslatorKeys.ATK, currentLanguage),
				dataKey: 'attack',
				sortable: true,
			},
			{
				width: 60,
				label: translator(TranslatorKeys.DEF, currentLanguage),
				dataKey: 'defense',
				sortable: true,
			},
			{
				width: 60,
				label: translator(TranslatorKeys.HP, currentLanguage),
				dataKey: 'hp',
				sortable: true,
			},
			{
				width: 100,
				label: translator(TranslatorKeys.Score, currentLanguage),
				dataKey: 'product',
				sortable: true,
			},
			{
				width: 100,
				label: '%',
				dataKey: 'productPercentage',
				sortable: false,
			},
		],
		[currentGameLanguage, currentLanguage]
	);

	let cpCap = Number.MAX_VALUE;

	switch (league) {
		case LeagueType.GREAT_LEAGUE:
			cpCap = 1500;
			break;
		case LeagueType.ULTRA_LEAGUE:
			cpCap = 2500;
			break;
		case LeagueType.MASTER_LEAGUE:
			cpCap = Number.MAX_VALUE;
			break;
		case LeagueType.RAID:
			cpCap = Number.MAX_VALUE;
			break;
		case LeagueType.CUSTOM_CUP:
			cpCap = customCupCPLimit;
			break;
	}

	const result = useMemo(
		() =>
			Object.values(computeBestIVs(pokemon.baseStats.atk, pokemon.baseStats.def, pokemon.baseStats.hp, cpCap)).flat(),
		[pokemon, cpCap]
	);

	const highestScore = useMemo(
		() => Math.round(result[0].battle.A * result[0].battle.D * result[0].battle.S),
		[result]
	);

	const rows: Array<Data> = useMemo(
		() =>
			result.map((e, index) => {
				return createData(
					index + 1,
					e.IVs.A + ' / ' + e.IVs.D + ' / ' + e.IVs.S,
					e.CP,
					e.L,
					+(Math.trunc(e.battle.A * 10) / 10).toFixed(1),
					+(Math.trunc(e.battle.D * 10) / 10).toFixed(1),
					e.battle.S,
					Math.round(e.battle.A * e.battle.D * e.battle.S),
					+((100 * (e.battle.A * e.battle.D * e.battle.S)) / highestScore).toFixed(3) + '%'
				);
			}),
		[result, highestScore]
	);

	const visibleRows = useMemo(() => stableSort(rows, getComparator(order, orderBy)), [order, orderBy, rows]);

	const VirtuosoTableComponents: TableComponents<Data> = {
		Scroller: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function VirtuosoScroller(props, ref) {
			return <div {...props} ref={ref} />;
		}),
		Table: forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(function VirtuosoTable(props, ref) {
			const { style, ...rest } = props;
			return (
				<table
					{...rest}
					ref={ref}
					style={{
						...(style ?? {}),
						borderCollapse: 'separate',
						tableLayout: 'fixed',
						width: '100%',
					}}
				/>
			);
		}),
		TableHead: function VirtuosoTableHead(props) {
			return <thead {...props} className='MuiTableHead-root' />;
		},
		TableRow: forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { 'data-index'?: number }>(
			function VirtuosoTableRowComponent(props, ref) {
				const dataIndex = props['data-index'];
				return (
					<tr
						{...props}
						ref={ref}
						className={`MuiTableRow-root MuiTableRow-hover ${dataIndex === 0 ? 'Mui-selected' : ''}`}
					/>
				);
			}
		),
		TableBody: forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
			function VirtuosoTableBodyComponent(props, ref) {
				return <tbody {...props} ref={ref} className='MuiTableBody-root' />;
			}
		),
	};

	const fixedHeaderContent = useCallback(() => {
		return (
			<TableRow hover className='MuiTableRow-root'>
				{columns.map((column) => (
					<TableCell
						key={column.dataKey}
						className='important-text MuiTableCell-head'
						variant='head'
						align={'center'}
						style={{ width: column.width }}
						sx={{
							backgroundColor: 'background.paper',
						}}
						sortDirection={column.sortable && orderBy === column.dataKey ? order : false}
					>
						{column.sortable ? (
							<TableSortLabel
								active={orderBy === column.dataKey}
								direction={orderBy === column.dataKey ? order : 'asc'}
								onClick={() => {
									setOrderBy(column.dataKey);
									setOrder((previousOrder) => (previousOrder === 'asc' ? 'desc' : 'asc'));
								}}
							>
								{column.label}
								{orderBy === column.dataKey ? (
									<span style={visuallyHidden}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</span>
								) : null}
							</TableSortLabel>
						) : (
							column.label
						)}
					</TableCell>
				))}
			</TableRow>
		);
	}, [columns, order, orderBy]);

	const rowContent = useCallback(
		(index: number, row: Data) => {
			return (
				<>
					{columns.map((column) => (
						<TableCell key={column.dataKey} align={'center'} className='normal-text MuiTableCell-body'>
							{row[column.dataKey]}
						</TableCell>
					))}
				</>
			);
		},
		[columns]
	);

	return (
		<LoadingRenderer errors={errors} completed={fetchCompleted && !!gamemasterPokemon}>
			{() =>
				fetchCompleted &&
				!!gamemasterPokemon &&
				(league !== LeagueType.RAID ? (
					<div className='banner_layout normal-text'>
						<div className='extra-ivs-options item default-padding'>
							<div className='with-padding'>
								{translator(TranslatorKeys.SearchIVs, currentLanguage)}:
								<select value={attackIV} onChange={(e) => setAttackIV(+e.target.value)} className='select-level'>
									{Array.from({ length: 16 }, (_x, i) => i).map((e) => (
										<option key={e} value={e}>
											{e}
										</option>
									))}
								</select>
								<select value={defenseIV} onChange={(e) => setDefenseIV(+e.target.value)} className='select-level'>
									{Array.from({ length: 16 }, (_x, i) => i).map((e) => (
										<option key={e} value={e}>
											{e}
										</option>
									))}
								</select>
								<select value={hpIV} onChange={(e) => setHPIV(+e.target.value)} className='select-level'>
									{Array.from({ length: 16 }, (_x, i) => i).map((e) => (
										<option key={e} value={e}>
											{e}
										</option>
									))}
								</select>
							</div>
						</div>
						<TableVirtuoso
							className='ivs-table item'
							data={visibleRows.sort((d1: Data, d2: Data) => {
								if (
									d1.ivs === `${attackIV} / ${defenseIV} / ${hpIV}` &&
									d2.ivs !== `${attackIV} / ${defenseIV} / ${hpIV}`
								) {
									return -1;
								}
								if (
									d1.ivs !== `${attackIV} / ${defenseIV} / ${hpIV}` &&
									d2.ivs === `${attackIV} / ${defenseIV} / ${hpIV}`
								) {
									return 1;
								}
								return 0;
							})}
							components={VirtuosoTableComponents}
							fixedHeaderContent={fixedHeaderContent}
							itemContent={rowContent}
						/>
					</div>
				) : (
					<div className='item default-padding centered normal-text'>
						<span className='with-padding'>
							{translator(TranslatorKeys.NotAvailableForRaids, currentLanguage)}{' '}
							{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}.
						</span>
					</div>
				))
			}
		</LoadingRenderer>
	);
};

export default PokemonIVTables;
