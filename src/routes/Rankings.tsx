import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { FilterBar } from '../components/FilterBar';
import { type CardMetric, PokeCard } from '../components/PokeCard';
import { SortBar, type SortDir, type SortOption } from '../components/SortBar';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { MODE_COLOR, MODE_LABEL, R, RANKING_MODES, type RankingMode } from '../lib/nav';
import { RAID_METRIC_SORTS, type RaidMetric } from '../lib/raid-metric';
import { TYPE_KEYS, TYPE_LABEL, typeKey } from '../lib/types';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import { calculateCP } from '../utils/pokemon-helper';

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
				// `Math.ceil`, not `round`: the CSS grid's `1fr` columns don't divide
				// evenly, so the browser hands any leftover pixel(s) to one column —
				// that column's square (aspect-ratio: 1) tile ends up a pixel taller
				// than this average. Rounding down sometimes made the virtualizer's
				// single fixed row height fall a pixel short of that, which is what
				// let rows overlap or gap unevenly depending on the exact width.
				const rowHeight = Math.max(1, Math.ceil(cardWidth));
				return prev.cols === cols && prev.rowHeight === rowHeight ? prev : { cols, rowHeight };
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return metrics;
};

const Rankings = () => {
	const { league, type: typeParam } = useParams();
	const mode: RankingMode = (RANKING_MODES as ReadonlyArray<string>).includes(league ?? 'pokedex')
		? ((league ?? 'pokedex') as RankingMode)
		: 'pokedex';
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const q = (params.get('q') ?? '').toLowerCase().trim();
	const isRaid = mode === 'raid';
	// `/rankings/raid/:type` (a real, crawlable URL per type — see R.rankings)
	// only ever *seeds* the type when `?type=` isn't already set; from then on
	// the query param — what the FilterBar actually writes to — is the single
	// source of truth, so the two never end up fighting each other.
	const typeSeed = isRaid && typeParam && TYPE_KEYS.includes(typeParam) ? typeParam : '';
	const selectedTypes = (params.get('type') ?? typeSeed)
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean)
		.filter((t) => TYPE_KEYS.includes(t))
		.slice(0, isRaid ? 1 : 2);
	const raidType = isRaid ? (selectedTypes[0] ?? '') : '';

	const sortKey = params.get('sort') ?? 'dex';
	const sortDir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';

	// which figure (DPS/TDO/eDPS) to rank by is a device-wide setting, shared with
	// the Counters tab and Settings — not a per-page URL param.
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { maxLevelIndex } = useBestBuddy();
	// raid rankings default to descending (best first); pokedex defaults to asc.
	const raidDir: SortDir = params.get('dir') === 'asc' ? 'asc' : 'desc';

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
			const arr = Object.values(gamemasterPokemon)
				.filter((p) => !p.aliasId && !p.isShadow && !p.isMega && byType(p) && byName(p))
				.map((pokemon) => ({
					pokemon,
					metric: {
						cp: calculateCP(
							pokemon.baseStats.atk,
							15,
							pokemon.baseStats.def,
							15,
							pokemon.baseStats.hp,
							15,
							maxLevelIndex
						),
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
					metric: { rank: i + 1, [raidMetric]: e[raidMetric] },
				}))
				.filter((row) => byName(row.pokemon));
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
		raidMetric,
		raidDir,
		gamemasterPokemon,
		fetchCompleted,
		rankLists,
		pvpFetchCompleted,
		raidDPS,
		raidDPSFetchCompleted,
		maxLevelIndex,
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
								const pathname = m === 'pokedex' ? R.pokedex : R.rankings(m);
								const search = new URLSearchParams();
								// Pokédex and the PvP leagues all treat "type" the same way (up to 2,
								// AND-matched) — carry the current filter across switches among them.
								// Raid's is a different shape entirely (exactly one, baked into the
								// path segment), so it neither takes one from, nor hands one to, those.
								const carryType = mode !== 'raid' && m !== 'raid' && typeCsv;
								if (carryType) search.set('type', typeCsv);
								// The search term, though, is the same free-text name filter
								// everywhere — Pokédex, every league and raids alike — so it always
								// carries over regardless of which of those you're switching between.
								// The raw param (not the lowercased/trimmed `q` above), so the
								// search box's own displayed casing doesn't get mangled by this.
								const rawQ = params.get('q');
								if (rawQ) search.set('q', rawQ);
								void navigate({ pathname, search: search.toString() ? `?${search.toString()}` : '' });
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
				</div>
				<div className='r-section-h'>
					{loading ? 'Loading…' : isRaid && !raidType ? 'Choose a type' : `${rows.length.toLocaleString()} Pokémon`}
					{isRaid && raidType && ` · best ${TYPE_LABEL[raidType]} attackers`}
				</div>
			</div>

			<div ref={gridRef} className='r-grid-vp'>
				{!loading && isRaid && !raidType && (
					<p className='r-muted r-rank-empty'>Pick a type in the filter to see the best raid attackers of that type.</p>
				)}
				{!loading && rows.length === 0 && !(isRaid && !raidType) && (
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
