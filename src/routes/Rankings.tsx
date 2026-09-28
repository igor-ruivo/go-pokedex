import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { TFunction } from 'i18next';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { FilterBar } from '../components/FilterBar';
import { LeaguePicker, type LeaguePickerItem } from '../components/LeaguePicker';
import { LeagueVisibilityMenu } from '../components/LeagueVisibilityMenu';
import { type CardMetric, PokeCard } from '../components/PokeCard';
import { SortBar, type SortDir, type SortOption } from '../components/SortBar';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { type GameLanguage, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import { useVisibleLeagues } from '../contexts/visible-leagues-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { sentenceCase } from '../lib/format';
import { leagueIcon, leagueTitle } from '../lib/league-visuals';
import { isKnownRankingMode, modeColor, modeLabel, R, type RankingMode } from '../lib/nav';
import { RAID_METRIC_SORTS, type RaidMetric } from '../lib/raid-metric';
import { RAID_TYPE_KEYS, TYPE_KEYS, typeKey } from '../lib/types';
import { extraLeagues, useLeagueDefinitions } from '../queries/leagues';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import { useGameTranslationsData } from '../utils/game-translations-store';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';
import { calculateCP } from '../utils/pokemon-helper';

const usePokedexSorts = (t: TFunction<'rankings'>, gl: GameLanguage): ReadonlyArray<SortOption> => [
	{ key: 'dex', label: t('rankings:sorts.dex'), defaultDir: 'asc' },
	{ key: 'name', label: t('rankings:sorts.name'), defaultDir: 'asc' },
	{
		key: 'cp',
		label: t('rankings:sorts.cp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) }),
		defaultDir: 'desc',
	},
	{ key: 'type', label: t('rankings:sorts.type'), defaultDir: 'asc' },
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
	// `measured` stays false until the very first real ResizeObserver callback —
	// `cols`/`rowHeight` before that are just a placeholder guess, not yet
	// derived from the container's actual width. Rendering tiles against that
	// guess (a fixed 96px row height, whatever real square-tile width the
	// current screen works out to) is what caused the "huge, overlapping
	// tiles for a split second" flash on first load: the observer's initial
	// callback doesn't fire synchronously on mount, so there's a real gap
	// where the grid would otherwise already be painting with wrong numbers.
	const [metrics, setMetrics] = useState({ cols: 4, rowHeight: 96, measured: false });
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
				return prev.cols === cols && prev.rowHeight === rowHeight && prev.measured
					? prev
					: { cols, rowHeight, measured: true };
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return metrics;
};

const Rankings = () => {
	const { t } = useTranslation(['rankings']);
	const { currentGameLanguage: gl } = useLanguage();
	const POKEDEX_SORTS = usePokedexSorts(t, gl);
	const { league, type: typeParam } = useParams();
	const { leagues } = useLeagueDefinitions();
	const { isExtraLeagueVisible } = useVisibleLeagues();
	// A rotating cup's id stays a valid mode (a bookmarked/shared link still
	// resolves) even if the player has since hidden it from the picker below —
	// visibility only controls which chips render, not whether the route works.
	const mode: RankingMode = league && isKnownRankingMode(league, leagues) ? league : 'pokedex';
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const [hintOpen, setHintOpen] = useState(false);
	const q = (params.get('q') ?? '').toLowerCase().trim();
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

	// which figure (DPS/TDO) to rank by is a device-wide setting, shared with
	// the Counters tab and Settings — not a per-page URL param.
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { maxLevelIndex } = useBestBuddy();
	// raid rankings default to descending (best first); pokedex defaults to asc.
	const raidDir: SortDir = params.get('dir') === 'asc' ? 'asc' : 'desc';

	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, extraRankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
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
		return Object.values(list)
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
		extraRankLists,
		pvpFetchCompleted,
		raidDPS,
		raidDPSFetchCompleted,
		maxLevelIndex,
	]);

	const gridRef = useRef<HTMLDivElement>(null);
	const { cols, rowHeight, measured } = useGridMetrics(gridRef);
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
		!fetchCompleted || (mode === 'raid' && !raidDPSFetchCompleted) || (isPvpLeagueMode && !pvpFetchCompleted);
	// Also wait on `measured` — the grid's column count/tile size default to a
	// placeholder guess until the first real `ResizeObserver` callback fires
	// (see `useGridMetrics`), and painting tiles against that guess is what
	// caused the "huge overlapping tiles" flash on first load. A spinner
	// instead of the grid until both are true means the grid only ever
	// appears already laid out correctly.
	const showGrid = !loading && measured;

	const visibleExtraLeagues = useMemo(
		() => extraLeagues(leagues).filter((l) => isExtraLeagueVisible(l.id)),
		[leagues, isExtraLeagueVisible]
	);
	const pickerItems: Array<LeaguePickerItem> = useMemo(
		() => [
			{
				id: 'pokedex',
				label: t('rankings:tabs.pokedexFull'),
				shortLabel: t('rankings:tabs.pokedexShort'),
				icon: '/images/nav/pokedex.png',
				color: modeColor('pokedex'),
			},
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
			{ id: 'raid', label: modeLabel('raid', gl, leagues), icon: '/images/raids/tier-5.png', color: modeColor('raid') },
			// Optional add-ons — always last, same ordering as the Pokémon page's
			// own league picker/leaderboard (see PokemonDetail.tsx's `LEAGUES`).
			...visibleExtraLeagues.map((l) => ({
				id: l.id,
				label: leagueTitle(l, gl).short,
				icon: leagueIcon(l.id),
				color: modeColor(l.id),
			})),
		],
		// `gameTranslations` isn't read directly, it's what tells this memo the
		// underlying `gameTranslator()` data (read via `modeLabel`/`leagueTitle`)
		// actually changed — see this hook's own comment above.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[t, gl, leagues, visibleExtraLeagues, gameTranslations]
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

	return (
		<div className='r-shell r-shell--wide'>
			<div className='r-rank-head'>
				{pickerReady ? (
					<div className='r-league-row'>
						<LeaguePicker
							items={pickerItems}
							activeId={mode}
							onSelect={goToMode}
							ariaLabel={t('rankings:tabs.pickerAriaLabel')}
						/>
						<LeagueVisibilityMenu />
					</div>
				) : (
					<div className='r-league-row-loading'>
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
						{t('rankings:tabs.loadingLeagues')}
					</div>
				)}
				<div className='r-controls'>
					<FilterBar
						types={isRaid ? RAID_TYPE_KEYS : TYPE_KEYS}
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
					<span>
						{!showGrid
							? t('rankings:status.loading')
							: isRaid && !raidType
								? t('rankings:status.chooseType')
								: t('rankings:status.count', { count: rows.length })}
						{isRaid &&
							raidType &&
							t('rankings:status.bestAttackersSuffix', { type: gameTypeDisplayTranslator(raidType, gl) })}
					</span>
					{showGrid && isRaid && raidType && (
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
				</div>
				{showGrid && isRaid && raidType && hintOpen && (
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
				{!showGrid && (
					<div className='r-loading'>
						<div className='r-spinner' />
						{t(mode === 'pokedex' ? 'rankings:loadingLabel.pokedex' : 'rankings:loadingLabel.rankings')}
					</div>
				)}
				{showGrid && isRaid && !raidType && (
					<p className='r-muted r-rank-empty'>
						{t('rankings:empty.pickType', { raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)) })}
					</p>
				)}
				{showGrid && rows.length === 0 && !(isRaid && !raidType) && (
					<p className='r-muted' style={{ padding: 24 }}>
						{t('rankings:empty.nothingMatches')}
					</p>
				)}
				{showGrid && (
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
				)}
			</div>
		</div>
	);
};

export default Rankings;
