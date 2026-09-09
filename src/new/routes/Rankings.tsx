import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { useRaidRanker } from '../../queries/raid-ranker';
import { calculateCP, levelToLevelIndex } from '../../utils/pokemon-helper';
import { FilterBar } from '../components/FilterBar';
import { type CardMetric, PokeCard } from '../components/PokeCard';
import { SortBar, type SortDir, type SortOption } from '../components/SortBar';
import { MODE_COLOR, MODE_LABEL, R, RANKING_MODES, type RankingMode } from '../lib/nav';
import { TYPE_KEYS, TYPE_LABEL, typeKey } from '../lib/types';

const POKEDEX_SORTS: ReadonlyArray<SortOption> = [
	{ key: 'dex', label: 'Dex number', defaultDir: 'asc' },
	{ key: 'name', label: 'Name', defaultDir: 'asc' },
	{ key: 'cp', label: 'Max CP', defaultDir: 'desc' },
	{ key: 'type', label: 'Type', defaultDir: 'asc' },
];

interface Row {
	pokemon: IGamemasterPokemon;
	metric?: CardMetric;
}

const GRID_GAP = 8;

/**
 * Column count + exact row height for the square-tile grid. Rows are uniform, so
 * we feed the height straight to `estimateSize` and skip react-virtual's
 * per-element `measureElement` — that ref callback calls `flushSync` during
 * commit and warns when a route transition is still rendering.
 */
const useGridMetrics = (ref: React.RefObject<HTMLElement | null>) => {
	const [metrics, setMetrics] = useState({ cols: 4, rowHeight: 96 });
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			const w = el.clientWidth;
			if (!w) return;
			const cols = Math.min(10, Math.max(4, Math.floor(w / 88)));
			const cardWidth = (w - (cols - 1) * GRID_GAP) / cols; // tiles are squares
			setMetrics((prev) => {
				const rowHeight = Math.max(1, Math.round(cardWidth));
				return prev.cols === cols && prev.rowHeight === rowHeight ? prev : { cols, rowHeight };
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return metrics;
};

const Rankings = () => {
	const { league } = useParams();
	const mode: RankingMode = (RANKING_MODES as ReadonlyArray<string>).includes(league ?? 'pokedex')
		? ((league ?? 'pokedex') as RankingMode)
		: 'pokedex';
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const q = (params.get('q') ?? '').toLowerCase().trim();
	const isRaid = mode === 'raid';
	const selectedTypes = (params.get('type') ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean)
		.filter((t) => TYPE_KEYS.includes(t))
		.slice(0, isRaid ? 1 : 2);
	const raidType = isRaid ? (selectedTypes[0] ?? '') : '';

	const sortKey = params.get('sort') ?? 'dex';
	const sortDir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';

	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

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
		const byName = (p: IGamemasterPokemon) => !q || p.speciesName.toLowerCase().includes(q);

		if (mode === 'pokedex') {
			const lvl50 = levelToLevelIndex(50);
			const arr = Object.values(gamemasterPokemon)
				.filter((p) => !p.aliasId && !p.isShadow && !p.isMega && byType(p) && byName(p))
				.map((pokemon) => ({
					pokemon,
					metric: {
						cp: calculateCP(pokemon.baseStats.atk, 15, pokemon.baseStats.def, 15, pokemon.baseStats.hp, 15, lvl50),
					},
				}));
			const s = sortDir === 'asc' ? 1 : -1;
			arr.sort((a, b) => {
				switch (sortKey) {
					case 'name':
						return s * a.pokemon.speciesName.localeCompare(b.pokemon.speciesName);
					case 'cp':
						return s * ((a.metric.cp ?? 0) - (b.metric.cp ?? 0)) || a.pokemon.dex - b.pokemon.dex;
					case 'type': {
						const at = a.pokemon.types.map((t) => typeKey(t)).join('/');
						const bt = b.pokemon.types.map((t) => typeKey(t)).join('/');
						return s * at.localeCompare(bt) || a.pokemon.dex - b.pokemon.dex;
					}
					default:
						return s * (a.pokemon.dex - b.pokemon.dex || a.pokemon.speciesName.localeCompare(b.pokemon.speciesName));
				}
			});
			return arr;
		}

		if (mode === 'raid') {
			if (!raidDPSFetchCompleted) return [];
			const list = raidDPS[wanted[0] ?? ''] ?? raidDPS[''] ?? {};
			return Object.values(list)
				.filter((e) => {
					const p = gamemasterPokemon[e.speciesId];
					return p && !p.aliasId && byName(p);
				})
				.sort((a, b) => b.dps - a.dps)
				.map((e, i) => ({ pokemon: gamemasterPokemon[e.speciesId], metric: { rank: i + 1, dps: e.dps } }));
		}

		// pvp league
		if (!pvpFetchCompleted) return [];
		const idx = mode === 'great' ? 0 : mode === 'ultra' ? 1 : 2;
		return Object.values(rankLists[idx] ?? {})
			.map((r) => ({ r, p: gamemasterPokemon[r.speciesId] }))
			.filter((x) => x.p && !x.p.aliasId && byType(x.p) && byName(x.p))
			.sort((a, b) => a.r.rank - b.r.rank)
			.map(({ r, p }) => ({ pokemon: p, metric: { rank: r.rank, score: r.score, rankChange: r.rankChange } }));
	}, [
		mode,
		q,
		typeCsv,
		sortKey,
		sortDir,
		gamemasterPokemon,
		fetchCompleted,
		rankLists,
		pvpFetchCompleted,
		raidDPS,
		raidDPSFetchCompleted,
	]);

	const gridRef = useRef<HTMLDivElement>(null);
	const { cols, rowHeight } = useGridMetrics(gridRef);
	const rowCount = Math.ceil(rows.length / cols);

	const [scrollMargin, setScrollMargin] = useState(0);
	useEffect(() => {
		setScrollMargin(gridRef.current?.offsetTop ?? 0);
	}, [rows.length, cols]);

	const virt = useWindowVirtualizer({
		count: rowCount,
		estimateSize: () => rowHeight,
		overscan: 6,
		scrollMargin,
		gap: GRID_GAP,
	});

	const setTypes = (list: Array<string>) => {
		const next = new URLSearchParams(params);
		const capped = list.slice(0, isRaid ? 1 : 2);
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

	const loading =
		!fetchCompleted ||
		(mode === 'raid' && !raidDPSFetchCompleted) ||
		(['great', 'ultra', 'master'].includes(mode) && !pvpFetchCompleted);

	return (
		<div className='r-shell r-shell--wide'>
			<div className='r-rank-head'>
				<div className='r-seg r-seg--wrap r-seg--league'>
					{RANKING_MODES.map((m) => (
						<button
							key={m}
							type='button'
							data-active={mode === m}
							style={{ ['--seg-c' as string]: MODE_COLOR[m] }}
							onClick={() => {
								void navigate(m === 'pokedex' ? R.pokedex : R.rankings(m));
							}}
						>
							{MODE_LABEL[m]}
						</button>
					))}
				</div>
				<div className='r-controls'>
					<FilterBar
						types={TYPE_KEYS}
						selected={isRaid ? (raidType ? [raidType] : []) : selectedTypes}
						onChange={setTypes}
						single={isRaid}
					/>
					{mode === 'pokedex' && <SortBar options={POKEDEX_SORTS} sortKey={sortKey} dir={sortDir} onChange={setSort} />}
				</div>
				<p className='r-muted r-count'>
					{loading ? 'Loading…' : `${rows.length.toLocaleString()} Pokémon`}
					{isRaid && raidType && ` · best ${TYPE_LABEL[raidType]} attackers`}
				</p>
			</div>

			<div ref={gridRef} className='r-grid-vp'>
				{!loading && rows.length === 0 && (
					<p className='r-muted' style={{ padding: 24 }}>
						Nothing matches.
					</p>
				)}
				<div style={{ height: virt.getTotalSize(), position: 'relative' }}>
					{virt.getVirtualItems().map((vi) => {
						const start = vi.index * cols;
						const slice = rows.slice(start, start + cols);
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
								<div className='r-grid-row' style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
									{slice.map((row) => (
										<PokeCard
											key={row.pokemon.speciesId}
											pokemon={row.pokemon}
											metric={row.metric}
											league={mode === 'pokedex' ? undefined : mode}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default Rankings;
