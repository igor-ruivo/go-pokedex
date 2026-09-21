import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir } from '../../components/SortBar';
import { handleSpriteError, spriteUrl } from '../../components/Sprite';
import { useBestBuddy } from '../../contexts/best-buddy-context';
import { useImageSource } from '../../contexts/imageSource-context';
import { useLanguage } from '../../contexts/language-context';
import { useRaidMetric } from '../../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName, sentenceCase } from '../../lib/format';
import { R } from '../../lib/nav';
import { fmtRaidMetric, RAID_METRIC_BLURB, RAID_METRIC_SORTS, type RaidMetric } from '../../lib/raid-metric';
import { TYPE_KEYS, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../../utils/GameTranslator';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import {
	guessRaidTier,
	MEGA_LEVEL_PLUS_MULTIPLIER,
	type MegaLevel,
	RAID_BOSS_STATS,
	type RaidTier,
} from '../../utils/pokemon-helper';
import { getComputeWorker } from '../../workers/compute-client';

const LG_SLUG = ['great', 'ultra', 'master', 'raid'] as const;
const PVP_TOP = 5;
const RAID_TOP = 10;

const TIER_ORDER: Array<RaidTier> = ['T1', 'T3', 'MEGA', 'T5', 'ELITE', 'LEGENDARY_MEGA', 'PRIMAL', 'SUPER_MEGA'];
/** PokeMiners raid-egg icon per tier (with its own extension), in
 *  /public/images/raids. Legendary Mega Raid reuses Mega's own icon — there's
 *  no distinct official art for it. */
const TIER_ICON: Record<RaidTier, string> = {
	T1: 'tier-1.png',
	T3: 'tier-3.png',
	MEGA: 'mega.png',
	T5: 'tier-5.png',
	ELITE: 'elite.png',
	LEGENDARY_MEGA: 'mega.png',
	PRIMAL: 'primal.png',
	SUPER_MEGA: 'super-mega.webp',
};

/** Weather → the attacker move types it boosts ×1.2, and its official icon
 *  file. `key`/`icon`/`types` are stable identifiers (matched against saved
 *  settings, filenames) — only `label` is display text, translated inside
 *  the component below. */
const WEATHER_META: Array<{ key: string; icon: string; types: Array<string> }> = [
	{ key: '', icon: '', types: [] },
	{ key: 'sunny', icon: 'sunny', types: ['grass', 'ground', 'fire'] },
	{ key: 'rain', icon: 'rainy', types: ['water', 'electric', 'bug'] },
	{ key: 'partlycloudy', icon: 'partly-cloudy', types: ['normal', 'rock'] },
	{ key: 'cloudy', icon: 'cloudy', types: ['fairy', 'fighting', 'poison'] },
	{ key: 'windy', icon: 'windy', types: ['dragon', 'flying', 'psychic'] },
	{ key: 'snow', icon: 'snow', types: ['ice', 'steel'] },
	{ key: 'fog', icon: 'fog', types: ['dark', 'ghost'] },
];

/** Raid damage bonus by friendship level — Best Friend was previously coded
 *  as ×1.11; corrected to the real ×1.10 (10%) while adding Forever Friend
 *  here, per Bulbapedia/community sources (Niantic's own help center
 *  confirms Forever Friend gives an additional boost beyond Best Friend,
 *  without publishing the exact figure itself). */
const FRIENDSHIP_MULT = [1, 1.03, 1.05, 1.07, 1.1, 1.12] as const;

const PARTY_SIZES = [1, 2, 3, 4];

/** Base/High/Max/Super Max — see `MEGA_LEVEL_PLUS_MULTIPLIER`'s own doc
 *  comment for the sourcing. Defaults to Max (3), matching dex-server's own
 *  precomputed rankings, so this tab agrees with the pre-computed type lists
 *  unless the player explicitly changes it here. */
const MEGA_LEVEL_ORDER: ReadonlyArray<MegaLevel> = [1, 2, 3, 4];

const CountersTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { t } = useTranslation(['pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const LEAGUE_FULL = [
		gameTranslator(GameTranslatorKeys.GreatLeagueLong, gl),
		gameTranslator(GameTranslatorKeys.UltraLeagueLong, gl),
		gameTranslator(GameTranslatorKeys.MasterLeagueLong, gl),
		gameTranslator(GameTranslatorKeys.RaidDisplay, gl),
	];
	const megaWord = gameTranslator(GameTranslatorKeys.MegaDisplay, gl);
	const TIER_LABEL: Record<RaidTier, string> = {
		T1: t('pokemonDetail:counters.tierLabel.t1'),
		T3: t('pokemonDetail:counters.tierLabel.t3'),
		MEGA: megaWord,
		T5: t('pokemonDetail:counters.tierLabel.t5'),
		ELITE: gameTranslator(GameTranslatorKeys.EliteRaidTier, gl),
		LEGENDARY_MEGA: t('pokemonDetail:counters.tierLabel.legendaryMega', {
			legendary: gameTranslator(GameTranslatorKeys.LegendaryDisplay, gl),
			mega: megaWord,
		}),
		PRIMAL: sentenceCase(gameTranslator(GameTranslatorKeys.PrimalDisplay, gl)),
		SUPER_MEGA: t('pokemonDetail:counters.tierLabel.superMega'),
	};
	// Weather/Friendship/Mega Level track the player's in-game language where
	// a data-mined source exists. "None"/"Forever"/"Super Max" have no
	// data-mined equivalent (Forever Friend and Super Mega are recent
	// additions PokeMiners hasn't dumped yet) — those three stay on the
	// website's own i18next translation rather than guessing.
	const WEATHER = [
		{ ...WEATHER_META[0], label: t('pokemonDetail:counters.weather.none') },
		{
			...WEATHER_META[1],
			label: `${gameTranslator(GameTranslatorKeys.WeatherSunny, gl)} / ${gameTranslator(GameTranslatorKeys.WeatherClear, gl)}`,
		},
		{ ...WEATHER_META[2], label: gameTranslator(GameTranslatorKeys.WeatherRainy, gl) },
		{ ...WEATHER_META[3], label: gameTranslator(GameTranslatorKeys.WeatherPartlyCloudy, gl) },
		{ ...WEATHER_META[4], label: gameTranslator(GameTranslatorKeys.WeatherCloudy, gl) },
		{ ...WEATHER_META[5], label: gameTranslator(GameTranslatorKeys.WeatherWindy, gl) },
		{ ...WEATHER_META[6], label: gameTranslator(GameTranslatorKeys.WeatherSnow, gl) },
		{ ...WEATHER_META[7], label: gameTranslator(GameTranslatorKeys.WeatherFog, gl) },
	];
	const FRIENDSHIP: Array<{ label: string; mult: number }> = [
		{ label: t('pokemonDetail:counters.friendship.none'), mult: FRIENDSHIP_MULT[0] },
		{ label: gameTranslator(GameTranslatorKeys.FriendshipGood, gl), mult: FRIENDSHIP_MULT[1] },
		{ label: gameTranslator(GameTranslatorKeys.FriendshipGreat, gl), mult: FRIENDSHIP_MULT[2] },
		{ label: gameTranslator(GameTranslatorKeys.FriendshipUltra, gl), mult: FRIENDSHIP_MULT[3] },
		{ label: gameTranslator(GameTranslatorKeys.FriendshipBest, gl), mult: FRIENDSHIP_MULT[4] },
		{ label: t('pokemonDetail:counters.friendship.forever'), mult: FRIENDSHIP_MULT[5] },
	];
	const MEGA_LEVELS: Array<{ level: MegaLevel; label: string }> = [
		{ level: MEGA_LEVEL_ORDER[0], label: gameTranslator(GameTranslatorKeys.MegaLevelBase, gl) },
		{ level: MEGA_LEVEL_ORDER[1], label: gameTranslator(GameTranslatorKeys.MegaLevelHigh, gl) },
		{ level: MEGA_LEVEL_ORDER[2], label: gameTranslator(GameTranslatorKeys.MegaLevelMax, gl) },
		{ level: MEGA_LEVEL_ORDER[3], label: t('pokemonDetail:counters.megaLevel.superMax') },
	];
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { moves, movesFetchCompleted } = useMoves();
	const { imageSource } = useImageSource();

	const isRaid = league === 3;

	const [mega, setMega] = useState(() => readPersistentValue(ConfigKeys.Mega) !== 'false');
	const [shadow, setShadow] = useState(() => readPersistentValue(ConfigKeys.Shadow) !== 'false');
	useEffect(() => void writePersistentValue(ConfigKeys.Mega, String(mega)), [mega]);
	useEffect(() => void writePersistentValue(ConfigKeys.Shadow, String(shadow)), [shadow]);

	// Raid battle-condition knobs. Weather/party/friendship/mega-aura are device
	// settings (you tend to fight under the same conditions every time) — boss
	// tier isn't, since it's inferred fresh per-boss below.
	const [cfgOpen, setCfgOpen] = useState(false);
	// which figure to rank by is a device-wide setting shared with Rankings and
	// Settings, not local to this tab.
	const { raidMetric: metric, updateRaidMetric: setMetric } = useRaidMetric();
	const { maxLevel } = useBestBuddy();
	const [metricDir, setMetricDir] = useState<SortDir>('desc');
	const [weatherKey, setWeatherKey] = useState(() => readPersistentValue(ConfigKeys.RaidWeather) ?? '');
	const [partySize, setPartySize] = useState(() => Number(readPersistentValue(ConfigKeys.RaidPartySize)) || 1);
	const [friendship, setFriendship] = useState(() => Number(readPersistentValue(ConfigKeys.RaidFriendship)) || 1);
	const [megaBoostType, setMegaBoostType] = useState(() => readPersistentValue(ConfigKeys.RaidMegaBoostType) ?? '');
	const [megaLevel, setMegaLevel] = useState<MegaLevel>(() => {
		const raw = Number(readPersistentValue(ConfigKeys.RaidMegaLevel));
		return raw === 1 || raw === 2 || raw === 3 || raw === 4 ? raw : 3;
	});
	useEffect(() => void writePersistentValue(ConfigKeys.RaidWeather, weatherKey), [weatherKey]);
	useEffect(() => void writePersistentValue(ConfigKeys.RaidPartySize, String(partySize)), [partySize]);
	useEffect(() => void writePersistentValue(ConfigKeys.RaidFriendship, String(friendship)), [friendship]);
	useEffect(() => void writePersistentValue(ConfigKeys.RaidMegaBoostType, megaBoostType), [megaBoostType]);
	useEffect(() => void writePersistentValue(ConfigKeys.RaidMegaLevel, String(megaLevel)), [megaLevel]);
	// Starts on the inferred tier for this boss; re-syncs when you open another one.
	// (not persisted — the boss tier is a property of the raid you're looking at)
	const [tier, setTier] = useState<RaidTier>(() => guessRaidTier(pokemon));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => setTier(guessRaidTier(pokemon)), [pokemon.speciesId]);

	const weatherTypes = WEATHER.find((w) => w.key === weatherKey)?.types ?? [];
	const inferredTier = guessRaidTier(pokemon);

	const cfgDirty =
		weatherKey !== '' ||
		partySize !== 1 ||
		friendship !== 1 ||
		megaBoostType !== '' ||
		megaLevel !== 3 ||
		tier !== inferredTier;

	const clearConfig = () => {
		setWeatherKey('');
		setPartySize(1);
		setFriendship(1);
		setMegaBoostType('');
		setMegaLevel(3);
		setTier(inferredTier);
	};

	const activeSummary = [
		t('pokemonDetail:counters.summaryRaidHp', {
			tier: TIER_LABEL[tier],
			hp: RAID_BOSS_STATS[tier].hp.toLocaleString(),
			raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl),
		}),
		weatherKey && WEATHER.find((w) => w.key === weatherKey)?.label,
		partySize > 1 && t('pokemonDetail:counters.partyOf', { size: partySize }),
		friendship > 1 &&
			t('pokemonDetail:counters.friendLabel', { label: FRIENDSHIP.find((f) => f.mult === friendship)?.label }),
		megaBoostType &&
			t('pokemonDetail:counters.megaAuraSummary', {
				type: gameTypeDisplayTranslator(megaBoostType, gl) || megaBoostType,
				mega: megaWord,
			}),
		megaLevel !== 3 &&
			t('pokemonDetail:counters.megaLevelSummary', {
				label: MEGA_LEVELS.find((m) => m.level === megaLevel)?.label,
				mega: megaWord,
			}),
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
		queryKey: [
			'raid-counters',
			pokemon.speciesId,
			weatherKey,
			partySize,
			friendship,
			megaBoostType,
			megaLevel,
			tier,
			maxLevel,
		],
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
					megaLevel,
					tier,
				},
				maxLevel,
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
							{t('pokemonDetail:counters.notRankedInLeague', {
								name: cleanName(pokemon.speciesName),
								league: LEAGUE_FULL[league],
							})}
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
					{list.length === 0 && <p className='r-muted'>{t('pokemonDetail:counters.noData')}</p>}
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
									<img
										src={spriteUrl(p, imageSource)}
										alt=''
										loading='lazy'
										decoding='async'
										onError={handleSpriteError(p)}
									/>
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
				{section(
					t('pokemonDetail:counters.strongAgainst', { name, league: LEAGUE_FULL[league] }),
					ranked.matchups.slice(0, PVP_TOP)
				)}
				{section(
					t('pokemonDetail:counters.weakAgainst', { name, league: LEAGUE_FULL[league] }),
					ranked.counters.slice(0, PVP_TOP)
				)}
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
			<div className='r-section-h'>
				{t('pokemonDetail:counters.bestRaidCounters', {
					name: cleanName(pokemon.speciesName),
					raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl),
				})}
			</div>

			<div className='r-ctr-metricbar'>
				<SortBar
					options={RAID_METRIC_SORTS}
					sortKey={metric}
					dir={metricDir}
					onChange={(k, d) => {
						setMetric(k as RaidMetric);
						setMetricDir(d);
					}}
				/>
				<p className='r-ctr-blurb'>{RAID_METRIC_BLURB[metric]}</p>
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
							{cfgOpen ? t('pokemonDetail:counters.configHide') : t('pokemonDetail:counters.configEdit')}
						</span>
					</button>
					{cfgDirty && (
						<button type='button' className='r-ctr-config-clear' onClick={clearConfig}>
							{t('pokemonDetail:counters.clear')}
						</button>
					)}
				</div>

				{cfgOpen && (
					<div className='r-ctr-panel'>
						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.bossTier')}</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-iconrow'>
									{TIER_ORDER.map((tierKey) => (
										<button
											key={tierKey}
											type='button'
											className='r-ctr-iconbtn'
											title={t('pokemonDetail:counters.bossTierTitle', {
												tier: TIER_LABEL[tierKey],
												hp: RAID_BOSS_STATS[tierKey].hp.toLocaleString(),
											})}
											aria-label={t('pokemonDetail:counters.bossTierAriaLabel', {
												tier: TIER_LABEL[tierKey],
												raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl),
											})}
											data-active={tier === tierKey}
											onClick={() => setTier(tierKey)}
										>
											<img src={`/images/raids/${TIER_ICON[tierKey]}`} alt='' loading='lazy' />
										</button>
									))}
								</div>
								<span className='r-ctr-cond-hint'>
									{t('pokemonDetail:counters.bossTierHint', {
										tier: TIER_LABEL[tier],
										hp: RAID_BOSS_STATS[tier].hp.toLocaleString(),
										raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl),
									})}
								</span>
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.weather_field')}</span>
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
										{t('pokemonDetail:counters.weatherHint', {
											types: weatherTypes.map((tk) => gameTypeDisplayTranslator(tk, gl) || tk).join(', '),
										})}
									</span>
								)}
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.megaAura', { mega: megaWord })}</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-iconrow'>
									<button
										type='button'
										className='r-ctr-iconbtn'
										title={t('pokemonDetail:counters.noMegaOnTeam', { mega: megaWord })}
										aria-label={t('pokemonDetail:counters.noMegaOnTeam', { mega: megaWord })}
										data-active={!megaBoostType}
										onClick={() => setMegaBoostType('')}
									>
										<span className='r-ctr-none'>—</span>
									</button>
									{TYPE_KEYS.map((tk) => (
										<button
											key={tk}
											type='button'
											className='r-ctr-iconbtn'
											title={t('pokemonDetail:counters.megaOfType', {
												type: gameTypeDisplayTranslator(tk, gl) || tk,
												mega: megaWord,
											})}
											aria-label={t('pokemonDetail:counters.megaOfType', {
												type: gameTypeDisplayTranslator(tk, gl) || tk,
												mega: megaWord,
											})}
											data-active={megaBoostType === tk}
											onClick={() => setMegaBoostType(megaBoostType === tk ? '' : tk)}
										>
											<img src={`/images/types/${tk}.png`} alt='' loading='lazy' />
										</button>
									))}
								</div>
								{megaBoostType && (
									<span className='r-ctr-cond-hint'>
										{t('pokemonDetail:counters.megaAuraHint', {
											type: gameTypeDisplayTranslator(megaBoostType, gl) || megaBoostType,
										})}
									</span>
								)}
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.megaLevelField', { mega: megaWord })}</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-seg'>
									{MEGA_LEVELS.map((m) => (
										<button
											key={m.level}
											type='button'
											data-active={megaLevel === m.level}
											onClick={() => setMegaLevel(m.level)}
										>
											{m.label}
										</button>
									))}
								</div>
								<span className='r-ctr-cond-hint'>
									{t('pokemonDetail:counters.megaLevelHint', {
										mult: MEGA_LEVEL_PLUS_MULTIPLIER[megaLevel].toFixed(1),
										mega: megaWord,
										primal: sentenceCase(gameTranslator(GameTranslatorKeys.PrimalDisplay, gl)),
									})}
									{megaLevel === 4 && t('pokemonDetail:counters.megaLevelHintExtra')}
								</span>
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.partyPower')}</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-seg'>
									{PARTY_SIZES.map((n) => (
										<button key={n} type='button' data-active={partySize === n} onClick={() => setPartySize(n)}>
											{n === 1 ? t('pokemonDetail:counters.solo') : n}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className='r-ctr-cond'>
							<span className='r-ctr-cond-l'>{t('pokemonDetail:counters.friendshipField')}</span>
							<div className='r-ctr-cond-c'>
								<div className='r-ctr-seg r-ctr-seg--scroll'>
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
								{friendship > 1 && (
									<span className='r-ctr-cond-hint'>
										{t('pokemonDetail:counters.friendshipHint', { mult: friendship.toFixed(2) })}
									</span>
								)}
							</div>
						</div>

						<details className='r-ctr-help'>
							<summary>{t('pokemonDetail:counters.helpSummary')}</summary>
							<dl>
								<dt>DPS</dt>
								<dd>{RAID_METRIC_BLURB.dps}</dd>
								<dt>TDO</dt>
								<dd>{RAID_METRIC_BLURB.tdo}</dd>
								<dt>{t('pokemonDetail:counters.help.weatherFriendshipMegaAura', { mega: megaWord })}</dt>
								<dd>{t('pokemonDetail:counters.help.weatherFriendshipMegaAuraDesc')}</dd>
								<dt>{t('pokemonDetail:counters.megaLevelField', { mega: megaWord })}</dt>
								<dd>
									{t('pokemonDetail:counters.help.megaLevelDesc', {
										mega: megaWord,
										primal: sentenceCase(gameTranslator(GameTranslatorKeys.PrimalDisplay, gl)),
										megaEnergy: gameTranslator(GameTranslatorKeys.MegaEnergyDisplay, gl),
									})}
								</dd>
								<dt>{t('pokemonDetail:counters.bossTier')}</dt>
								<dd>{t('pokemonDetail:counters.help.bossTierDesc')}</dd>
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
					{t('pokemonDetail:counters.includeMegas', { mega: megaWord })}
				</button>
				<button
					type='button'
					className='r-ctr-toggle'
					data-on={shadow ? '' : undefined}
					onClick={() => setShadow((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					{t('pokemonDetail:counters.includeShadows', { shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl) })}
				</button>
			</div>

			{raidLoading && list.length === 0 ? (
				<div className='r-loading' style={{ minHeight: '20dvh' }}>
					<div className='r-spinner' />
				</div>
			) : (
				<div className='r-ctr-list'>
					{list.length === 0 && <p className='r-muted'>{t('pokemonDetail:counters.noCountersMatch')}</p>}
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
									<img
										src={spriteUrl(p, imageSource)}
										alt=''
										loading='lazy'
										decoding='async'
										onError={handleSpriteError(p)}
									/>
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
									{fmtRaidMetric(e[metric], metric)}
									<i>{RAID_METRIC_SORTS.find((o) => o.key === metric)?.label}</i>
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
