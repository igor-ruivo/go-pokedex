import { useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { computeBestIVs } from "../utils/pokemon-helper";
import "./PokemonIVTables.scss"
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import React from "react";
import { visuallyHidden } from '@mui/utils';

interface IPokemonIVTables {
    pokemon: IGamemasterPokemon;
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
}

const columns: ColumnData[] = [
    {
      width: 70,
      label: '#',
      dataKey: 'top',
      sortable: true
    },
    {
      width: 120,
      label: 'IVs',
      dataKey: 'ivs',
      sortable: false
    },
    {
      width: 70,
      label: 'CP',
      dataKey: 'cp',
      sortable: true
    },
    {
      width: 60,
      label: 'LVL',
      dataKey: 'lvl',
      sortable: true
    },
    {
      width: 60,
      label: 'Atk',
      dataKey: 'attack',
      sortable: true
    },
    {
      width: 60,
      label: 'Def',
      dataKey: 'defense',
      sortable: true
    },
    {
      width: 60,
      label: 'HP',
      dataKey: 'hp',
      sortable: true
    },
    {
      width: 100,
      label: 'Score',
      dataKey: 'product',
      sortable: true
    },
    {
      width: 100,
      label: '%',
      dataKey: 'productPercentage',
      sortable: false
    }
];

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

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (
    a: { [key in Key]: number | string },
    b: { [key in Key]: number | string },
) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
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

const PokemonIVTables = ({pokemon}: IPokemonIVTables) => {
    const [levelCap, setLevelCap] = useState(51);
    const [league, setLeague] = useState("great");
    
    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof Data>('top');

    const resGL = Object.values(computeBestIVs(pokemon.atk, pokemon.def, pokemon.hp, 1500, levelCap)).flat();
    const resUL = Object.values(computeBestIVs(pokemon.atk, pokemon.def, pokemon.hp, 2500, levelCap)).flat();
    const resML = Object.values(computeBestIVs(pokemon.atk, pokemon.def, pokemon.hp, Number.MAX_VALUE, levelCap)).flat();    

    const highestScoreGL = Math.round(resGL[0].battle.A * resGL[0].battle.D * resGL[0].battle.S);
    const highestScoreUL = Math.round(resUL[0].battle.A * resUL[0].battle.D * resUL[0].battle.S);
    const highestScoreML = Math.round(resML[0].battle.A * resML[0].battle.D * resML[0].battle.S);

    const rows: Data[] = resGL.map((e, index) => {
        return createData (
            index + 1,
            e.IVs.A + " / " + e.IVs.D + " / " + e.IVs.S,
            e.CP,
            e.L,
            +(Math.trunc(e.battle.A * 10) / 10).toFixed(1),
            +(Math.trunc(e.battle.D * 10) / 10).toFixed(1),
            e.battle.S,
            Math.round(e.battle.A * e.battle.D * e.battle.S),
            (100 * (e.battle.A * e.battle.D * e.battle.S) / highestScoreGL).toFixed(3) + "%"
        );
    });

    const visibleRows = React.useMemo(() => stableSort(rows, getComparator(order, orderBy)),
        [order, orderBy]
    );

    const VirtuosoTableComponents: TableComponents<Data> = {
        Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
            <TableContainer component={Paper} {...props} ref={ref} />
        )),
        Table: (props) => (
            <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
        ),
        TableHead,
        TableRow: ({ item: _item, ...props }) => <TableRow hover {...props} />,
        TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
            <TableBody {...props} ref={ref} />
        )),
    };

    const fixedHeaderContent = () => {
        return (
            <TableRow hover>
                {columns.map((column) => (
                    <TableCell
                        key={column.dataKey}
                        variant="head"
                        align={"center"}
                        style={{ width: column.width }}
                        sx={{
                            backgroundColor: 'background.paper',
                        }}
                        sortDirection={column.sortable && orderBy === column.dataKey ? order : false}
                    >
                        {column.sortable ? <TableSortLabel
                            active={orderBy === column.dataKey}
                            direction={orderBy === column.dataKey ? order : "asc"}
                            onClick={() => {
                                setOrderBy(column.dataKey);
                                setOrder(previousOrder => previousOrder === "asc" ? "desc" : "asc");
                            }}
                        >
                            {column.label}
                            {orderBy === column.dataKey ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === "desc" ? "sorted descending" : "sorted ascending"}
                                </Box>
                            ) : null}
                        </TableSortLabel> : column.label}
                    </TableCell>
                ))}
            </TableRow>
        );
    }

    function rowContent(_index: number, row: Data) {
        return (
            <React.Fragment>
                {columns.map((column) => (
                    <TableCell
                        key={column.dataKey}
                        align={"center"}
                    >
                        {row[column.dataKey]}
                    </TableCell>
                ))}
            </React.Fragment>
        );
    }

    return (
            <TableVirtuoso
                className="ivs-table"
                data={visibleRows}
                components={VirtuosoTableComponents}
                fixedHeaderContent={fixedHeaderContent}
                itemContent={rowContent}
            />
    );
}

export default PokemonIVTables;