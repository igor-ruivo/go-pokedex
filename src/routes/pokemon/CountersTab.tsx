import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { spriteUrl } from '../../components/Sprite';
import { useImageSource } from '../../contexts/imageSource-context';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import { TYPE_KEYS, TYPE_LABEL, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import { guessRaidTier, RAID_BOSS_STATS, type RaidTier } from '../../utils/pokemon-helper';
import { getComputeWorker } from '../../workers/compute-client';

const LEAGUE_NAME = ['Great', 'Ultra', 'Master', 'Raid'] as const;
const LG_SLUG = ['great', 'ultra', 'master', 'raid'] as const;
const PVP_TOP = 5;
const RAID_TOP = 10;

type Metric = 'dps' | 'tdo' | 'edps';
const METRIC_SORTS: ReadonlyArray<SortOption> = [
	{ key: 'dps', label: 'DPS', defaultDir: 'desc' },
	{ key: 'tdo', label: 'TDO', defaultDir: 'desc' },
	{ key: 'edps', label: 'eDPS', defaultDir: 'desc' },
];
const METRIC_BLURB: Record<Metric, string> = {
	dps: 'Damage per second while alive. Ignores bulk and downtime — favours glass cannons.',
	tdo: 'Total damage one copy deals before fainting (DPS × survival). Rewards bulk; ignores boss HP and lobby time.',
	edps: 'Damage per real second vs this exact boss, counting faints and the walk back from the lobby. The “will I beat the timer” number.',
};

const TIER_LABEL: Record<RaidTier, string> = {
	T1: 'Tier 1',
	T3: 'Tier 3',
	T5: 'Tier 5',
	MEGA: 'Mega',
	T6: 'Tier 6',
	PRIMAL: 'Primal',
	ELITE: 'Elite',
};
const TIER_ORDER: Array<RaidTier> = ['T1', 'T3', 'T5', 'MEGA', 'T6', 'PRIMAL', 'ELITE'];
/** PokeMiners raid-egg icon per tier, in /public/images/raids. */
const TIER_ICON: Record<RaidTier, string> = {
	T1: 'tier-1',
	T3: 'tier-3',
	T5: 'tier-5',
	MEGA: 'mega',
	T6: 'tier-6',
	PRIMAL: 'primal',
	ELITE: 'elite',
};

/** Weather → the attacker move types it boosts ×1.2, and its official icon file. */
const WEATHER: Array<{ key: string; label: string; icon: string; types: Array<string> }> = [
	{ key: '', label: 'No weather', icon: '', types: [] },
	{ key: 'sunny', label: 'Sunny / Clear', icon: 'sunny', types: ['grass', 'ground', 'fire'] },
	{ key: 'rain', label: 'Rainy', icon: 'rainy', types: ['water', 'electric', 'bug'] },
	{ key: 'partlycloudy', label: 'Partly Cloudy', icon: 'partly-cloudy', types: ['normal', 'rock'] },
	{ key: 'cloudy', label: 'Cloudy', icon: 'cloudy', types: ['fairy', 'fighting', 'poison'] },
	{ key: 'windy', label: 'Windy', icon: 'windy', types: ['dragon', 'flying', 'psychic'] },
	{ key: 'snow', label: 'Snow', icon: 'snow', types: ['ice', 'steel'] },
	{ key: 'fog', label: 'Fog', icon: 'fog', types: ['dark', 'ghost'] },
];

/** Raid damage bonus by friendship level. */
const FRIENDSHIP: Array<{ label: string; mult: number }> = [
	{ label: '—', mult: 1 },
	{ label: 'Good', mult: 1.03 },
	{ label: 'Great', mult: 1.05 },
	{ label: 'Ultra', mult: 1.07 },
	{ label: 'Best', mult: 1.11 },
];

const PARTY_SIZES = [1, 2, 3, 4];

const CountersTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();

	const isRaid = league === 3;

	const [mega, setMega] = useState(() => readPersistentValue(ConfigKeys.Mega) !== 'false');
	const [shadow, setShadow] = useState(() => readPersistentValue(ConfigKeys.Shadow) !== 'false');
	useEffect(() => void writePersistentValue(ConfigKeys.Mega, String(mega)), [mega]);
	useEffect(() => void writePersistentValue(ConfigKeys.Shadow, String(shadow)), [shadow]);

	// Raid battle-condition knobs (not persisted — session-local tuning).
	const [cfgOpen, setCfgOpen] = useState(false);
	const [metric, setMetric] = useState<Metric>('dps');
	const [metricDir, setMetricDir] = useState<SortDir>('desc');
	const [weatherKey, setWeatherKey] = useState('');
	const [partySize, setPartySize] = useState(1);
	const [friendship, setFriendship] = useState(1);
	const [megaBoostType, setMegaBoostType] = useState('');
	// Starts on the inferred tier for this boss; re-syncs when you open another one.
	const [tier, setTier] = useState<RaidTier>(() => guessRaidTier(pokemon));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => setTier(guessRaidTier(pokemon)), [pokemon.speciesId]);

	const weatherTypes = WEATHER.find((w) => w.key === weatherKey)?.types ?? [];
	const inferredTier = guessRaidTier(pokemon);

	const cfgDirty =
		weatherKey !== '' || partySize !== 1 || friendship !== 1 || megaBoostType !== '' || tier !== inferredTier;

	const clearConfig = () => {
		setWeatherKey('');
		setPartySize(1);
		setFriendship(1);
		setMegaBoostType('');
		setTier(inferredTier);
	};

	const activeSummary = [
		`${TIER_LABEL[tier]} Raid · ${RAID_BOSS_STATS[tier].hp.toLocaleString()} HP`,
		weatherKey && WEATHER.find((w) => w.key === weatherKey)?.label,
		partySize > 1 && `Party of ${partySize}`,
		friendship > 1 && `${FRIENDSHIP.find((f) => f.mult === friendship)?.label} Friend`,
		megaBoostType && `Mega ${TYPE_LABEL[megaBoostType] ?? megaBoostType} aura`,
	]
		.filter(Boolean)
		.join('  ·  ');

	// PvP: the pre-computed ranked entry for this exact species (as in the legacy site).
	const ranked = useMemo(
		() => (isRaid ? undefined : rankLists[league]?.[pokemon.speciesId]),
		[isRaid, rankLists, league, pokemon.speciesId]
	);

	const ready = fetchCompleted && (isRaid ? movesFetchCompleted : pvpFetchCompleted);

	const { data: raidCounters = [], isFetching: raidLoading } = useQuery({
		enabled: isRaid && ready,
		queryKey: ['raid-counters', pokemon.speciesId, weatherKey, partySize, friendship, megaBoostType, tier],
		queryFn: () =>
			getComputeWorker().raidComparisons({
				candidates: Object.values(gamemasterPokemon).filter((p) => !p.aliasId),
				moves,
				target: pokemon,
				opts: {
					weatherBoostedTypes: weatherTypes.length ? weatherTypes : undefined,
					partySize: partySize > 1 ? partySize : undefined,
					friendship: friendship > 1 ? friendship : undefined,
					megaBoostType: megaBoostType || undefined,
					tier,
				},
			}),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	const navigate = useNavigate();
	const link = (speciesId: string) => `${R.pokemon(speciesId, 'counters')}?lg=${LG_SLUG[league]}`;
	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);

	if (!ready) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	/* ---- PvP leagues (Great / Ultra / Master) ---- */
	if (!isRaid) {
		if (!ranked) {
			return (
				<div className='r-movecontent'>
					<div className='r-card' style={{ textAlign: 'center' }}>
						<p className='r-muted'>
							{cleanName(pokemon.speciesName)} isn’t ranked in {LEAGUE_NAME[league]} League — no pre-computed match-ups.
						</p>
					</div>
				</div>
			);
		}

		const name = cleanName(pokemon.speciesName);
		const section = (title: string, list: ReadonlyArray<{ opponent: string; rating: number }>) => (
			<>
				<div className='r-section-h'>{title}</div>
				<div className='r-ctr-list'>
					{list.length === 0 && <p className='r-muted'>No data.</p>}
					{list.map((m, i) => {
						const p = gamemasterPokemon[m.opponent];
						if (!p) return null;
						return (
							<Link
								key={m.opponent}
								to={link(m.opponent)}
								className='r-ctr-row'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
							>
								<span className='r-ctr-rank'>{i + 1}</span>
								<span className='r-ctr-art'>
									{p.isShadow && <ShadowMark />}
									<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
								</span>
								<span className='r-ctr-name'>{cleanName(p.speciesName)}</span>
								<span className='r-ctr-score' data-tone={m.rating >= 500 ? 'win' : 'lose'}>
									{(m.rating / 10).toFixed(1)}%
								</span>
							</Link>
						);
					})}
				</div>
			</>
		);

		return (
			<div className='r-movecontent'>
				{section(`${name} is strong against · ${LEAGUE_NAME[league]} League`, ranked.matchups.slice(0, PVP_TOP))}
				{section(`${name} is weak against · ${LEAGUE_NAME[league]} League`, ranked.counters.slice(0, PVP_TOP))}
			</div>
		);
	}

	/* ---- Raid ---- */
	const dirSign = metricDir === 'asc' ? 1 : -1;
	const list = [...raidCounters]
		.filter((e) => {
			const p = gamemasterPokemon[e.speciesId];
			return p && (shadow || !p.isShadow) && (mega || !p.isMega);
		})
		.sort((a, b) => dirSign * (a[metric] - b[metric]))
		.slice(0, RAID_TOP);

	return (
		<div className='r-movecontent'>
			<div className='r-section-h'>Best raid counters · {cleanName(pokemon.speciesName)}</div>

			<div className='r-ctr-metricbar'>
				<SortBar
					options={METRIC_SORTS}
					sortKey={metric}
					dir={metricDir}
					onChange={(k, d) => {
						setMetric(k as Metric);
						setMetricDir(d);
					}}
				/>
				<p className='r-ctr-blurb'>{METRIC_BLURB[metric]}</p>
			</div>

			<div className='r-ctr-config' data-open={cfgOpen}>
				<div className='r-ctr-config-bar'>
					<button
						type='button'
						className='r-ctr-config-toggle'
						aria-expanded={cfgOpen}
						onClick={() => setCfgOpen((o) => !o)}
					>
						<span className='r-ctr-config-ic' aria-hidden='true'>
							⚙
						</span>
						<span className='r-ctr-config-sum'>{activeSummary}</span>
						<span className='r-ctr-config-chev' aria-hidden='true'>
							{cfgOpen ? 'Hide' : 'Edit'}
						</span>
					</button>
					{cfgDirty && (
						<button type='button' className='r-ctr-config-clear' onClick={clearConfig}>
							Clear
						</button>
					)}
				</div>

				{cfgOpen && (
					<div className='r-ctr-panel'>
						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>Boss tier</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-iconrow'>
									{TIER_ORDER.map((t) => (
										<button
											key={t}
											type='button'
											className='r-ctr-iconbtn'
											title={`${TIER_LABEL[t]} — ${RAID_BOSS_STATS[t].hp.toLocaleString()} HP`}
											aria-label={`${TIER_LABEL[t]} raid`}
											data-active={tier === t}
											onClick={() => setTier(t)}
										>
											<img src={`/images/raids/${TIER_ICON[t]}.png`} alt='' loading='lazy' />
										</button>
									))}
								</div>
								<span className='r-ctr-cond-hint'>
									{TIER_LABEL[tier]} Raid · {RAID_BOSS_STATS[tier].hp.toLocaleString()} HP
								</span>
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>Weather</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-iconrow'>
									{WEATHER.map((w) => (
										<button
											key={w.key || 'none'}
											type='button'
											className='r-ctr-iconbtn'
											title={w.label}
											aria-label={w.label}
											data-active={weatherKey === w.key}
											onClick={() => setWeatherKey(w.key)}
										>
											{w.icon ? (
												<img className='r-wx' src={`/images/weather/${w.icon}.png`} alt='' loading='lazy' />
											) : (
												<span className='r-ctr-none'>—</span>
											)}
										</button>
									))}
								</div>
								{weatherTypes.length > 0 && (
									<span className='r-ctr-cond-hint'>
										×1.2 · {weatherTypes.map((t) => TYPE_LABEL[t] ?? t).join(', ')}
									</span>
								)}
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>Mega aura</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-iconrow'>
									<button
										type='button'
										className='r-ctr-iconbtn'
										title='No Mega on team'
										aria-label='No Mega on team'
										data-active={!megaBoostType}
										onClick={() => setMegaBoostType('')}
									>
										<span className='r-ctr-none'>—</span>
									</button>
									{TYPE_KEYS.map((t) => (
										<button
											key={t}
											type='button'
											className='r-ctr-iconbtn'
											title={`Mega ${TYPE_LABEL[t] ?? t}`}
											aria-label={`Mega ${TYPE_LABEL[t] ?? t}`}
											data-active={megaBoostType === t}
											onClick={() => setMegaBoostType(megaBoostType === t ? '' : t)}
										>
											<img src={`/images/types/${t}.png`} alt='' loading='lazy' />
										</button>
									))}
								</div>
								{megaBoostType && (
									<span className='r-ctr-cond-hint'>
										×1.3 {TYPE_LABEL[megaBoostType] ?? megaBoostType} · ×1.1 others
									</span>
								)}
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>Party Power</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-seg'>
									{PARTY_SIZES.map((n) => (
										<button key={n} type='button' data-active={partySize === n} onClick={() => setPartySize(n)}>
											{n === 1 ? 'Solo' : n}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>Friendship</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-seg'>
									{FRIENDSHIP.map((f) => (
										<button
											key={f.label}
											type='button'
											data-active={friendship === f.mult}
											onClick={() => setFriendship(f.mult)}
										>
											{f.label}
										</button>
									))}
								</div>
								{friendship > 1 && <span className='r-ctr-cond-hint'>×{friendship.toFixed(2)} damage</span>}
							</div>
						</div>

						<details className='r-ctr-help'>
							<summary>What do these mean?</summary>
							<dl>
								<dt>DPS</dt>
								<dd>{METRIC_BLURB.dps}</dd>
								<dt>TDO</dt>
								<dd>{METRIC_BLURB.tdo}</dd>
								<dt>eDPS</dt>
								<dd>{METRIC_BLURB.edps}</dd>
								<dt>Weather · Friendship · Mega aura</dt>
								<dd>
									Damage multipliers on your attackers. Incoming damage always uses one fixed constant, so the boss’s
									own moves never change these numbers.
								</dd>
								<dt>Boss tier</dt>
								<dd>
									Sets the boss HP (used by eDPS) and the CPM applied to its defence. Inferred from the boss — change it
									for Elite Raids.
								</dd>
							</dl>
						</details>
					</div>
				)}
			</div>

			<div className='r-ctr-toggles'>
				<button
					type='button'
					className='r-ctr-toggle'
					data-on={mega ? '' : undefined}
					onClick={() => setMega((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					Include Megas
				</button>
				<button
					type='button'
					className='r-ctr-toggle'
					data-on={shadow ? '' : undefined}
					onClick={() => setShadow((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					Include Shadows
				</button>
			</div>

			{raidLoading && list.length === 0 ? (
				<div className='r-loading' style={{ minHeight: '20dvh' }}>
					<div className='r-spinner' />
				</div>
			) : (
				<div className='r-ctr-list'>
					{list.length === 0 && <p className='r-muted'>No counters match those filters.</p>}
					{list.map((e, i) => {
						const p = gamemasterPokemon[e.speciesId];
						if (!p) return null;
						const goToPokemon = () => void navigate(link(e.speciesId));
						return (
							<div
								key={e.speciesId}
								className='r-ctr-row r-ctr-row--raid'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
								role='link'
								tabIndex={0}
								onClick={goToPokemon}
								onKeyDown={(ev) => {
									if (ev.key === 'Enter' || ev.key === ' ') {
										ev.preventDefault();
										goToPokemon();
									}
								}}
							>
								<span className='r-ctr-rank'>{i + 1}</span>
								<span className='r-ctr-art'>
									{p.isShadow && <ShadowMark />}
									<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
								</span>
								<div className='r-ctr-mid'>
									<span className='r-ctr-name'>{cleanName(p.speciesName)}</span>
									<span className='r-ctr-moves'>
										<Link to={R.move(e.fastMove)} onClick={(ev) => ev.stopPropagation()}>
											{moveName(e.fastMove)}
										</Link>
										<i>+</i>
										<Link to={R.move(e.chargedMove)} onClick={(ev) => ev.stopPropagation()}>
											{moveName(e.chargedMove)}
										</Link>
									</span>
								</div>
								<span className='r-ctr-score'>
									{metric === 'tdo' ? Math.round(e.tdo).toLocaleString() : e[metric].toFixed(1)}
									<i>{METRIC_SORTS.find((o) => o.key === metric)?.label}</i>
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default CountersTab;
