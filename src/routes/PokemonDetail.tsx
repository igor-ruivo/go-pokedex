import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { IvPicker, type IVs } from '../components/IvPicker';
import { ShadowMark } from '../components/ShadowMark';
import { goSpriteUrl, Sprite, spriteUrl } from '../components/Sprite';
import { Stepper } from '../components/Stepper';
import { useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import useComputeIVs from '../hooks/useComputeIVs';
import { fmtMult, isDoubleMult, typeMatchups } from '../lib/effectiveness';
import { cleanName, dexNo, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { accentStyle, TYPE_LABEL, typeKey, typeVar } from '../lib/types';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import {
	calculateCP,
	computeDPSEntry,
	fetchPokemonFamily,
	fetchReachablePokemonIncludingSelf,
	levelToLevelIndex,
	MAX_LEVEL,
	MAX_LEVEL_INDEX,
} from '../utils/pokemon-helper';
import CountersTab from './pokemon/CountersTab';
import IvTableTab from './pokemon/IvTableTab';
import MovesTab from './pokemon/MovesTab';
import SearchStringsTab from './pokemon/SearchStringsTab';

const LEAGUES = [
	{ id: 0, label: 'Great', full: 'Great League', cssVar: 'var(--lg-great)' },
	{ id: 1, label: 'Ultra', full: 'Ultra League', cssVar: 'var(--lg-ultra)' },
	{ id: 2, label: 'Master', full: 'Master League', cssVar: 'var(--lg-master)' },
	{ id: 3, label: 'Raids', full: 'Raids', cssVar: 'var(--lg-raid)' },
] as const;
type LeagueId = 0 | 1 | 2 | 3;
type PvpLeague = 0 | 1 | 2;

/** `?lg=` on the URL — set when you arrive from a league / raid ranking. */
const LG_PARAM: Record<string, LeagueId> = { great: 0, ultra: 1, master: 2, raid: 3 };

const TABS = [
	['Ranks', 'ranks'],
	['Moves', 'moves'],
	['Counters', 'counters'],
	['IV Table', 'iv-table'],
	['Strings', 'strings'],
] as const;
type TabLabel = (typeof TABS)[number][0];
const SLUG_TO_TAB = Object.fromEntries(TABS.map(([label, slug]) => [slug, label])) as Record<string, TabLabel>;

const leagueSlice = (ivp: IIvPercents | undefined, id: PvpLeague) => {
	if (!ivp) return undefined;
	switch (id) {
		case 0:
			return {
				rank: ivp.greatLeagueRank,
				cp: ivp.greatLeagueCP,
				lvl: ivp.greatLeagueLvl,
				perfect: ivp.greatLeaguePerfect,
				perfectCP: ivp.greatLeaguePerfectCP,
				perfectLvl: ivp.greatLeaguePerfectLevel,
			};
		case 1:
			return {
				rank: ivp.ultraLeagueRank,
				cp: ivp.ultraLeagueCP,
				lvl: ivp.ultraLeagueLvl,
				perfect: ivp.ultraLeaguePerfect,
				perfectCP: ivp.ultraLeaguePerfectCP,
				perfectLvl: ivp.ultraLeaguePerfectLevel,
			};
		default:
			return {
				rank: ivp.masterLeagueRank,
				cp: ivp.masterLeagueCP,
				lvl: ivp.masterLeagueLvl,
				perfect: ivp.masterLeaguePerfect,
				perfectCP: ivp.masterLeaguePerfectCP,
				perfectLvl: ivp.masterLeaguePerfectLevel,
			};
	}
};

const PokemonDetail = () => {
	const { speciesId = '', tab: tabParam } = useParams();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { imageSource } = useImageSource();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();

	const pokemon = fetchCompleted ? gamemasterPokemon[speciesId] : undefined;
	const tab: TabLabel = SLUG_TO_TAB[tabParam ?? 'ranks'] ?? 'Ranks';

	const lgParam = searchParams.get('lg') ?? '';
	const [iv, setIv] = useState<IVs>({ atk: 15, def: 15, hp: 15 });
	const [level, setLevel] = useState(MAX_LEVEL);
	const [league, setLeague] = useState<LeagueId>(LG_PARAM[lgParam] ?? 0);
	const [heroSpriteIdx, setHeroSpriteIdx] = useState(0);
	useEffect(() => setHeroSpriteIdx(0), [speciesId]);
	// arriving from a league / raid ranking (`?lg=`) opens that league selected
	useEffect(() => {
		const l = LG_PARAM[lgParam];
		if (l != null) setLeague(l);
	}, [lgParam, speciesId]);
	const isRaid = league === 3;

	// IV percents for the whole reachable family — the "Your IVs" card shows whichever
	// member the league carousel is on (best reachable by default, not the URL mon).
	const [ivPercents, ivLoading] = useComputeIVs({
		pokemon: pokemon as never,
		attackIV: iv.atk,
		defenseIV: iv.def,
		hpIV: iv.hp,
	});

	// Whole evolution family for the picker — same rule as the legacy site:
	// predecessors + the full line, restricted to this Pokémon's shadow-ness.
	const family = useMemo(() => {
		if (!pokemon) return [];
		return [...fetchPokemonFamily(pokemon, gamemasterPokemon)].sort(
			(a, b) => a.dex - b.dex || (a.isMega ? 1 : 0) - (b.isMega ? 1 : 0) || a.speciesName.localeCompare(b.speciesName)
		);
	}, [pokemon, gamemasterPokemon]);

	// Forward-reachable only (you can't devolve) — what "best reachable" means.
	const reachablePvp = useMemo(
		() => (pokemon ? Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon)) : []),
		[pokemon, gamemasterPokemon]
	);
	const reachableRaid = useMemo(
		() => (pokemon ? Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)) : []),
		[pokemon, gamemasterPokemon]
	);

	// Ordered "best reachable" candidates per league/raid — same idea as the legacy site.
	const boardData = useMemo(() => {
		const self = pokemon?.speciesId ?? '';
		const pvpList = (idx: number) =>
			[...reachablePvp]
				.filter((p) => p.speciesId === self || rankLists[idx]?.[p.speciesId]?.rank != null)
				.sort((a, b) => {
					const ra = rankLists[idx]?.[a.speciesId]?.rank;
					const rb = rankLists[idx]?.[b.speciesId]?.rank;
					if (ra == null && rb == null) return a.speciesId.localeCompare(b.speciesId);
					if (ra == null) return 1;
					if (rb == null) return -1;
					return ra - rb;
				});

		// every attacking-type list this species is ranked in, best rank first
		const rankedTypes = (sid: string) =>
			Object.entries(raidDPS)
				.filter(([t]) => t !== '')
				.map(([type, list]) => ({ type, entry: list[sid] as DPSEntry | undefined }))
				.filter((x): x is { type: string; entry: DPSEntry } => !!x.entry)
				.sort((a, b) => a.entry.rank - b.entry.rank);

		const raid = [...reachableRaid]
			.map((p) => ({ p, types: rankedTypes(p.speciesId) }))
			.sort((a, b) => {
				const ra = a.types[0]?.entry.rank ?? Number.POSITIVE_INFINITY;
				const rb = b.types[0]?.entry.rank ?? Number.POSITIVE_INFINITY;
				return ra - rb || a.p.speciesId.localeCompare(b.p.speciesId);
			});

		return { pvp: [pvpList(0), pvpList(1), pvpList(2)], raid };
	}, [pokemon, reachablePvp, reachableRaid, rankLists, raidDPS]);

	// Carousel positions: p = which reachable Pokémon, t = which raid type,
	// m[type] = which fast+charged combo for that type.
	type Cpos = { p: number; t: number; m: Record<string, number> };
	const [carousel, setCarousel] = useState<Record<number, Cpos>>({});
	useEffect(() => setCarousel({}), [speciesId]);
	const cpos = (id: number): Cpos => carousel[id] ?? { p: 0, t: 0, m: {} };
	const candLen = (id: number) => (id === 3 ? boardData.raid.length : (boardData.pvp[id]?.length ?? 0));

	// "Your IVs" follows the PvP carousel (best reachable by default), not the URL mon.
	const pvpLeague: PvpLeague = isRaid ? 0 : (league as PvpLeague);
	const pvpCandidates = boardData.pvp[pvpLeague] ?? [];
	const pvpMember = pvpCandidates[Math.min(cpos(league).p, Math.max(0, pvpCandidates.length - 1))] ?? pokemon;
	const slice = !isRaid ? leagueSlice(ivPercents[pvpMember?.speciesId ?? ''], pvpLeague) : undefined;

	// On load and whenever the league (or carouseled member) changes, snap the IV
	// spread to that league's rank-1 spread AND the level that hits its CP cap with
	// that spread (the "… CP at LX" from the readout). The user can still drag both.
	const perfectKey = slice ? `${slice.perfect.A}-${slice.perfect.D}-${slice.perfect.S}-${slice.perfectLvl}` : '';
	useEffect(() => {
		if (!slice?.perfect) return;
		setIv({ atk: slice.perfect.A, def: slice.perfect.D, hp: slice.perfect.S });
		if (slice.perfectLvl) setLevel(slice.perfectLvl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [league, pvpMember?.speciesId, perfectKey]);

	const cycleRow = (id: LeagueId) => {
		if (league === id) {
			const len = candLen(id);
			setCarousel((c) => ({ ...c, [id]: { p: len ? ((c[id]?.p ?? 0) + 1) % len : 0, t: 0, m: {} } }));
		} else {
			setCarousel({});
			setLeague(id);
		}
	};
	// leaving a raid type resets its fast+charged combo back to the best one
	const withTypeLeft = (cur: Cpos, nextT: number): Record<string, number> => {
		const types = boardData.raid[cur.p]?.types ?? [];
		if (!types.length) return cur.m;
		const leftIdx = Math.min(cur.t, types.length - 1);
		const nextIdx = Math.min(nextT, types.length - 1);
		const left = types[leftIdx]?.type;
		return left && leftIdx !== nextIdx ? { ...cur.m, [left]: 0 } : cur.m;
	};
	const cycleType = (e: ReactMouseEvent, id: LeagueId) => {
		e.stopPropagation();
		if (id !== 3) return;
		if (league !== 3) {
			setCarousel({});
			setLeague(3);
			return;
		}
		const len = boardData.raid[cpos(3).p]?.types.length ?? 0;
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			const nextT = len ? (cur.t + 1) % len : 0;
			return { ...c, [3]: { ...cur, t: nextT, m: withTypeLeft(cur, nextT) } };
		});
	};
	const selectType = (i: number) => {
		if (league !== 3) setLeague(3);
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			return { ...c, [3]: { ...cur, t: i, m: withTypeLeft(cur, i) } };
		});
	};
	const cycleMove = (type: string, len: number) => {
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			return { ...c, [3]: { ...cur, m: { ...cur.m, [type]: len ? ((cur.m[type] ?? 0) + 1) % len : 0 } } };
		});
	};

	// fast+charged combos per attacking type for the carouseled raid member, best DPS first.
	const comboLists = useMemo(() => {
		const out: Record<string, Array<{ f: string; c: string; dps: number }>> = {};
		const raid = boardData.raid;
		const sel = raid[Math.min(carousel[3]?.p ?? 0, Math.max(0, raid.length - 1))];
		if (!sel?.p || !movesFetchCompleted || Object.keys(moves).length === 0) return out;
		const member = sel.p;
		const charged = [...new Set([...member.chargedMoves, ...(member.extraChargedMoves ?? [])])];
		for (const { type } of sel.types) {
			const tc = charged.filter((id) => moves[id]?.type?.toLowerCase() === type);
			out[type] = member.fastMoves
				.flatMap((f) =>
					tc.map((c) => ({
						f,
						c,
						dps: computeDPSEntry(member, gamemasterPokemon, moves, 15, MAX_LEVEL_INDEX, '', undefined, [f, c]).dps,
					}))
				)
				.sort((a, b) => b.dps - a.dps)
				// only the best few combos — enough to compare, without an unreadable pip strip
				.slice(0, 5);
		}
		return out;
	}, [boardData, carousel, moves, movesFetchCompleted, gamemasterPokemon]);

	const heroCp = useMemo(() => {
		if (!pokemon) return 0;
		return calculateCP(
			pokemon.baseStats.atk,
			iv.atk,
			pokemon.baseStats.def,
			iv.def,
			pokemon.baseStats.hp,
			iv.hp,
			levelToLevelIndex(level)
		);
	}, [pokemon, iv, level]);

	const matchups = useMemo(
		() => (pokemon ? typeMatchups(pokemon.types.map((t) => String(t))) : { weak: [], resist: [] }),
		[pokemon]
	);

	if (!fetchCompleted) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
				Loading Pokédex…
			</div>
		);
	}
	if (!pokemon) {
		return (
			<div className='r-loading'>
				<p>No Pokémon “{speciesId}”.</p>
				<Link to={R.pokemon('dialga')} className='r-chip' style={{ marginTop: 12 }}>
					Go to Dialga
				</Link>
			</div>
		);
	}

	const self = pokemon.speciesId;
	const primary = pokemon.types[0];
	const baseId = self.replace('_shadow', '');
	const hasShadow = !!gamemasterPokemon[`${baseId}_shadow`];
	const isShadow = self.endsWith('_shadow');

	// Raid card follows the raid carousel (which Pokémon + which type + which combo), not the URL mon.
	const raidSel = boardData.raid[Math.min(cpos(3).p, Math.max(0, boardData.raid.length - 1))];
	const raidMember = raidSel?.p ?? pokemon;
	const raidSelTypeIdx = Math.min(cpos(3).t, Math.max(0, (raidSel?.types.length ?? 1) - 1));
	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);
	const raidElite = new Set(raidMember.eliteMoves);
	const raidLegacy = new Set(raidMember.legacyMoves);
	const raidMoveTag = (id: string) => (raidLegacy.has(id) ? 'Legacy' : raidElite.has(id) ? 'Elite' : null);
	const raidRows = (raidSel?.types ?? []).map(({ type, entry }, i) => {
		const combos = comboLists[type] ?? [];
		const mIdx = Math.min(cpos(3).m[type] ?? 0, Math.max(0, combos.length - 1));
		return { t: type, e: entry, on: i === raidSelTypeIdx, combos, mIdx, combo: combos[mIdx] };
	});
	const raidSelRow = raidRows[raidSelTypeIdx];

	// Hero sprite carousel — cycle the official / GO / shiny-GO artwork by tapping.
	const heroSprites = [
		...new Set(
			[pokemon.imageUrl, goSpriteUrl(pokemon.goImageUrl), goSpriteUrl(pokemon.shinyGoImageUrl)].filter(Boolean)
		),
	];
	const heroIdx = heroSprites.length ? heroSpriteIdx % heroSprites.length : 0;

	// Each leaderboard row = the currently-carouseled "best reachable" for that league.
	const boardRows = LEAGUES.map((l) => {
		const raidRow = l.id === 3;
		const ready = raidRow ? raidDPSFetchCompleted : pvpFetchCompleted;
		const { p, t } = cpos(l.id);
		let member: IGamemasterPokemon | undefined;
		let rank: number | undefined;
		let metric = '';
		let bestType: string | undefined;
		let typeCount = 0;
		let typeIdx = 0;
		let rankChange = 0;
		const total = raidRow ? boardData.raid.length : (boardData.pvp[l.id]?.length ?? 0);
		const pIdx = total ? Math.min(p, total - 1) : 0;

		if (raidRow) {
			const cand = boardData.raid[pIdx];
			member = cand?.p;
			typeCount = cand?.types.length ?? 0;
			typeIdx = typeCount ? Math.min(t, typeCount - 1) : 0;
			const tr = cand?.types[typeIdx];
			if (tr) {
				rank = tr.entry.rank;
				metric = `${tr.entry.dps.toFixed(1)} DPS`;
				bestType = tr.type;
			}
		} else {
			member = boardData.pvp[l.id]?.[pIdx];
			const e = member ? rankLists[l.id]?.[member.speciesId] : undefined;
			if (e) {
				rank = e.rank;
				metric = `${e.score.toFixed(1)} pts`;
				rankChange = e.rankChange ?? 0;
			}
		}
		return { l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange };
	});

	return (
		<div className='r-shell'>
			{/* ---- HERO (the only place the primary-type colour leaks) ---- */}
			<header className='r-hero' style={accentStyle(primary)}>
				<div className='r-hero-top'>
					<Sprite
						pokemon={pokemon}
						src={heroSprites[heroIdx]}
						onTap={() => setHeroSpriteIdx((i) => i + 1)}
						hint={{ count: heroSprites.length, active: heroIdx }}
					/>
					<div style={{ flex: 1 }}>
						<div className='r-dexno'>{dexNo(pokemon.dex)}</div>
						<h1 className='r-name'>{cleanName(pokemon.speciesName)}</h1>
						<div className='r-cp'>
							<b>{heroCp.toLocaleString()}</b>
							<span>CP</span>
						</div>
						<div className='r-types' style={{ justifyContent: 'flex-start', marginTop: 10 }}>
							{pokemon.types.map((t) => (
								<span key={String(t)} className='r-type' style={{ ['--tc' as string]: typeVar(t) }}>
									{TYPE_LABEL[typeKey(t)] ?? String(t)}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className='r-stats'>
					<div className='r-stat'>
						<i>ATK</i>
						<b>{pokemon.baseStats.atk}</b>
					</div>
					<div className='r-stat'>
						<i>DEF</i>
						<b>{pokemon.baseStats.def}</b>
					</div>
					<div className='r-stat'>
						<i>HP</i>
						<b>{pokemon.baseStats.hp}</b>
					</div>
				</div>

				<div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
					<Stepper
						value={level}
						min={1}
						max={MAX_LEVEL}
						step={0.5}
						onChange={setLevel}
						format={(v) => `Lvl ${Number.isInteger(v) ? v : v.toFixed(1)}`}
					/>
					{hasShadow && (
						<button
							type='button'
							className='r-toggle r-toggle--shadow'
							data-on={isShadow}
							onClick={() => void navigate(R.pokemon(isShadow ? baseId : `${baseId}_shadow`))}
						>
							<ShadowMark className='r-toggle-flame' />
							Shadow
						</button>
					)}
				</div>
			</header>

			{/* ---- FAMILY LINE (shared across every tab — click to open that Pokémon) ---- */}
			<div className='r-section-h'>{cleanName(pokemon.speciesName)}’s family line</div>
			<div className='r-reach'>
				{family.map((m) => (
					<Link
						key={m.speciesId}
						to={`${R.pokemon(m.speciesId, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`}
						className='r-reach-chip'
						data-active={m.speciesId === self}
						style={{ ['--tc' as string]: typeVar(m.types[0]) }}
					>
						{m.isShadow && <ShadowMark />}
						<span className='r-reach-art'>
							<img src={spriteUrl(m, imageSource)} alt='' loading='lazy' decoding='async' />
						</span>
						<span>{cleanName(m.speciesName)}</span>
					</Link>
				))}
			</div>

			{/* ---- LEAGUE + TABS ---- */}
			<div className='r-seg r-seg--league' role='tablist' aria-label='League / mode'>
				{LEAGUES.map((l) => (
					<button
						key={l.id}
						type='button'
						data-active={league === l.id}
						style={{ ['--seg-c' as string]: l.cssVar }}
						onClick={() => setLeague(l.id as LeagueId)}
					>
						{l.label}
					</button>
				))}
			</div>

			<nav className='r-tabs'>
				{TABS.map(([label, slug]) => (
					<button
						key={slug}
						type='button'
						aria-current={tab === label ? 'page' : undefined}
						onClick={() => void navigate(R.pokemon(speciesId, slug))}
					>
						{label}
					</button>
				))}
			</nav>

			{tab === 'Moves' ? (
				<MovesTab pokemon={pokemon} league={league} />
			) : tab === 'IV Table' ? (
				<IvTableTab pokemon={pokemon} league={league} />
			) : tab === 'Strings' ? (
				<SearchStringsTab pokemon={pokemon} league={league} />
			) : tab === 'Counters' ? (
				<CountersTab pokemon={pokemon} league={league} />
			) : tab !== 'Ranks' ? (
				<div className='r-card' style={{ marginTop: 24, textAlign: 'center' }}>
					<p className='r-muted'>“{tab}” is next in the revamp.</p>
				</div>
			) : (
				<>
					{/* ---- LEADERBOARD — best reachable per league; click active row to cycle ---- */}
					<div className='r-section-h'>Leaderboard · best reachable</div>
					<div className='r-board'>
						{boardRows.map(
							({ l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange }) => {
								const active = league === l.id;
								return (
									<div
										key={l.id}
										className='r-board-row'
										role='button'
										tabIndex={0}
										aria-pressed={active}
										data-active={active}
										style={{ ['--lg' as string]: l.cssVar }}
										onClick={() => cycleRow(l.id as LeagueId)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												cycleRow(l.id as LeagueId);
											}
										}}
									>
										<span className='r-board-sprite'>
											{member?.isShadow && <ShadowMark />}
											{member && <img src={spriteUrl(member, imageSource)} alt='' loading='lazy' decoding='async' />}
											{bestType && (
												<span
													className='r-board-type'
													role='button'
													tabIndex={0}
													title={`${TYPE_LABEL[bestType] ?? bestType} — tap for next type`}
													onClick={(e) => cycleType(e, l.id as LeagueId)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															cycleType(e as unknown as ReactMouseEvent, l.id as LeagueId);
														}
													}}
												>
													<img src={`/images/types/${bestType}.png`} alt={TYPE_LABEL[bestType] ?? bestType} />
												</span>
											)}
										</span>
										<span className='r-board-id'>
											<span className='r-board-lg'>
												{l.full}
												{bestType && ` · ${TYPE_LABEL[bestType] ?? bestType} attackers`}
											</span>
											{l.id === 3 && typeCount > 1 && (
												<span className='r-board-typepips' aria-hidden='true'>
													{Array.from({ length: typeCount }, (_, i) => (
														<i key={i} data-on={i === typeIdx} />
													))}
												</span>
											)}
											<span className='r-board-name'>
												{member ? cleanName(member.speciesName) : ready ? 'Not ranked' : 'Loading…'}
											</span>
										</span>
										<span className='r-board-fig'>
											<span className='r-board-rank'>
												{rank != null ? ordinal(rank) : '—'}
												{l.id !== 3 && rankChange !== 0 && (
													<span className='r-delta' data-dir={rankChange > 0 ? 'up' : 'down'}>
														{rankChange > 0 ? '▲' : '▼'}
														{Math.abs(rankChange)}
													</span>
												)}
											</span>
											{metric && <span className='r-board-metric'>{metric}</span>}
										</span>
										{total > 1 && (
											<span className='r-board-pips' aria-hidden='true'>
												{Array.from({ length: total }, (_, i) => (
													<i key={i} data-on={i === pIdx} />
												))}
											</span>
										)}
									</div>
								);
							}
						)}
					</div>

					{isRaid ? (
						/* ---- RAID PERFORMANCE ---- */
						<>
							<div className='r-section-h'>
								Raid performance
								{raidMember.speciesId !== self && ` · ${cleanName(raidMember.speciesName)}`}
							</div>
							<div className='r-card' style={{ ['--accent' as string]: 'var(--lg-raid)' }}>
								{raidSelRow ? (
									<div className='r-readout'>
										<div>
											<i>{TYPE_LABEL[raidSelRow.t] ?? raidSelRow.t} rank</i>
											<b className='hi'>{ordinal(raidSelRow.e.rank)}</b>
										</div>
										<div>
											<i>DPS</i>
											<b>{(raidSelRow.combo?.dps ?? raidSelRow.e.dps).toFixed(1)}</b>
										</div>
										<div>
											<i>Base ATK</i>
											<b>{raidMember.baseStats.atk}</b>
										</div>
									</div>
								) : (
									<p className='r-muted'>Not ranked as a raid attacker.</p>
								)}

								{raidRows.length > 0 && (
									<>
										<div className='r-section-h' style={{ marginTop: 16 }}>
											Best moveset by type coverage
										</div>
										<div className='r-raidtypes'>
											{raidRows.map(({ t, e, on, combos, mIdx, combo }, i) => {
												const activate = () => (on ? cycleMove(t, combos.length) : selectType(i));
												return (
													<div
														key={t}
														className='r-raidtype'
														role='button'
														tabIndex={0}
														data-active={on ? '' : undefined}
														aria-pressed={on}
														title={on ? 'Tap for the next moveset' : 'Tap to select this type'}
														style={{ ['--tc' as string]: `var(--t-${t})` }}
														onClick={activate}
														onKeyDown={(ev) => {
															if (ev.key === 'Enter' || ev.key === ' ') {
																ev.preventDefault();
																activate();
															}
														}}
													>
														<span className='r-raidtype-head'>
															<span className='r-move-type'>{TYPE_LABEL[t] ?? t}</span>
															<b>{ordinal(e.rank)}</b>
															<em>{(combo?.dps ?? e.dps).toFixed(1)} DPS</em>
														</span>
														{combo && (
															<span className='r-raidtype-moves'>
																<span className='r-raidtype-mv'>
																	<Link to={R.move(combo.f)} onClick={(ev) => ev.stopPropagation()}>
																		{moveName(combo.f)}
																	</Link>
																	<i>+</i>
																	<Link to={R.move(combo.c)} onClick={(ev) => ev.stopPropagation()}>
																		{moveName(combo.c)}
																	</Link>
																</span>
																{[...new Set([raidMoveTag(combo.f), raidMoveTag(combo.c)])]
																	.filter((tg): tg is string => !!tg)
																	.map((tg) => (
																		<i key={tg} className='r-move-tag r-raidtype-tag'>
																			{tg}
																		</i>
																	))}
																{combos.length > 1 && (
																	<span className='r-raidtype-pips' aria-hidden='true'>
																		{combos.map((_, j) => (
																			<i key={j} data-on={j === mIdx} />
																		))}
																	</span>
																)}
															</span>
														)}
													</div>
												);
											})}
										</div>
									</>
								)}

								<p className='r-muted' style={{ marginTop: 14 }}>
									IVs barely matter in raids — chase the highest <b>Attack</b>.
								</p>
							</div>
						</>
					) : (
						<>
							{/* ---- IV PICKER ---- */}
							<div className='r-section-h'>Your IVs · {cleanName((pvpMember ?? pokemon).speciesName)}</div>
							<div className='r-card' style={{ ['--accent' as string]: LEAGUES[league].cssVar }}>
								<IvPicker
									value={iv}
									onChange={setIv}
									presets={[
										['0 / 0 / 0', { atk: 0, def: 0, hp: 0 }],
										['Hundo', { atk: 15, def: 15, hp: 15 }],
										...(league !== 2 && slice
											? [
													[
														`Rank 1 ${LEAGUES[league].label}`,
														{ atk: slice.perfect.A, def: slice.perfect.D, hp: slice.perfect.S },
													] as [string, { atk: number; def: number; hp: number }],
												]
											: []),
									]}
								/>
								<div className='r-readout'>
									<div>
										<i>{LEAGUES[league].label} IV rank</i>
										<b className='hi'>{ivLoading || !slice ? '…' : `#${(slice.rank + 1).toLocaleString()}`}</b>
									</div>
									<div>
										<i>Percentile</i>
										<b>{ivLoading || !slice ? '…' : `${(((4095 - slice.rank) / 4095) * 100).toFixed(1)}%`}</b>
									</div>
									<div>
										<i>CP{slice ? ` @ L${slice.lvl}` : ''}</i>
										<b>{ivLoading || !slice ? '…' : slice.cp.toLocaleString()}</b>
									</div>
								</div>
								{slice && (
									<p className='r-muted' style={{ marginTop: 12 }}>
										Best spread for {LEAGUES[league].label}:{' '}
										<b>
											{slice.perfect.A}/{slice.perfect.D}/{slice.perfect.S}
										</b>{' '}
										→ {slice.perfectCP.toLocaleString()} CP at L{slice.perfectLvl}.
									</p>
								)}
							</div>
						</>
					)}

					{/* ---- EFFECTIVENESS ---- */}
					<div className='r-section-h'>Type effectiveness · {cleanName(pokemon.speciesName)}</div>
					<div className='r-card'>
						<div className='r-eff'>
							<div className='r-eff-col'>
								<b>Weak to</b>
								<div className='r-eff-list'>
									{matchups.weak.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.weak.length === 0 && <span className='r-muted'>Nothing</span>}
								</div>
							</div>
							<div className='r-eff-col'>
								<b>Resists</b>
								<div className='r-eff-list'>
									{matchups.resist.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.resist.length === 0 && <span className='r-muted'>Nothing</span>}
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default PokemonDetail;
