import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { PokemonTypes } from '../../DTOs/PokemonTypes';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { useRaidRanker } from '../../queries/raid-ranker';
import { type CardMetric, PokeCard } from '../components/PokeCard';
import { MODE_LABEL, R, RANKING_MODES, type RankingMode } from '../lib/nav';
import { TYPE_LABEL, typeKey, typeVar } from '../lib/types';

interface Row {
	pokemon: IGamemasterPokemon;
	metric?: CardMetric;
}

const TYPES = Object.values(PokemonTypes).filter((v): v is PokemonTypes => typeof v === 'string');

const useColumns = (ref: React.RefObject<HTMLElement | null>) => {
	const [cols, setCols] = useState(2);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			const w = el.clientWidth;
			setCols(Math.min(6, Math.max(2, Math.floor(w / 172))));
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return cols;
};

const Rankings = () => {
	const { league } = useParams();
	const mode: RankingMode = (RANKING_MODES as ReadonlyArray<string>).includes(league ?? 'pokedex')
		? ((league ?? 'pokedex') as RankingMode)
		: 'pokedex';
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const q = (params.get('q') ?? '').toLowerCase().trim();
	const typeFilter = params.get('type') ?? '';

	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

	const rows: Array<Row> = useMemo(() => {
		if (!fetchCompleted) return [];
		const byType = (p: IGamemasterPokemon) => !typeFilter || p.types.some((t) => typeKey(t) === typeFilter);
		const byName = (p: IGamemasterPokemon) => !q || p.speciesName.toLowerCase().includes(q);

		if (mode === 'pokedex') {
			return Object.values(gamemasterPokemon)
				.filter((p) => !p.aliasId && !p.isShadow && !p.isMega && byType(p) && byName(p))
				.sort((a, b) => a.dex - b.dex || a.speciesName.localeCompare(b.speciesName))
				.map((pokemon) => ({ pokemon }));
		}

		if (mode === 'raid') {
			if (!raidDPSFetchCompleted) return [];
			const list = raidDPS[typeFilter] ?? raidDPS[''] ?? {};
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
			.map(({ r, p }) => ({ pokemon: p, metric: { rank: r.rank, score: r.score } }));
	}, [
		mode,
		q,
		typeFilter,
		gamemasterPokemon,
		fetchCompleted,
		rankLists,
		pvpFetchCompleted,
		raidDPS,
		raidDPSFetchCompleted,
	]);

	const gridRef = useRef<HTMLDivElement>(null);
	const cols = useColumns(gridRef);
	const rowCount = Math.ceil(rows.length / cols);

	const [scrollMargin, setScrollMargin] = useState(0);
	useEffect(() => {
		setScrollMargin(gridRef.current?.offsetTop ?? 0);
	}, [rows.length, cols]);

	const virt = useWindowVirtualizer({
		count: rowCount,
		estimateSize: () => 182,
		overscan: 5,
		scrollMargin,
		gap: 12,
	});

	const setType = (t: string) => {
		const next = new URLSearchParams(params);
		if (t) next.set('type', t);
		else next.delete('type');
		setParams(next, { replace: true });
	};

	const loading =
		!fetchCompleted ||
		(mode === 'raid' && !raidDPSFetchCompleted) ||
		(['great', 'ultra', 'master'].includes(mode) && !pvpFetchCompleted);

	return (
		<div className='r-shell r-shell--wide'>
			<div className='r-rank-head'>
				<div className='r-seg r-seg--wrap'>
					{RANKING_MODES.map((m) => (
						<button
							key={m}
							type='button'
							data-active={mode === m}
							onClick={() => {
								void navigate(m === 'pokedex' ? R.pokedex : R.rankings(m));
							}}
						>
							{MODE_LABEL[m]}
						</button>
					))}
				</div>
				<div className='r-typebar'>
					<button type='button' className='r-type-chip' data-active={!typeFilter} onClick={() => setType('')}>
						All
					</button>
					{TYPES.map((t) => (
						<button
							key={typeKey(t)}
							type='button'
							className='r-type-chip'
							data-active={typeFilter === typeKey(t)}
							style={{ ['--tc' as string]: typeVar(t) }}
							onClick={() => setType(typeKey(t))}
						>
							{TYPE_LABEL[typeKey(t)]}
						</button>
					))}
				</div>
				<p className='r-muted r-count'>
					{loading ? 'Loading…' : `${rows.length.toLocaleString()} Pokémon`}
					{mode === 'raid' && typeFilter && ` · best ${TYPE_LABEL[typeFilter]} attackers`}
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
								data-index={vi.index}
								ref={virt.measureElement}
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
										<PokeCard key={row.pokemon.speciesId} pokemon={row.pokemon} metric={row.metric} />
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
