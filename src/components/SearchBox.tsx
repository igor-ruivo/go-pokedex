import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { useDismiss } from '../hooks/useDismiss';
import { cleanName, dexNo } from '../lib/format';
import { R } from '../lib/nav';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { ShadowMark } from './ShadowMark';
import { spriteUrl } from './Sprite';

const MAX_PER_GROUP = 16;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

type Hit = { kind: 'pokemon'; p: IGamemasterPokemon } | { kind: 'move'; m: IGameMasterMove };

/**
 * App-bar search with a typeahead dropdown over BOTH Pokémon and moves (Pokémon
 * listed first, a divider between the groups). Picking a result opens it without
 * leaving the current section (the tab is kept when already on a detail page). On
 * the grid views the query also drives the `?q=` Pokémon filter in place.
 */
export const SearchBox = () => {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [params, setParams] = useSearchParams();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { moves } = useMoves();
	const { imageSource } = useImageSource();
	const { currentGameLanguage: gl } = useLanguage();

	const [q, setQ] = useState(params.get('q') ?? '');
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	useEffect(() => {
		setQ(params.get('q') ?? '');
	}, [params]);

	const onGrid = pathname === R.pokedex || pathname.startsWith('/rankings');
	const detailTab = /^\/pokemon\/[^/]+\/([^/]+)/.exec(pathname)?.[1];

	useEffect(() => {
		if (!onGrid) return;
		const id = setTimeout(() => {
			const next = q.trim();
			if ((params.get('q') ?? '') === next) return;
			const p = new URLSearchParams(params);
			if (next) p.set('q', next);
			else p.delete('q');
			setParams(p, { replace: true });
		}, 200);
		return () => clearTimeout(id);
	}, [q, onGrid, params, setParams]);

	const allPokemon = useMemo(
		() =>
			fetchCompleted
				? Object.values(gamemasterPokemon)
						.filter((p) => !p.aliasId)
						.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId))
				: [],
		[gamemasterPokemon, fetchCompleted]
	);
	const allMoves = useMemo(() => Object.values(moves), [moves]);

	const { results, splitAt } = useMemo<{ results: Array<Hit>; splitAt: number }>(() => {
		const term = norm(q);
		if (!term) return { results: [], splitAt: 0 };
		const rank = (hay: Array<string>) => {
			for (const h of hay) {
				if (h.startsWith(term)) return 0;
			}
			for (const h of hay) {
				if (h.includes(term)) return 1;
			}
			return -1;
		};

		const pk: Array<{ p: IGamemasterPokemon; s: number }> = [];
		for (const p of allPokemon) {
			const s = rank([norm(p.speciesName), norm(p.speciesId)]);
			if (s >= 0 || String(p.dex) === q.trim()) pk.push({ p, s: s < 0 ? 0 : s });
		}
		pk.sort((a, b) => a.s - b.s || a.p.dex - b.p.dex);

		const seen = new Set<string>();
		const mv: Array<{ m: IGameMasterMove; s: number }> = [];
		for (const m of allMoves) {
			const label = m.moveName[gl] ?? m.moveId;
			// collapse only exact cosmetic clones (same name + identical stats)
			const sig = `${label}|${m.pvePower}|${m.pvpPower}|${m.pveEnergy}|${m.pvpEnergy}|${m.pveCooldown}|${m.pvpCooldown}`;
			if (seen.has(sig)) continue;
			seen.add(sig);
			const s = rank([norm(label), norm(m.moveId)]);
			if (s >= 0) mv.push({ m, s });
		}
		mv.sort((a, b) => a.s - b.s || (a.m.moveName[gl] ?? a.m.moveId).localeCompare(b.m.moveName[gl] ?? b.m.moveId));

		const pkHits = pk.slice(0, MAX_PER_GROUP).map((x): Hit => ({ kind: 'pokemon', p: x.p }));
		const mvHits = mv.slice(0, MAX_PER_GROUP).map((x): Hit => ({ kind: 'move', m: x.m }));
		return { results: [...pkHits, ...mvHits], splitAt: pkHits.length && mvHits.length ? pkHits.length : 0 };
	}, [q, allPokemon, allMoves, gl]);

	useEffect(() => setActive(0), [q]);

	const pick = (hit: Hit) => {
		setOpen(false);
		setQ('');
		void navigate(hit.kind === 'pokemon' ? R.pokemon(hit.p.speciesId, detailTab) : R.move(hit.m.moveId));
	};

	const showMenu = open && q.trim().length > 0 && results.length > 0;

	return (
		<div className='r-search' ref={rootRef}>
			<span aria-hidden>⌕</span>
			<input
				value={q}
				onChange={(e) => {
					setQ(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onKeyDown={(e) => {
					if (!showMenu) return;
					if (e.key === 'ArrowDown') {
						e.preventDefault();
						setActive((i) => Math.min(i + 1, results.length - 1));
					} else if (e.key === 'ArrowUp') {
						e.preventDefault();
						setActive((i) => Math.max(i - 1, 0));
					} else if (e.key === 'Enter') {
						e.preventDefault();
						const hit = results[active];
						if (hit) pick(hit);
					} else if (e.key === 'Escape') {
						setOpen(false);
					}
				}}
				placeholder='Search Pokémon or moves…'
				aria-label='Search Pokémon or moves'
				enterKeyHint='search'
				role='combobox'
				aria-expanded={showMenu}
				aria-controls='r-search-list'
				autoComplete='off'
			/>
			{q && (
				<button
					type='button'
					className='r-search-clear'
					aria-label='Clear search'
					onClick={() => {
						setQ('');
						setOpen(false);
					}}
				>
					×
				</button>
			)}
			{showMenu && (
				<ul className='r-search-menu' id='r-search-list' role='listbox'>
					{results.map((hit, i) => (
						<Fragment key={hit.kind === 'pokemon' ? `p-${hit.p.speciesId}` : `m-${hit.m.moveId}`}>
							{splitAt > 0 && i === splitAt && <li className='r-search-div' role='presentation' aria-hidden='true' />}
							<li>
								<button
									type='button'
									role='option'
									aria-selected={i === active}
									data-active={i === active ? '' : undefined}
									onMouseEnter={() => setActive(i)}
									onClick={() => pick(hit)}
								>
									{hit.kind === 'pokemon' ? (
										<>
											<span className='r-search-sprite'>
												{hit.p.isShadow && <ShadowMark />}
												<img src={spriteUrl(hit.p, imageSource)} alt='' loading='lazy' decoding='async' />
											</span>
											<span className='r-search-name'>
												{cleanName(hit.p.speciesName)}
												{hit.p.isShadow && <em className='r-search-shadow'> · Shadow</em>}
											</span>
											<span className='r-search-dex'>{dexNo(hit.p.dex)}</span>
										</>
									) : (
										<>
											<span className='r-search-movetype' aria-hidden='true'>
												<img
													src={`/images/types/${hit.m.type.toLowerCase()}.png`}
													alt=''
													loading='lazy'
													decoding='async'
												/>
											</span>
											<span className='r-search-name'>{hit.m.moveName[gl] ?? hit.m.moveId}</span>
											<span className='r-search-dex'>{hit.m.isFast ? 'Fast' : 'Charged'}</span>
										</>
									)}
								</button>
							</li>
						</Fragment>
					))}
				</ul>
			)}
		</div>
	);
};
