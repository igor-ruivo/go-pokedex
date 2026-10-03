import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { useDismiss } from '../hooks/useDismiss';
import { cleanName, dexNo } from '../lib/format';
import { R } from '../lib/nav';
import { selectAllOnTouchFocus } from '../lib/select-on-touch';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { ShadowMark } from './ShadowMark';
import { SpriteImg } from './Sprite';

const MAX_PER_GROUP = 16;
const SUGGESTION_DEBOUNCE_MS = 180;
const QUERY_DEBOUNCE_MS = 300;

type Hit = { kind: 'pokemon'; p: IGamemasterPokemon } | { kind: 'move'; m: IGameMasterMove };

const pokemonSuggestionName = (pokemon: IGamemasterPokemon): string => cleanName(pokemon.speciesName);

/**
 * App-bar search with a typeahead dropdown over BOTH Pokémon and moves (Pokémon
 * listed first, a divider between the groups). Picking a result opens it without
 * leaving the current section (the tab is kept when already on a detail page). On
 * the grid views the query also drives the `?q=` Pokémon filter in place.
 */
export const SearchBox = () => {
	const { t } = useTranslation(['components']);
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [params, setParams] = useSearchParams();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { moves } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();

	const [q, setQ] = useState(params.get('q') ?? '');
	const [suggestionQuery, setSuggestionQuery] = useState(params.get('q') ?? '');
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const lastObservedUrlQuery = useRef(params.get('q') ?? '');
	const lastWrittenQuery = useRef<string | null>(null);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false), { dim: false });

	const onGrid = pathname === R.pokedex || pathname.startsWith('/rankings') || pathname === R.moves;

	// Only the grid views mirror `?q=` into the box; elsewhere the box keeps whatever was typed/picked.
	useEffect(() => {
		if (!onGrid) return;
		const urlQuery = params.get('q') ?? '';
		if (urlQuery === lastObservedUrlQuery.current) return;
		lastObservedUrlQuery.current = urlQuery;
		if (lastWrittenQuery.current === urlQuery) {
			lastWrittenQuery.current = null;
			return;
		}
		setQ(urlQuery);
		setSuggestionQuery(urlQuery);
	}, [params, onGrid]);

	useEffect(() => {
		const id = window.setTimeout(() => setSuggestionQuery(q), SUGGESTION_DEBOUNCE_MS);
		return () => window.clearTimeout(id);
	}, [q]);

	const detailTab = /^\/pokemon\/[^/]+\/([^/]+)/.exec(pathname)?.[1];

	useEffect(() => {
		if (!onGrid) return;
		const id = setTimeout(() => {
			const next = q.trim();
			if ((params.get('q') ?? '') === next) return;
			const p = new URLSearchParams(params);
			if (next) p.set('q', next);
			else p.delete('q');
			lastWrittenQuery.current = next;
			setParams(p, { replace: true });
		}, QUERY_DEBOUNCE_MS);
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
		const term = suggestionQuery.trim().toLowerCase();
		if (!term) return { results: [], splitAt: 0 };
		const rank = (label: string) => {
			const name = label.toLowerCase();
			return name.startsWith(term) ? 0 : name.includes(term) ? 1 : -1;
		};

		const pk: Array<{ p: IGamemasterPokemon; s: number }> = [];
		for (const p of allPokemon) {
			const s = rank(pokemonSuggestionName(p));
			if (s >= 0) pk.push({ p, s });
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
			const s = rank(label);
			if (s >= 0) mv.push({ m, s });
		}
		mv.sort((a, b) => a.s - b.s || (a.m.moveName[gl] ?? a.m.moveId).localeCompare(b.m.moveName[gl] ?? b.m.moveId));

		const pkHits = pk.slice(0, MAX_PER_GROUP).map((x): Hit => ({ kind: 'pokemon', p: x.p }));
		const mvHits = mv.slice(0, MAX_PER_GROUP).map((x): Hit => ({ kind: 'move', m: x.m }));
		return { results: [...pkHits, ...mvHits], splitAt: pkHits.length && mvHits.length ? pkHits.length : 0 };
	}, [suggestionQuery, allPokemon, allMoves, gl]);

	useEffect(() => setActive(0), [suggestionQuery]);

	// The Pokédex and the rankings filter their own list by what is typed here, so picking a Pokémon there just closes
	// the dropdown and leaves the list filtered — it doesn't pull you off the ranking you are reading.
	const onRankingList = pathname === R.pokedex || pathname.startsWith('/rankings');

	const pick = (hit: Hit) => {
		setOpen(false);
		// Leave the picked entry's name in the box (the pick may not navigate away, and even when it does it shows
		// what was opened).
		const pickedName = hit.kind === 'pokemon' ? pokemonSuggestionName(hit.p) : (hit.m.moveName[gl] ?? hit.m.moveId);
		setQ(pickedName);
		setSuggestionQuery(pickedName);
		if (hit.kind === 'pokemon' && onRankingList) return;
		if (hit.kind === 'pokemon') {
			// `?lg=` (which league/raids tab the detail page's picker/readout was
			// showing) lives in the URL, same as `detailTab` above — carried over
			// the same way, so searching for a different Pokémon while already
			// looking at, say, Ultra League doesn't silently drop you back to
			// Great on the page you land on.
			const lg = pathname.startsWith('/pokemon/') ? params.get('lg') : null;
			void navigate({ pathname: R.pokemon(hit.p.speciesId, detailTab), search: lg ? `?lg=${lg}` : '' });
		} else {
			void navigate(R.move(hit.m.moveId));
		}
	};

	// While the debounce is still catching up with what was typed, keep showing the entries computed for the
	// previous query rather than closing the menu; it only closes once the box is empty or nothing matches.
	const settled = q === suggestionQuery;
	const showMenu = open && q.trim().length > 0 && results.length > 0;

	return (
		<div className='r-search' ref={rootRef}>
			<svg className='r-search-icon' viewBox='0 0 24 24' aria-hidden='true'>
				<circle cx='11' cy='11' r='7' />
				<line x1='21' y1='21' x2='16.2' y2='16.2' />
			</svg>
			<input
				value={q}
				onChange={(e) => {
					setQ(e.target.value);
					setOpen(true);
				}}
				onFocus={(e) => {
					selectAllOnTouchFocus(e);
					setOpen(true);
				}}
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
						// Not while the entries on screen still belong to an older query.
						const hit = settled ? results[active] : undefined;
						if (hit) pick(hit);
					} else if (e.key === 'Escape') {
						setOpen(false);
					}
				}}
				placeholder={t('components:searchBox.placeholder')}
				aria-label={t('components:searchBox.ariaLabel')}
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
					aria-label={t('components:searchBox.clearAriaLabel')}
					onClick={() => {
						setQ('');
						setSuggestionQuery('');
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
												<SpriteImg pokemon={hit.p} loading='lazy' />
											</span>
											<span className='r-search-name'>{cleanName(hit.p.speciesName)}</span>
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
											<span className='r-search-dex'>
												{hit.m.isFast ? t('components:searchBox.fast') : t('components:searchBox.charged')}
											</span>
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
