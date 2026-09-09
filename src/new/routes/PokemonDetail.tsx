import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useImageSource } from '../../contexts/imageSource-context';
import type { IIvPercents } from '../../DTOs/ivs';
import useComputeIVs from '../../hooks/useComputeIVs';
import { useMoves } from '../../queries/moves';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { useRaidRanker } from '../../queries/raid-ranker';
import { calculateCP, fetchReachablePokemonIncludingSelf, levelToLevelIndex } from '../../utils/pokemon-helper';
import { IvPicker, type IVs } from '../components/IvPicker';
import { ShadowMark } from '../components/ShadowMark';
import { Sprite, spriteUrl } from '../components/Sprite';
import { Stepper } from '../components/Stepper';
import { multBadge, typeMatchups } from '../lib/effectiveness';
import { cleanName, dexNo, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { accentStyle, TYPE_LABEL, typeKey, typeVar } from '../lib/types';
import MovesTab from './pokemon/MovesTab';

const LEAGUES = [
	{ id: 0, label: 'Great', cssVar: 'var(--lg-great)' },
	{ id: 1, label: 'Ultra', cssVar: 'var(--lg-ultra)' },
	{ id: 2, label: 'Master', cssVar: 'var(--lg-master)' },
	{ id: 3, label: 'Raids', cssVar: 'var(--lg-raid)' },
] as const;
type LeagueId = 0 | 1 | 2 | 3;
type PvpLeague = 0 | 1 | 2;

const TABS = [
	['Ranks', 'ranks'],
	['Moves', 'moves'],
	['Counters', 'counters'],
	['IV Tables', 'iv-tables'],
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
	const navigate = useNavigate();
	const { imageSource } = useImageSource();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { moves, movesFetchCompleted } = useMoves();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

	const pokemon = fetchCompleted ? gamemasterPokemon[speciesId] : undefined;
	const tab: TabLabel = SLUG_TO_TAB[tabParam ?? 'ranks'] ?? 'Ranks';

	const [iv, setIv] = useState<IVs>({ atk: 15, def: 15, hp: 15 });
	const [level, setLevel] = useState(50);
	const [league, setLeague] = useState<LeagueId>(0);
	const [pickedId, setPickedId] = useState<string | null>(null);
	const isRaid = league === 3;

	// IV percents for the WHOLE reachable family, not just self (PvP only).
	const [ivPercents, ivLoading] = useComputeIVs({
		pokemon: pokemon as never,
		attackIV: iv.atk,
		defenseIV: iv.def,
		hpIV: iv.hp,
	});

	// Reachable evolutions from this Pokémon (self + forward). Raids can use megas.
	const reachable = useMemo(
		() =>
			pokemon
				? Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, isRaid))
				: [],
		[pokemon, gamemasterPokemon, isRaid]
	);

	const rankFor = (id: string): number =>
		(isRaid ? raidDPS['']?.[id]?.rank : rankLists[league]?.[id]?.rank) ?? Number.POSITIVE_INFINITY;

	const orderedReachable = useMemo(() => {
		const rk = (id: string): number =>
			(isRaid ? raidDPS['']?.[id]?.rank : rankLists[league]?.[id]?.rank) ?? Number.POSITIVE_INFINITY;
		return [...reachable].sort((a, b) => rk(a.speciesId) - rk(b.speciesId) || a.dex - b.dex);
	}, [reachable, rankLists, raidDPS, league, isRaid]);

	// Reset the pick to "best for this league" whenever the Pokémon or league changes.
	useEffect(() => setPickedId(null), [speciesId, league]);

	const bestId = orderedReachable[0]?.speciesId ?? speciesId;
	const activeId = pickedId ?? bestId;
	const active = gamemasterPokemon[activeId] ?? pokemon;

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
		() => (active ? typeMatchups(active.types.map((t) => String(t))) : { weak: [], resist: [] }),
		[active]
	);

	// Distinct charged-move types → the raid roles this Pokémon can fill.
	const raidTypes = useMemo(() => {
		if (!isRaid || !movesFetchCompleted || !active) return [];
		const s = new Set<string>();
		for (const id of [...active.chargedMoves, ...(active.extraChargedMoves ?? [])]) {
			const t = moves[id]?.type?.toLowerCase();
			if (t && t !== 'normal') s.add(t);
		}
		return [...s];
	}, [isRaid, active, moves, movesFetchCompleted]);

	if (!fetchCompleted) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
				Loading Pokédex…
			</div>
		);
	}
	if (!pokemon || !active) {
		return (
			<div className='r-loading'>
				<p>No Pokémon “{speciesId}”.</p>
				<Link to='/new/pokemon/dialga' className='r-chip' style={{ marginTop: 12 }}>
					Go to Dialga
				</Link>
			</div>
		);
	}

	const primary = pokemon.types[0];
	const baseId = pokemon.speciesId.replace('_shadow', '');
	const hasShadow = !!gamemasterPokemon[`${baseId}_shadow`];
	const isShadow = pokemon.speciesId.endsWith('_shadow');
	const activeIsSelf = activeId === pokemon.speciesId;

	const slice = !isRaid ? leagueSlice(ivPercents[activeId], league as PvpLeague) : undefined;
	const pvpRow = !isRaid && pvpFetchCompleted ? rankLists[league]?.[activeId] : undefined;

	const overallRaid = isRaid && raidDPSFetchCompleted ? raidDPS['']?.[activeId] : undefined;
	const raidRows = raidTypes
		.map((t) => ({ t, e: raidDPS[t]?.[activeId] }))
		.filter((x): x is { t: string; e: NonNullable<(typeof x)['e']> } => !!x.e)
		.sort((a, b) => a.e.rank - b.e.rank)
		.slice(0, 6);

	const activeSuffix = activeIsSelf ? '' : ` · ${cleanName(active.speciesName)}`;

	return (
		<div className='r-shell'>
			<button className='r-back' type='button' onClick={() => void navigate(-1)} aria-label='Back'>
				‹ Back
			</button>

			{/* ---- HERO (the only place the primary-type colour leaks) ---- */}
			<header className='r-hero' style={accentStyle(primary)}>
				<div className='r-hero-top'>
					<Sprite pokemon={pokemon} />
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

				<div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
					<Stepper
						value={level}
						min={1}
						max={51}
						step={0.5}
						onChange={setLevel}
						format={(v) => `Lvl ${Number.isInteger(v) ? v : v.toFixed(1)}`}
					/>
					{hasShadow && (
						<button
							type='button'
							className='r-toggle r-toggle--shadow'
							data-on={isShadow}
							onClick={() => void navigate(`/new/pokemon/${isShadow ? baseId : `${baseId}_shadow`}`)}
						>
							<ShadowMark className='r-toggle-flame' />
							Shadow
						</button>
					)}
				</div>
			</header>

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
			) : tab !== 'Ranks' ? (
				<div className='r-card' style={{ marginTop: 24, textAlign: 'center' }}>
					<p className='r-muted'>“{tab}” is next in the revamp.</p>
				</div>
			) : (
				<>
					{/* ---- REACHABLE FAMILY SWITCHER ---- */}
					{reachable.length > 1 && (
						<>
							<div className='r-section-h'>
								Best in {cleanName(pokemon.speciesName)}’s line · {LEAGUES[league].label}
							</div>
							<div className='r-reach'>
								{orderedReachable.map((m) => {
									const rk = rankFor(m.speciesId);
									return (
										<button
											key={m.speciesId}
											type='button'
											className='r-reach-chip'
											data-active={m.speciesId === activeId}
											data-unranked={rk === Number.POSITIVE_INFINITY}
											style={{ ['--lg' as string]: LEAGUES[league].cssVar }}
											onClick={() => setPickedId(m.speciesId)}
										>
											{m.isShadow && <ShadowMark />}
											<span className='r-reach-art'>
												<img src={spriteUrl(m, imageSource)} alt='' loading='lazy' decoding='async' />
											</span>
											<span>{cleanName(m.speciesName)}</span>
											<b>{rk === Number.POSITIVE_INFINITY ? 'unranked' : ordinal(rk)}</b>
										</button>
									);
								})}
							</div>
						</>
					)}

					{isRaid ? (
						/* ---- RAID PERFORMANCE ---- */
						<>
							<div className='r-section-h'>Raid performance{activeSuffix}</div>
							<div className='r-card' style={{ ['--accent' as string]: 'var(--lg-raid)' }}>
								{overallRaid ? (
									<div className='r-readout'>
										<div>
											<i>Overall rank</i>
											<b className='hi'>{ordinal(overallRaid.rank)}</b>
										</div>
										<div>
											<i>DPS</i>
											<b>{overallRaid.dps.toFixed(1)}</b>
										</div>
										<div>
											<i>Base ATK</i>
											<b>{active.baseStats.atk}</b>
										</div>
									</div>
								) : (
									<p className='r-muted'>Not ranked as a raid attacker.</p>
								)}

								{raidRows.length > 0 && (
									<>
										<div className='r-section-h' style={{ marginTop: 16 }}>
											Type coverage
										</div>
										<div className='r-raidtypes'>
											{raidRows.map(({ t, e }) => (
												<div key={t} className='r-raidtype' style={{ ['--tc' as string]: `var(--t-${t})` }}>
													<span className='r-move-type'>{TYPE_LABEL[t] ?? t}</span>
													<b>{ordinal(e.rank)}</b>
													<em>{e.dps.toFixed(1)} DPS</em>
												</div>
											))}
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
							<div className='r-section-h'>Your IVs{activeSuffix}</div>
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

							{/* ---- PVP LEADERBOARD ---- */}
							{pvpRow && (
								<>
									<div className='r-section-h'>{LEAGUES[league].label} League leaderboard</div>
									<div className='r-rank' style={{ ['--accent' as string]: LEAGUES[league].cssVar }}>
										<div className='r-rank-badge'>{ordinal(pvpRow.rank)}</div>
										<div className='r-rank-main'>
											<b>{cleanName(active.speciesName)}</b>
											<span>Score {pvpRow.score.toFixed(1)}</span>
										</div>
										<span
											className='r-delta'
											data-dir={pvpRow.rankChange > 0 ? 'up' : pvpRow.rankChange < 0 ? 'down' : 'flat'}
										>
											{pvpRow.rankChange > 0 ? '▲' : pvpRow.rankChange < 0 ? '▼' : '–'}
											{pvpRow.rankChange !== 0 ? Math.abs(pvpRow.rankChange) : ''}
										</span>
									</div>
								</>
							)}
						</>
					)}

					{/* ---- EFFECTIVENESS ---- */}
					<div className='r-section-h'>Type effectiveness{activeSuffix}</div>
					<div className='r-card'>
						<div className='r-eff'>
							<div className='r-eff-col'>
								<b>Weak to</b>
								<div className='r-eff-list'>
									{matchups.weak.map(({ type, mult }) => (
										<span key={type} className='r-eff-t' style={{ ['--tc' as string]: `var(--t-${type})` }}>
											{TYPE_LABEL[type]}
											{multBadge(mult) && <span className='r-eff-mult'>{multBadge(mult)}</span>}
										</span>
									))}
									{matchups.weak.length === 0 && <span className='r-muted'>Nothing</span>}
								</div>
							</div>
							<div className='r-eff-col'>
								<b>Resists</b>
								<div className='r-eff-list'>
									{matchups.resist.map(({ type, mult }) => (
										<span key={type} className='r-eff-t' style={{ ['--tc' as string]: `var(--t-${type})` }}>
											{TYPE_LABEL[type]}
											{multBadge(mult) && <span className='r-eff-mult'>{multBadge(mult)}</span>}
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
