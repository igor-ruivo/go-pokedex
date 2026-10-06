import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { TFunction } from 'i18next';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CounterRankRow } from '../components/CounterRankRow';
import { CustomLeaguePicker } from '../components/CustomLeaguePicker';
import { AppliedFilters, FilterBar } from '../components/FilterBar';
import { LeaguePicker, type LeaguePickerItem } from '../components/LeaguePicker';
import { ListBar } from '../components/ListBar';
import { type CardMetric, PokeCard } from '../components/PokeCard';
import { SortBar, type SortDir, type SortOption } from '../components/SortBar';
import { spriteUrl } from '../components/Sprite';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { type GameLanguage, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { usePlayOnChange } from '../hooks/usePlayOnChange';
import { COMBAT_METRICS, type CombatMetric, isCombatMetric } from '../lib/combat';
import { combatMetricDescriptions, combatMetricNames } from '../lib/combat-text';
import { cleanName, sentenceCase } from '../lib/format';
import { leagueIcon } from '../lib/league-visuals';
import { isKnownRankingMode, modeColor, modeLabel, modeLabelLong, R, type RankingMode } from '../lib/nav';
import { fmtRaidMetric, RAID_METRIC_LABEL, RAID_METRIC_SORTS, type RaidMetric } from '../lib/raid-metric';
import { RAID_TYPE_KEYS, TYPE_KEYS, typeKey, typeVar } from '../lib/types';
import { useLeagueDefinitions } from '../queries/leagues';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import { useGameTranslationsData } from '../utils/game-translations-store';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';
import { calculateCP } from '../utils/pokemon-helper';

const usePokedexSorts = (t: TFunction<['rankings', 'pokemonDetail']>, gl: GameLanguage): ReadonlyArray<SortOption> => [
	{ key: 'dex', label: t('rankings:sorts.dex'), defaultDir: 'asc' },
	{ key: 'name', label: t('rankings:sorts.name'), defaultDir: 'asc' },
	{
		key: 'cp',
		label: t('rankings:sorts.cp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) }),
		defaultDir: 'desc',
	},
	{ key: 'type', label: t('rankings:sorts.type'), defaultDir: 'asc' },
	{ key: 'atk', label: t('pokemonDetail:hero.stats.atk'), defaultDir: 'desc' },
	{ key: 'def', label: t('pokemonDetail:hero.stats.def'), defaultDir: 'desc' },
	{ key: 'hp', label: t('pokemonDetail:hero.stats.hp'), defaultDir: 'desc' },
	{ key: 'prod', label: t('rankings:sorts.statProduct'), defaultDir: 'desc' },
];

/** Base-stat figures the Pokédex can be sorted by (shown on the tile as "Pts"). */
const STAT_SORT_KEYS = ['atk', 'def', 'hp', 'prod'];
const statOf = (p: IGamemasterPokemon, key: string): number | undefined =>
	key === 'atk'
		? p.baseStats.atk
		: key === 'def'
			? p.baseStats.def
			: key === 'hp'
				? p.baseStats.hp
				: key === 'prod'
					? p.baseStats.atk * p.baseStats.def * p.baseStats.hp
					: undefined;

/** PvP leagues: "Overall" (the ranking's own order, the default) plus PvPoke's six role scores. */
const usePvpSorts = (t: TFunction<['rankings', 'pokemonDetail']>): ReadonlyArray<SortOption> => {
	const names = combatMetricNames(t);
	return [
		{ key: 'overall', label: t('rankings:sorts.overall'), defaultDir: 'asc' },
		...COMBAT_METRICS.map((m) => ({ key: m, label: names[m], defaultDir: 'desc' as const })),
	];
};

interface Row {
	pokemon: IGamemasterPokemon;
	metric?: CardMetric;
	moves?: Array<string>;
}

type PokedexGridRow =
	| { kind: 'cards'; rows: Array<Row> }
	| { kind: 'rank'; row: Row }
	| { kind: 'region'; name: string };

const POKEDEX_REGIONS: ReadonlyArray<{ name: string; maxDex: number }> = [
	{ name: 'Kanto', maxDex: 151 },
	{ name: 'Johto', maxDex: 251 },
	{ name: 'Hoenn', maxDex: 386 },
	{ name: 'Sinnoh', maxDex: 493 },
	{ name: 'Unova', maxDex: 649 },
	{ name: 'Kalos', maxDex: 721 },
	{ name: 'Alola', maxDex: 809 },
	{ name: 'Galar', maxDex: 898 },
	{ name: 'Hisui', maxDex: 905 },
	{ name: 'Paldea', maxDex: 1025 },
];

const pokedexRegion = (dex: number) => POKEDEX_REGIONS.find(({ maxDex }) => dex <= maxDex)?.name ?? 'Other';

const GRID_GAP = 8;
const RANK_ROW_HEIGHT = 72;
const RANK_ROW_GAP = 6;
const REGION_HEADER_HEIGHT = 34;

/**
 * Column count + exact row height for the square-tile grid. Rows are uniform, so
 * we feed the height straight to `estimateSize` and skip react-virtual's
 * per-element `measureElement` — that ref callback calls `flushSync` during
 * commit and warns when a route transition is still rendering.
 */
const useGridMetrics = (ref: React.RefObject<HTMLElement | null>) => {
	// The first layout-effect measurement gives the grid its actual dimensions
	// before paint; ResizeObserver keeps those measurements current afterwards.
	const [metrics, setMetrics] = useState({ cols: 4, rowHeight: 96, measured: false });
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			const w = el.clientWidth;
			if (!w) return;
			const cols = Math.min(10, Math.max(4, Math.floor(w / 88)));
			const cardWidth = (w - (cols - 1) * GRID_GAP) / cols; // tiles are squares
			setMetrics((prev) => {
				// `Math.ceil`, not `round`: the CSS grid's `1fr` columns don't divide
				// evenly, so the browser hands any leftover pixel(s) to one column —
				// that column's square (aspect-ratio: 1) tile ends up a pixel taller
				// than this average. Rounding down sometimes made the virtualizer's
				// single fixed row height fall a pixel short of that, which is what
				// let rows overlap or gap unevenly depending on the exact width.
				const rowHeight = Math.max(1, Math.ceil(cardWidth));
				return prev.cols === cols && prev.rowHeight === rowHeight && prev.measured
					? prev
					: { cols, rowHeight, measured: true };
			});
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return metrics;
};

const Rankings = () => {
	const { t } = useTranslation(['rankings', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const POKEDEX_SORTS = usePokedexSorts(t, gl);
	const PVP_SORTS = usePvpSorts(t);
	const { league, type: typeParam } = useParams();
	const { leagues } = useLeagueDefinitions();
	const mode: RankingMode = league && isKnownRankingMode(league, leagues) ? league : 'pokedex';
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const [hintOpen, setHintOpen] = useState(false);
	const q = (params.get('q') ?? '').toLowerCase().trim();
	const isPokedex = mode === 'pokedex';
	const isRaid = mode === 'raid';
	// Switching the league/mode tab is a deliberate "start over" action here —
	// unlike a Pokémon page's tabs (see useScrollToTopOnNavigate's `pageFamily`,
	// which treats all of /rankings as one page precisely so this component
	// doesn't remount on every tab/type/sort change), scrolling back to the top
	// of the *new* tab's list is what you'd actually want after picking it.
	const lastMode = useRef(mode);
	useLayoutEffect(() => {
		if (lastMode.current !== mode) {
			lastMode.current = mode;
			window.scrollTo(0, 0);
		}
	}, [mode]);
	// `/rankings/raid/:type` (a real, crawlable URL per type — see R.rankings)
	// only ever *seeds* the type when `?type=` isn't already set; from then on
	// the query param — what the FilterBar actually writes to — is the single
	// source of truth, so the two never end up fighting each other.
	const typeSeed = isRaid && typeParam && RAID_TYPE_KEYS.includes(typeParam) ? typeParam : '';
	const selectedTypes = (params.get('type') ?? typeSeed)
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean)
		.filter((t) => (isRaid ? RAID_TYPE_KEYS : TYPE_KEYS).includes(t))
		.slice(0, isRaid ? 1 : 2);
	const raidType = isRaid ? (selectedTypes[0] ?? '') : '';

	const sortKey = params.get('sort') ?? 'dex';
	const sortDir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
	// PvP leagues: any unknown/absent `sort` (a stale Pokédex value, a hand-edited
	// URL) falls back to the ranking's own order.
	const pvpSort: CombatMetric | 'overall' = isCombatMetric(sortKey) ? sortKey : 'overall';
	const pvpDir: SortDir = pvpSort === 'overall' ? sortDir : params.get('dir') === 'asc' ? 'asc' : 'desc';

	// which figure (DPS/TDO) to rank by is a device-wide setting, shared with
	// the Counters tab and Settings — not a per-page URL param.
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { maxLevelIndex } = useBestBuddy();
	// raid rankings default to descending (best first); pokedex defaults to asc.
	const raidDir: SortDir = params.get('dir') === 'asc' ? 'asc' : 'desc';

	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, extraRankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { moves } = useMoves();
	const isPvpLeagueMode = mode !== 'pokedex' && mode !== 'raid';
	// `pickerItems` below reads `gameTranslator()` inside a `useMemo` — per
	// `useGameTranslationsData`'s own doc comment, that memo needs the
	// snapshot itself in its dependency array, or it can get stuck on
	// whatever `gameTranslator()` returned on the very first render (typically
	// '', since the fetch hasn't resolved yet — the static Great/Ultra/
	// Master/Raid chips would otherwise fall back to their default English
	// text below and *stay* there even once the real translation loads).
	const gameTranslations = useGameTranslationsData();
	// The picker itself (not the rest of the page — see the reverted full-page
	// gate this replaced) holds off rendering until translations land, rather
	// than flashing default-English/stripped-PvPoke-title chips for a beat.
	// Bounded by a timeout rather than gated unconditionally: if the fetch is
	// ever slow, blocked, or fails outright, the picker still shows up (with
	// LEAGUES's own default-English text) instead of staying empty forever.
	const [translationsWaitTimedOut, setTranslationsWaitTimedOut] = useState(false);
	useEffect(() => {
		if (gameTranslations) return;
		const id = window.setTimeout(() => setTranslationsWaitTimedOut(true), 4000);
		return () => window.clearTimeout(id);
	}, [gameTranslations]);
	const pickerReady = !!gameTranslations || translationsWaitTimedOut;

	const typeCsv = selectedTypes.join(',');
	const rows: Array<Row> = useMemo(() => {
		if (!fetchCompleted) return [];
		const wanted = typeCsv ? typeCsv.split(',') : [];
		// two types → the mon must have BOTH
		const byType = (p: IGamemasterPokemon) => {
			if (wanted.length === 0) return true;
			const has = p.types.map((t) => typeKey(t));
			return wanted.every((w) => has.includes(w));
		};
		const byName = (p: IGamemasterPokemon) => !q || cleanName(p.speciesName).toLowerCase().includes(q);
		const isDexSort = !['name', 'cp', 'type', ...STAT_SORT_KEYS].includes(sortKey);

		if (mode === 'pokedex') {
			const s = sortDir === 'asc' ? 1 : -1;
			const isStatSort = STAT_SORT_KEYS.includes(sortKey);
			return (
				Object.values(gamemasterPokemon)
					.filter((p) => !p.aliasId && !p.isShadow)
					.map((pokemon) => ({
						pokemon,
						cp: calculateCP(
							pokemon.baseStats.atk,
							15,
							pokemon.baseStats.def,
							15,
							pokemon.baseStats.hp,
							15,
							maxLevelIndex
						),
						stat: statOf(pokemon, sortKey),
					}))
					.sort((a, b) => {
						switch (sortKey) {
							case 'name':
								return s * a.pokemon.speciesName.localeCompare(b.pokemon.speciesName);
							case 'cp':
								return s * (a.cp - b.cp) || a.pokemon.dex - b.pokemon.dex;
							case 'type': {
								const at = a.pokemon.types.map((t) => typeKey(t)).join('/');
								const bt = b.pokemon.types.map((t) => typeKey(t)).join('/');
								return s * at.localeCompare(bt) || a.pokemon.dex - b.pokemon.dex;
							}
							case 'atk':
							case 'def':
							case 'hp':
							case 'prod':
								return s * ((a.stat ?? 0) - (b.stat ?? 0)) || a.pokemon.dex - b.pokemon.dex;
							default:
								return (
									s * (a.pokemon.dex - b.pokemon.dex || a.pokemon.speciesName.localeCompare(b.pokemon.speciesName))
								);
						}
					})
					// Outside a Pokédex-number sort the corner number is the position in
					// the *full* sorted list (a type/name filter doesn't renumber it).
					.map((x, i) => ({ ...x, position: i + 1 }))
					.filter((x) => byType(x.pokemon) && byName(x.pokemon))
					.map(({ pokemon, cp, stat, position }) => ({
						pokemon,
						metric: {
							...(isDexSort ? {} : { rank: position }),
							...(isStatSort && stat !== undefined ? { pts: stat } : { cp }),
						},
					}))
			);
		}

		if (mode === 'raid') {
			// No generic "all types" list any more — a type must be picked.
			if (!raidDPSFetchCompleted || !wanted[0]) return [];
			const list = raidDPS[wanted[0]] ?? {};
			const s = raidDir === 'asc' ? 1 : -1;
			// Rank has to come from position in the *full* sorted list — filtering
			// by the search term first and then numbering what's left 1, 2, 3…
			// gives a search hit its position among just the other search hits,
			// not its actual rank among every attacker of this type.
			return Object.values(list)
				.filter((e) => {
					const p = gamemasterPokemon[e.speciesId];
					return p && !p.aliasId;
				})
				.sort((a, b) => s * ((a[raidMetric] ?? 0) - (b[raidMetric] ?? 0)))
				.map((e, i) => ({
					pokemon: gamemasterPokemon[e.speciesId],
					// Medals only when the list reads best-first.
					metric: { rank: i + 1, ...(raidDir === 'desc' ? { podium: true } : {}), [raidMetric]: e[raidMetric] },
					moves: [e.fastMove, e.chargedMove],
				}))
				.filter((row) => byName(row.pokemon));
		}

		// pvp league — the static three read `rankLists` (positional), any
		// rotating/custom cup reads `extraRankLists` (keyed by league id).
		if (!pvpFetchCompleted) return [];
		const list =
			mode === 'great'
				? rankLists[0]
				: mode === 'ultra'
					? rankLists[1]
					: mode === 'master'
						? rankLists[2]
						: (extraRankLists[mode] ?? {});
		const ps = pvpDir === 'asc' ? 1 : -1;
		const isOverall = pvpSort === 'overall' && pvpDir === 'asc';
		return (
			Object.values(list)
				.map((r) => ({ r, p: gamemasterPokemon[r.speciesId] }))
				.filter((x) => x.p && !x.p.aliasId)
				// Ties fall back to the overall rank (best first, whichever way the
				// list is flipped), then to Pokédex number.
				.sort((a, b) =>
					pvpSort === 'overall'
						? ps * (a.r.rank - b.r.rank) || a.p.dex - b.p.dex
						: ps * (a.r[pvpSort] - b.r[pvpSort]) || a.r.rank - b.r.rank || a.p.dex - b.p.dex
				)
				// The corner number is the position in the *full* sorted list (so a
				// type/name filter doesn't renumber it) — the league's own overall
				// rank only when that's the order being shown.
				.map((x, i) => ({ ...x, position: i + 1 }))
				.filter((x) => byType(x.p) && byName(x.p))
				.map(({ r, p, position }) => ({
					pokemon: p,
					moves: r.moveset,
					metric: {
						rank: isOverall ? r.rank : position,
						// Medals only when the list reads best-first: the overall order ascending, or a score descending.
						...((pvpSort === 'overall' ? pvpDir === 'asc' : pvpDir === 'desc') ? { podium: true } : {}),
						// Movement is in the overall ranking — meaningless under any other order.
						...(isOverall ? { rankChange: r.rankChange } : {}),
						// The figure shown is whichever score the list is sorted by (label stays "Pts").
						score: pvpSort === 'overall' ? r.score : r[pvpSort],
					},
				}))
		);
	}, [
		mode,
		q,
		typeCsv,
		sortKey,
		sortDir,
		pvpSort,
		pvpDir,
		raidMetric,
		raidDir,
		gamemasterPokemon,
		fetchCompleted,
		rankLists,
		extraRankLists,
		pvpFetchCompleted,
		raidDPS,
		raidDPSFetchCompleted,
		maxLevelIndex,
	]);

	const gridRef = useRef<HTMLDivElement>(null);
	const { cols, rowHeight, measured } = useGridMetrics(gridRef);
	const gridRows = useMemo(() => {
		if (!isPokedex) return rows.map((row): PokedexGridRow => ({ kind: 'rank', row }));
		const grouped: Array<PokedexGridRow> = [];
		const dexSort = !['name', 'cp', 'type', ...STAT_SORT_KEYS].includes(sortKey);
		const pushCards = (cards: Array<Row>) => {
			for (let i = 0; i < cards.length; i += cols) grouped.push({ kind: 'cards', rows: cards.slice(i, i + cols) });
		};
		if (!dexSort) {
			pushCards(rows);
			return grouped;
		}
		let region = pokedexRegion(rows[0]?.pokemon.dex ?? 0);
		if (rows.length > 0) grouped.push({ kind: 'region', name: `rankings:regions.${region.toLowerCase()}` });
		let cards: Array<Row> = [];
		for (const row of rows) {
			const nextRegion = pokedexRegion(row.pokemon.dex);
			if (region && nextRegion !== region) {
				pushCards(cards);
				cards = [];
				region = nextRegion;
				grouped.push({ kind: 'region', name: `rankings:regions.${region.toLowerCase()}` });
			}
			cards.push(row);
		}
		pushCards(cards);
		return grouped;
	}, [cols, isPokedex, rows, sortKey]);
	const rowCount = gridRows.length;
	const loading =
		!fetchCompleted || (mode === 'raid' && !raidDPSFetchCompleted) || (isPvpLeagueMode && !pvpFetchCompleted);
	const [readySprites, setReadySprites] = useState<{
		rows: ReadonlyArray<PokedexGridRow>;
		cols: number;
		rowHeight: number;
		startRow: number;
		rowCount: number;
	} | null>(null);
	const initialSpritesReady =
		readySprites?.rows === gridRows && readySprites.cols === cols && readySprites.rowHeight === rowHeight;
	useEffect(() => {
		if (!isPokedex || !measured || loading || gridRows.length === 0) return;
		const grid = gridRef.current;
		if (!grid) return;
		let cancelled = false;
		let firstVisibleRow = -1;
		let lastVisibleRow = -1;
		let rowTop = grid.getBoundingClientRect().top;
		const preloadMargin = rowHeight;
		for (let i = 0; i < gridRows.length; i++) {
			const currentRow = gridRows[i];
			const currentHeight = currentRow.kind === 'region' ? REGION_HEADER_HEIGHT : rowHeight;
			const rowBottom = rowTop + currentHeight;
			if (rowBottom >= -preloadMargin && rowTop <= window.innerHeight + preloadMargin) {
				if (firstVisibleRow < 0) firstVisibleRow = i;
				lastVisibleRow = i;
			}
			rowTop = rowBottom + GRID_GAP;
			if (rowTop > window.innerHeight + preloadMargin) break;
		}
		if (firstVisibleRow < 0) {
			firstVisibleRow = 0;
			lastVisibleRow = Math.min(gridRows.length - 1, 5);
		}
		const visiblePokemon = gridRows
			.slice(firstVisibleRow, lastVisibleRow + 1)
			.flatMap((gridRow) => (gridRow.kind === 'cards' ? gridRow.rows.map((row) => row.pokemon) : []));
		const loadAndDecode = async (src: string): Promise<boolean> => {
			const image = new Image();
			image.src = src;
			if (!image.complete) {
				const loaded = await new Promise<boolean>((resolve) => {
					image.onload = () => resolve(true);
					image.onerror = () => resolve(false);
				});
				if (!loaded) return false;
			}
			return (
				image.naturalWidth > 0 &&
				(await image.decode().then(
					() => true,
					() => image.naturalWidth > 0
				))
			);
		};
		const ready = async (pokemon: IGamemasterPokemon): Promise<void> => {
			const src = spriteUrl(pokemon);
			const loaded = await loadAndDecode(src);
			if (!loaded && pokemon.imageUrl && pokemon.imageUrl !== src) await loadAndDecode(pokemon.imageUrl);
		};
		void (async () => {
			await Promise.all(visiblePokemon.map((pokemon) => ready(pokemon)));
			if (!cancelled) {
				setReadySprites({
					rows: gridRows,
					cols,
					rowHeight,
					startRow: firstVisibleRow,
					rowCount: lastVisibleRow - firstVisibleRow + 1,
				});
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [gridRows, isPokedex, loading, measured, cols, rowHeight]);

	const [scrollMargin, setScrollMargin] = useState(0);
	useEffect(() => {
		setScrollMargin(gridRef.current?.offsetTop ?? 0);
	}, [rows.length, cols]);

	const virt = useWindowVirtualizer({
		count: rowCount,
		estimateSize: (index) => {
			const row = gridRows[index];
			return row?.kind === 'region' ? REGION_HEADER_HEIGHT : isPokedex ? rowHeight : RANK_ROW_HEIGHT;
		},
		overscan: 6,
		scrollMargin,
		gap: isPokedex ? GRID_GAP : RANK_ROW_GAP,
	});
	// `estimateSize` is only consulted the first time a given row index is
	// measured, then cached per index. Rows measured before a ResizeObserver
	// tick landed a new `rowHeight` (the very first paint, using the 96px
	// placeholder, or after any later resize) stay pinned to that stale value
	// forever — mixing row heights within one scrolled list, which is the
	// other half of the uneven-gap bug. Force a full remeasure whenever the
	// real row height changes.
	useEffect(() => {
		virt.measure();
	}, [rowHeight, virt]);

	const setTypes = (list: Array<string>) => {
		const capped = list.slice(0, isRaid ? 1 : 2);
		if (isRaid) {
			// Picking a type through the UI writes the real, shareable path
			// (/rankings/raid/fire — see R.rankings), not just `?type=`: the path
			// segment only *seeds* that query param on an initial load (see the
			// `typeSeed` fallback above), so without this, normal use of the
			// filter would never actually produce the pretty URL it exists for.
			const rest = new URLSearchParams(params);
			rest.delete('type');
			const search = rest.toString();
			void navigate({ pathname: R.rankings('raid', capped[0]), search: search ? `?${search}` : '' }, { replace: true });
			return;
		}
		const next = new URLSearchParams(params);
		if (capped.length) next.set('type', capped.join(','));
		else next.delete('type');
		setParams(next, { replace: true });
	};

	const setSort = (key: string, dir: SortDir) => {
		const next = new URLSearchParams(params);
		if (key === 'dex' && dir === 'asc') {
			next.delete('sort');
			next.delete('dir');
		} else {
			next.set('sort', key);
			next.set('dir', dir);
		}
		setParams(next, { replace: true });
	};

	const setPvpSort = (key: string, dir: SortDir) => {
		const next = new URLSearchParams(params);
		if (key === 'overall' && dir === 'asc') {
			next.delete('sort');
			next.delete('dir');
		} else {
			next.set('sort', key);
			next.set('dir', dir);
		}
		setParams(next, { replace: true });
	};

	// Also wait on `measured` — the grid's column count/tile size default to a
	// placeholder guess until its synchronous first measurement (and observer
	// updates after resize), and painting tiles against that guess is what caused
	// the "huge overlapping tiles" flash on first load. The initial visible
	// sprite decode is also gated before the grid is revealed.
	const showResults = !loading && (!isPokedex || (measured && (rows.length === 0 || initialSpritesReady)));
	// a new league (or its list arriving) fades in
	usePlayOnChange(gridRef, `${mode}|${showResults}`);

	const pickerItems: Array<LeaguePickerItem> = useMemo(
		() => [
			{
				id: 'great',
				label: modeLabel('great', gl, leagues),
				icon: leagueIcon('great') ?? '/images/leagues/cups/pogo_great_league.png',
				color: modeColor('great'),
			},
			{
				id: 'ultra',
				label: modeLabel('ultra', gl, leagues),
				icon: leagueIcon('ultra') ?? '/images/leagues/cups/pogo_ultra_league.png',
				color: modeColor('ultra'),
			},
			{
				id: 'master',
				label: modeLabel('master', gl, leagues),
				icon: leagueIcon('master') ?? '/images/leagues/cups/pogo_master_league.png',
				color: modeColor('master'),
			},
			{
				id: 'raid',
				label: modeLabel('raid', gl, leagues),
				icon: '/images/raids/tier-5.png',
				color: modeColor('raid'),
				// Own row below the main strip, same as the custom cups.
				extra: true,
			},
		],
		// `gameTranslations` isn't read directly, it's what tells this memo the
		// underlying `gameTranslator()` data (read via `modeLabel`/`leagueTitle`)
		// actually changed — see this hook's own comment above.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[t, gl, leagues, gameTranslations]
	);

	const goToMode = (m: RankingMode) => {
		const pathname = m === 'pokedex' ? R.pokedex : R.rankings(m);
		const search = new URLSearchParams();
		// Pokédex and every PvP league (static or rotating) all treat "type" the
		// same way (up to 2, AND-matched) — carry the current filter across
		// switches among them. Raid's is a different shape entirely (exactly
		// one, baked into the path segment), so it neither takes one from, nor
		// hands one to, those.
		const carryType = mode !== 'raid' && m !== 'raid' && typeCsv;
		if (carryType) search.set('type', typeCsv);
		// The search term, though, is the same free-text name filter everywhere
		// — Pokédex, every league and raids alike — so it always carries over
		// regardless of which of those you're switching between. The raw param
		// (not the lowercased/trimmed `q` above), so the search box's own
		// displayed casing doesn't get mangled by this.
		const rawQ = params.get('q');
		if (rawQ) search.set('q', rawQ);
		void navigate({ pathname, search: search.toString() ? `?${search.toString()}` : '' });
	};

	// The chip/tab strips already say which ranking is active, but nothing
	// above them did — the page read as the same blank shell regardless of
	// Pokédex vs. a specific league vs. Raids. A plain short mode name (the
	// chip's own label) isn't descriptive enough on its own here though — so
	// this spells it out: "Best Pokémon for Great League", or, for Raids,
	// "Best Fire DPS Type Attackers" once a type's picked (falling back to a
	// generic "Best Raid Attackers" before one is).
	const pageTitle =
		mode === 'raid'
			? raidType
				? t('rankings:pageTitle.raidWithType', {
						type: gameTypeDisplayTranslator(raidType, gl) || raidType,
						metric: RAID_METRIC_LABEL[raidMetric],
					})
				: t('rankings:pageTitle.raidNoType', {
						raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
					})
			: mode === 'pokedex'
				? t('rankings:tabs.pokedexFull')
				: t('rankings:pageTitle.league', { league: modeLabelLong(mode, gl, leagues) });

	return (
		<div className={isPokedex ? 'r-shell r-shell--wide' : 'r-shell'}>
			<h1 className='r-page-title'>{pageTitle}</h1>
			<div className='r-rank-head'>
				{isPokedex ? null : pickerReady ? (
					<div className='r-league-row'>
						<LeaguePicker
							items={pickerItems}
							activeId={mode}
							onSelect={goToMode}
							ariaLabel={t('rankings:tabs.pickerAriaLabel')}
							trailing={<CustomLeaguePicker activeId={mode} onSelect={goToMode} />}
						/>
					</div>
				) : (
					<div className='r-league-row-loading'>
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
						{t('rankings:tabs.loadingLeagues')}
					</div>
				)}
				<ListBar
					applied={
						<AppliedFilters selected={isRaid ? (raidType ? [raidType] : []) : selectedTypes} onChange={setTypes} />
					}
					label={
						<>
							{!showResults
								? t('rankings:status.loading')
								: isRaid && !raidType
									? t('rankings:status.chooseType')
									: t('rankings:status.count', { count: rows.length })}
						</>
					}
					labelExtra={
						<>
							{showResults && isRaid && raidType && (
								<button
									type='button'
									className='r-rank-hint-toggle'
									aria-expanded={hintOpen}
									aria-label={t(hintOpen ? 'rankings:hint.hide' : 'rankings:hint.show')}
									title={t(hintOpen ? 'rankings:hint.hide' : 'rankings:hint.show')}
									onClick={() => setHintOpen((o) => !o)}
								>
									?
								</button>
							)}
							{showResults && isPvpLeagueMode && pvpSort !== 'overall' && (
								<button
									type='button'
									className='r-rank-hint-toggle'
									aria-expanded={hintOpen}
									aria-label={t('pokemonDetail:counters.helpSummary')}
									title={t('pokemonDetail:counters.helpSummary')}
									onClick={() => setHintOpen((o) => !o)}
								>
									?
								</button>
							)}
						</>
					}
				>
					<FilterBar
						types={isRaid ? RAID_TYPE_KEYS : TYPE_KEYS}
						selected={isRaid ? (raidType ? [raidType] : []) : selectedTypes}
						onChange={setTypes}
						single={isRaid}
					/>
					{mode === 'pokedex' && <SortBar options={POKEDEX_SORTS} sortKey={sortKey} dir={sortDir} onChange={setSort} />}
					{isPvpLeagueMode && <SortBar options={PVP_SORTS} sortKey={pvpSort} dir={pvpDir} onChange={setPvpSort} />}
					{isRaid && (
						<SortBar
							options={RAID_METRIC_SORTS}
							sortKey={raidMetric}
							dir={raidDir}
							onChange={(k, d) => {
								updateRaidMetric(k as RaidMetric);
								const next = new URLSearchParams(params);
								if (d === 'desc') next.delete('dir');
								else next.set('dir', d);
								setParams(next, { replace: true });
							}}
						/>
					)}
				</ListBar>
				{showResults && isPvpLeagueMode && pvpSort !== 'overall' && hintOpen && (
					<p className='r-muted r-rank-hint'>
						<strong>{combatMetricNames(t)[pvpSort]}</strong>
						{' — '}
						{combatMetricDescriptions(t)[pvpSort]}
					</p>
				)}
				{showResults && isRaid && raidType && hintOpen && (
					<p className='r-muted r-rank-hint'>
						{t('rankings:hint.text', {
							type: gameTypeDisplayTranslator(raidType, gl) || raidType,
							raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
							mega: gameTranslator(GameTranslatorKeys.MegaDisplay, gl),
							shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
						})}
					</p>
				)}
			</div>

			<div ref={gridRef} className='r-grid-vp'>
				{!showResults && (
					<div className='r-loading'>
						<div className='r-spinner' />
						{t(mode === 'pokedex' ? 'rankings:loadingLabel.pokedex' : 'rankings:loadingLabel.rankings')}
					</div>
				)}
				{showResults && isRaid && !raidType && (
					<div className='r-rank-empty'>
						<p className='r-muted'>
							{t('rankings:empty.pickType', { raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)) })}
						</p>
						<div
							className='r-typepick'
							role='group'
							aria-label={t('rankings:empty.pickType', {
								raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
							})}
						>
							{RAID_TYPE_KEYS.map((tp) => (
								<button
									key={tp}
									type='button'
									className='r-typepick-btn'
									style={{ ['--tc' as string]: typeVar(tp) }}
									onClick={() => setTypes([tp])}
								>
									<img src={`/images/types/${tp}.png`} alt='' width={32} height={32} loading='lazy' />
									<span>{gameTypeDisplayTranslator(tp, gl) || tp}</span>
								</button>
							))}
						</div>
					</div>
				)}
				{showResults && rows.length === 0 && !(isRaid && !raidType) && (
					<p className='r-muted' style={{ padding: 24 }}>
						{t('rankings:empty.nothingMatches')}
					</p>
				)}
				{showResults && (
					<div style={{ height: virt.getTotalSize(), position: 'relative' }}>
						{virt.getVirtualItems().map((vi) => {
							const virtualRow = gridRows[vi.index];
							return (
								<div
									key={vi.key}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										transform: `translateY(${vi.start - virt.options.scrollMargin}px)`,
									}}
								>
									{isPokedex && virtualRow?.kind === 'region' ? (
										<div className='r-pokedex-region'>
											<h2>{t(virtualRow.name)}</h2>
											<i aria-hidden='true' />
										</div>
									) : isPokedex && virtualRow?.kind === 'cards' ? (
										<div className='r-grid-row' style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
											{virtualRow.rows.map((row, cellIndex) => {
												const animateRow =
													initialSpritesReady &&
													readySprites !== null &&
													vi.index >= readySprites.startRow &&
													vi.index < readySprites.startRow + readySprites.rowCount;
												const animationIndex = (vi.index - (readySprites?.startRow ?? 0)) * cols + cellIndex;
												return (
													<PokeCard
														key={row.pokemon.speciesId}
														pokemon={row.pokemon}
														metric={row.metric}
														className={animateRow ? 'r-pc--enter' : undefined}
														style={
															animateRow ? { animationDelay: `${Math.min(animationIndex, 24) * 14}ms` } : undefined
														}
													/>
												);
											})}
										</div>
									) : !isPokedex && virtualRow?.kind === 'rank' ? (
										<CounterRankRow
											pokemon={virtualRow.row.pokemon}
											rank={virtualRow.row.metric?.rank ?? vi.index + 1}
											rankChange={virtualRow.row.metric?.rankChange}
											podium={virtualRow.row.metric?.podium}
											moveLayout={isPvpLeagueMode ? 'pvp' : 'inline'}
											moves={virtualRow.row.moves ?? []}
											moveData={moves}
											score={
												virtualRow.row.metric?.dps != null
													? fmtRaidMetric(virtualRow.row.metric.dps, 'dps')
													: virtualRow.row.metric?.tdo != null
														? fmtRaidMetric(virtualRow.row.metric.tdo, 'tdo')
														: virtualRow.row.metric?.score?.toFixed(1)
											}
											scoreLabel={
												virtualRow.row.metric?.dps != null
													? RAID_METRIC_LABEL.dps
													: virtualRow.row.metric?.tdo != null
														? RAID_METRIC_LABEL.tdo
														: virtualRow.row.metric?.score != null
															? 'Pts'
															: undefined
											}
											onActivate={() => void navigate(`${R.pokemon(virtualRow.row.pokemon.speciesId)}?lg=${mode}`)}
										/>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default Rankings;
