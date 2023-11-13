import { useEffect, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { computeBestIVs, fetchPokemonFamily, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import "./PokemonIVTables.scss"
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import React from "react";
import { visuallyHidden } from '@mui/utils';
import { ListType } from "../views/pokedex";
import { Link, useLocation } from "react-router-dom";
import PokemonImage from "./PokemonImage";
import { usePokemon } from "../contexts/pokemon-context";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from "../utils/persistent-configs-handler";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";

interface IPokemonIVTables {
    pokemon: IGamemasterPokemon;
    league: ListType,
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

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
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

const PokemonIVTables = ({pokemon, league}: IPokemonIVTables) => {
    const [levelCap, setLevelCap] = useState(parsePersistentCachedNumberValue(ConfigKeys.LevelCap, 40));

    const {currentLanguage} = useLanguage();
    
    const [atkSearch, setAtkSearch] = useState<number|undefined>(undefined);
    const [defSearch, setDefSearch] = useState<number|undefined>(undefined);
    const [hpSearch, setHpSearch] = useState<number|undefined>(undefined);

    const ivSearchIsSet = atkSearch !== undefined && defSearch !== undefined && hpSearch !== undefined;

    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof Data>('top');

    const {gamemasterPokemon, fetchCompleted, errors} = usePokemon();
    const {pathname} = useLocation();

    useEffect(() => {
        writePersistentValue(ConfigKeys.LevelCap, levelCap.toString());
    }, [levelCap]);

    useEffect(() => {
        writeSessionValue(ConfigKeys.LastListType, JSON.stringify(league));
    }, [league]);

    const columns: ColumnData[] = [
        {
        width: 70,
        label: '#',
        dataKey: 'top',
        sortable: true
        },
        {
        width: 120,
        label: translator(TranslatorKeys.IVs, currentLanguage),
        dataKey: 'ivs',
        sortable: false
        },
        {
        width: 70,
        label: translator(TranslatorKeys.CP, currentLanguage),
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
        label: 'Def',
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
        case ListType.GREAT_LEAGUE:
            cpCap = 1500;
            break;
        case ListType.ULTRA_LEAGUE:
            cpCap = 2500;
            break;
        case ListType.MASTER_LEAGUE:
            cpCap = Number.MAX_VALUE;
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
        [order, orderBy, rows, levelCap, league]
    );

    if (!fetchCompleted || !gamemasterPokemon) {
        return <></>;
    }

    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);

    const VirtuosoTableComponents: TableComponents<Data> = {
        Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
            <TableContainer component={Paper} {...props} ref={ref} />
        )),
        Table: (props) => (
            <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} />
        ),
        TableHead,
        TableRow: ({ item: _item, ...props }) => <TableRow hover selected={ivSearchIsSet && props["data-index"] === 0} {...props} />,
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

    const valueToLevel = (value: number) => {
        return value / 2 + 0.5
    }

    return (
        <div className="banner_layout">
            <div className="extra-ivs-options">
                <select value={levelCap} onChange={e => setLevelCap(+e.target.value)} className="select-level">
                    {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                        .map(e => (<option key={e} value={e}>{translator(TranslatorKeys.MaxLvl, currentLanguage)} {e}</option>))}
                </select>
                &nbsp;&nbsp;&nbsp;{translator(TranslatorKeys.SearchIVs, currentLanguage)}:
                <select value={atkSearch ?? ""} onChange={e => setAtkSearch(e.target.value === "-" ? undefined : +e.target.value)} className="select-level">
                    <option key={"unset"} value={undefined}>-</option>
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
                <select value={defSearch ?? ""} onChange={e => setDefSearch(e.target.value === "-" ? undefined : +e.target.value)} className="select-level">
                    <option key={"unset"} value={undefined}>-</option>
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
                <select value={hpSearch ?? ""} onChange={e => setHpSearch(e.target.value === "-" ? undefined : +e.target.value)} className="select-level">
                    <option key={"unset"} value={undefined}>-</option>
                    {Array.from({length: 16}, (_x, i) => i)
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>
            </div>
            {similarPokemon.size > 1 && <div className="img-container">
                <div className="img-family">
                    {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                        <div key = {p.speciesId} className="img-family-container">
                            <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                <PokemonImage pokemon={p} withName={false} withMetadata={false}/>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>}
            <TableVirtuoso
                className="ivs-table"
                data={visibleRows.sort((d1: Data, d2: Data) => {
                    if (ivSearchIsSet && d1.ivs === `${atkSearch} / ${defSearch} / ${hpSearch}` && d2.ivs !== `${atkSearch} / ${defSearch} / ${hpSearch}`) {
                        return -1;
                    }
                    if (ivSearchIsSet && d1.ivs !== `${atkSearch} / ${defSearch} / ${hpSearch}` && d2.ivs === `${atkSearch} / ${defSearch} / ${hpSearch}`) {
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