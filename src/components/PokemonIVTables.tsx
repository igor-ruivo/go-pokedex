import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { computeBestIVs } from "../utils/pokemon-helper";
import "./PokemonIVTables.scss"
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import React from "react";
import { visuallyHidden } from '@mui/utils';
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import { LeagueType } from "../hooks/useLeague";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";

interface IPokemonIVTables {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
    levelCap: number;
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
}

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

const PokemonIVTables = ({pokemon, league, levelCap, attackIV, setAttackIV, defenseIV, setDefenseIV, hpIV, setHPIV}: IPokemonIVTables) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof Data>('top');

    const {gamemasterPokemon, fetchCompleted} = usePokemon();

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
        label: gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase(),
        dataKey: 'cp',
        sortable: true
        },
        {
        width: 60,
        label: translator(TranslatorKeys.LVL, currentLanguage),
        dataKey: 'lvl',
        sortable: true
        },
        {
        width: 60,
        label: translator(TranslatorKeys.ATK, currentLanguage),
        dataKey: 'attack',
        sortable: true
        },
        {
        width: 60,
        label: translator(TranslatorKeys.DEF, currentLanguage),
        dataKey: 'defense',
        sortable: true
        },
        {
        width: 60,
        label: translator(TranslatorKeys.HP, currentLanguage),
        dataKey: 'hp',
        sortable: true
        },
        {
        width: 100,
        label: translator(TranslatorKeys.Score, currentLanguage),
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
        case LeagueType.CUSTOM_CUP:
            cpCap = 1500;
            break;
    }

    const result = Object.values(computeBestIVs(pokemon.atk, pokemon.def, pokemon.hp, cpCap, levelCap)).flat();

    const highestScore = Math.round(result[0].battle.A * result[0].battle.D * result[0].battle.S);

    const rows: Data[] = result.map((e, index) => {
        return createData (
            index + 1,
            e.IVs.A + " / " + e.IVs.D + " / " + e.IVs.S,
            e.CP,
            e.L,
            +(Math.trunc(e.battle.A * 10) / 10).toFixed(1),
            +(Math.trunc(e.battle.D * 10) / 10).toFixed(1),
            e.battle.S,
            Math.round(e.battle.A * e.battle.D * e.battle.S),
            +(100 * (e.battle.A * e.battle.D * e.battle.S) / highestScore).toFixed(3) + "%"
        );
    });

    const visibleRows = React.useMemo(() => stableSort(rows, getComparator(order, orderBy)),
        [order, orderBy, rows]
    );

    if (!fetchCompleted || !gamemasterPokemon) {
        return <></>;
    }

    const VirtuosoTableComponents: TableComponents<Data> = {
        Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
            <TableContainer component={Paper} {...props} ref={ref} />
        )),
        Table: (props) => (
            <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
        ),
        TableHead,
        TableRow: ({ item: _item, ...props }) => <TableRow hover selected={props["data-index"] === 0} {...props} />,
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
        <div className="banner_layout">
            <div className="extra-ivs-options item default-padding">
                {translator(TranslatorKeys.SearchIVs, currentLanguage)}:
                <select value={attackIV} onChange={e => setAttackIV(+e.target.value)} className="select-level">
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
                <select value={defenseIV} onChange={e => setDefenseIV(+e.target.value)} className="select-level">
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
                <select value={hpIV} onChange={e => setHPIV(+e.target.value)} className="select-level">
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
            </div>
            <TableVirtuoso
                className="ivs-table item"
                data={visibleRows.sort((d1: Data, d2: Data) => {
                    if (d1.ivs === `${attackIV} / ${defenseIV} / ${hpIV}` && d2.ivs !== `${attackIV} / ${defenseIV} / ${hpIV}`) {
                        return -1;
                    }
                    if (d1.ivs !== `${attackIV} / ${defenseIV} / ${hpIV}` && d2.ivs === `${attackIV} / ${defenseIV} / ${hpIV}`) {
                        return 1;
                    }
                    return 0;
                })}
                components={VirtuosoTableComponents}
                fixedHeaderContent={fixedHeaderContent}
                itemContent={rowContent}
            />
        </div>
    );
}

export default PokemonIVTables;