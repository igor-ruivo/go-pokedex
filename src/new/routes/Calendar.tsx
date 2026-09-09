import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';

import { GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IEntry, IPostEntry, IRocketGrunt } from '../../DTOs/INews';
import { type ILeekduckSpecialRaidBoss, useCalendar } from '../../queries/calendar';
import { usePokemon } from '../../queries/pokemon';
import { PokeMini } from '../components/PokeMini';
import { dateRange, dayRange, eventPhase, relativeDays } from '../lib/format';
import { CALENDAR_TABS, type CalendarTab, R } from '../lib/nav';

const TAB_LABEL: Record<CalendarTab, string> = {
	events: 'Events',
	bosses: 'Raids',
	spawns: 'Spawns',
	rockets: 'Rockets',
	eggs: 'Eggs',
};

const BIOMES: ReadonlyArray<readonly [string, string]> = [
	['0', 'Cities'],
	['1', 'Forests'],
	['2', 'Mountains'],
	['3', 'Beaches & Water'],
	['4', 'Northern Hemisphere'],
	['5', 'Southern Hemisphere'],
];

const EGG_TIERS: ReadonlyArray<readonly [string, string]> = [
	['2', '2 km'],
	['5', '5 km'],
	['7', '7 km'],
	['10', '10 km'],
	['12', '12 km'],
];

const RAID_TIERS: ReadonlyArray<{ label: string; match: (k?: string) => boolean }> = [
	{ label: 'Mega & 5★ Raids', match: (k) => k === '5' || k === 'mega' },
	{ label: 'Tier 3 Raids', match: (k) => k === '3' },
	{ label: 'Tier 1 Raids', match: (k) => k === '1' },
];

const isActive = (p: { startDate: number; endDate: number }, now: number) => now >= p.startDate && now < p.endDate;

/** Merge a list of dated posts into day-range buckets, deduping their entries. */
const groupByRange = (
	posts: Array<IPostEntry>,
	pick: (p: IPostEntry) => Array<IEntry>
): Array<{ label: string; entries: Array<IEntry> }> => {
	const map = new Map<string, { label: string; entries: Array<IEntry>; seen: Set<string> }>();
	for (const p of posts) {
		const label = dayRange(p.startDate, p.endDate);
		let g = map.get(label);
		if (!g) {
			g = { label, entries: [], seen: new Set() };
			map.set(label, g);
		}
		for (const e of pick(p)) {
			const k = `${e.speciesId}-${e.kind ?? ''}`;
			if (g.seen.has(k)) continue;
			g.seen.add(k);
			g.entries.push(e);
		}
	}
	return [...map.values()].map(({ label, entries }) => ({ label, entries }));
};

const timeLeft = (end: number, now: number): string => {
	const ms = end - now;
	if (ms <= 0) return '';
	const h = Math.floor(ms / 3_600_000);
	if (h < 1) return '<1h';
	if (h < 48) return `${h}h left`;
	return `${Math.round(h / 24)}d left`;
};

/** Leekduck special-boss windows behave like tiny raid-only events. */
const specialToPost = (s: ILeekduckSpecialRaidBoss): IPostEntry => ({
	id: s.rawUrl,
	url: s.rawUrl,
	title: s.title,
	subtitle: s.title,
	startDate: s.date,
	endDate: s.dateEnd,
	dateRanges: [{ start: s.date, end: s.dateEnd }],
	imageUrl: '',
	wild: [],
	raids: s.raids,
	eggs: [],
	researches: [],
	incenses: [],
	lures: [],
	bonuses: Object.keys(GameLanguage).reduce(
		(acc, k) => {
			acc[k as keyof typeof GameLanguage] = [];
			return acc;
		},
		{} as Record<GameLanguage, Array<string>>
	),
});

/* ---------- shared bits ---------- */
const MiniGrid = ({ entries, endMap }: { entries: Array<IEntry>; endMap?: Map<string, number> | undefined }) => {
	const now = Date.now();
	return (
		<div className='r-minigrid'>
			{entries.map((e, i) => {
				const end = endMap?.get(e.speciesId);
				return (
					<PokeMini
						key={`${e.speciesId}-${e.kind ?? ''}-${i}`}
						speciesId={e.speciesId}
						shiny={e.shiny}
						note={end ? timeLeft(end, now) : undefined}
					/>
				);
			})}
		</div>
	);
};

const Group = ({
	title,
	entries,
	endMap,
	darker,
}: {
	title: string;
	entries: Array<IEntry>;
	endMap?: Map<string, number> | undefined;
	darker?: boolean | undefined;
}) =>
	entries.length ? (
		<>
			<div className='r-section-h' data-darker={darker ? '' : undefined}>
				{title}
			</div>
			<MiniGrid entries={entries} endMap={endMap} />
		</>
	) : null;

const Spinner = () => (
	<div className='r-loading' style={{ minHeight: '30dvh' }}>
		<div className='r-spinner' />
	</div>
);

/** Timeframe switcher for the raid / spawn tabs. */
const DatePicker = ({
	slots,
	active,
	onPick,
}: {
	slots: Array<{ key: string; label: string }>;
	active: string;
	onPick: (k: string) => void;
}) => (
	<div className='r-datepick'>
		<span className='r-datepick-ic' aria-hidden='true'>
			📅
		</span>
		<div className='r-datepick-chips' role='tablist' aria-label='Timeframe'>
			{slots.map((s) => (
				<button
					key={s.key}
					type='button'
					role='tab'
					aria-selected={active === s.key}
					data-active={active === s.key}
					onClick={() => onPick(s.key)}
				>
					{s.label}
				</button>
			))}
		</div>
	</div>
);

/* ---------- Events ---------- */
const EventCard = ({
	post,
	open,
	onToggle,
	preferSubtitle,
	isSeason,
}: {
	post: IPostEntry;
	open: boolean;
	onToggle: () => void;
	preferSubtitle: boolean;
	isSeason: boolean;
}) => {
	const { currentGameLanguage: gl } = useLanguage();
	const phase = eventPhase(post.startDate, post.endDate);
	const title = (preferSubtitle ? post.subtitle[gl] || post.title[gl] : post.title[gl] || post.subtitle[gl]) || 'Event';
	const bonuses = post.bonuses[gl] ?? [];
	return (
		<div className='r-event' data-open={open}>
			<button type='button' className='r-event-head' onClick={onToggle}>
				{post.imageUrl && !post.isSpotlight && <img src={post.imageUrl} alt='' loading='lazy' />}
				<div>
					<b>{title}</b>
					<span>{dateRange(post.startDate, post.endDate)}</span>
				</div>
				{isSeason ? (
					<i className='r-phase' data-phase='season'>
						Season
					</i>
				) : (
					<i className='r-phase' data-phase={phase}>
						{phase === 'live' ? 'Live' : phase === 'soon' ? relativeDays(post.startDate) : 'Ended'}
					</i>
				)}
			</button>
			{open && (
				<div className='r-event-body'>
					{bonuses.length > 0 && (
						<>
							<div className='r-section-h'>Bonuses</div>
							<ul className='r-bonuses'>
								{bonuses.filter(Boolean).map((b, i) => (
									<li key={i}>{b}</li>
								))}
							</ul>
						</>
					)}
					<Group title='Featured spawns' entries={post.wild} />
					<Group title='Featured raids' entries={post.raids} />
					<Group title='Research encounters' entries={post.researches} />
					<Group title='Eggs' entries={post.eggs} />
					<Group title='Incense' entries={post.incenses} />
					<Group title='Lures' entries={post.lures} />
					{post.url && (
						<a
							className='r-ext-link'
							href={post.url}
							target='_blank'
							rel='noopener noreferrer'
							onClick={(e) => e.stopPropagation()}
						>
							Read the full announcement
							<span aria-hidden='true'>↗</span>
						</a>
					)}
				</div>
			)}
		</div>
	);
};

const EventsTab = () => {
	const { posts, season, postsFetchCompleted, seasonFetchCompleted } = useCalendar();
	const [openId, setOpenId] = useState<string | null>(null);
	const { currentGameLanguage: gl } = useLanguage();

	const list = useMemo(() => {
		const now = Date.now();
		const events = (postsFetchCompleted ? posts : [])
			.filter((p) => p && p.endDate >= now)
			.sort((a, b) => a.startDate - b.startDate);
		return seasonFetchCompleted && season ? [season, ...events] : events;
	}, [posts, season, postsFetchCompleted, seasonFetchCompleted]);

	const dupeTitles = useMemo(() => {
		const seen = new Map<string, number>();
		for (const p of list) seen.set(p.title[gl], (seen.get(p.title[gl]) ?? 0) + 1);
		return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
	}, [list, gl]);

	if (!postsFetchCompleted) return <Spinner />;
	if (list.length === 0) return <p className='r-muted'>No events right now.</p>;

	const seasonId = seasonFetchCompleted && season ? season.id : null;
	return (
		<div className='r-eventlist'>
			{list.map((p) => (
				<EventCard
					key={p.id}
					post={p}
					isSeason={p.id === seasonId}
					open={p.id === openId}
					onToggle={() => setOpenId(p.id === openId ? null : p.id)}
					preferSubtitle={dupeTitles.has(p.title[gl]) && !!p.subtitle[gl]}
				/>
			))}
		</div>
	);
};

/* ---------- Raids ---------- */
const RaidsTab = () => {
	const {
		posts,
		specialBosses,
		currentBosses,
		postsFetchCompleted,
		specialBossesFetchCompleted,
		currentBossesFetchCompleted,
	} = useCalendar();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const [sel, setSel] = useState('current');

	const ready = postsFetchCompleted && specialBossesFetchCompleted && currentBossesFetchCompleted && fetchCompleted;

	const { current, upcoming, endMap } = useMemo(() => {
		const endMap = new Map<string, number>();
		if (!ready) return { current: [] as Array<IEntry>, upcoming: [] as Array<IPostEntry>, endMap };
		const now = Date.now();

		const raidPosts: Array<IPostEntry> = [
			...posts.filter((p) => p && (p.raids?.length ?? 0) > 0),
			...specialBosses.map(specialToPost),
		].filter((p) => p.endDate >= now);

		const seen = new Set<string>();
		const current: Array<IEntry> = [];
		for (const e of currentBosses) {
			if (seen.has(e.speciesId)) continue;
			seen.add(e.speciesId);
			current.push(e);
		}
		for (const p of raidPosts) {
			if (!isActive(p, now)) continue;
			for (const r of p.raids) {
				const prev = endMap.get(r.speciesId);
				if (prev === undefined || p.endDate < prev) endMap.set(r.speciesId, p.endDate);
				if (seen.has(r.speciesId)) continue;
				seen.add(r.speciesId);
				current.push(r);
			}
		}

		// only windows that have NOT started yet get their own date tab; a live
		// window's bosses are already merged into "Now" (with their countdown).
		const upcoming = raidPosts.filter((p) => p.startDate > now).sort((a, b) => a.startDate - b.startDate);
		return { current, upcoming, endMap };
	}, [ready, posts, specialBosses, currentBosses]);

	if (!ready) return <Spinner />;

	const shadow = (id: string) => !!gamemasterPokemon[id]?.isShadow;
	const upcomingGroups = groupByRange(upcoming, (p) => p.raids);

	const slots: Array<{ key: string; label: string; entries: Array<IEntry> }> = [
		{ key: 'current', label: 'Now', entries: current },
		...upcomingGroups.map((g) => ({ key: g.label, label: g.label, entries: g.entries })),
	];
	const activeSlot = slots.find((s) => s.key === sel) ?? slots[0];
	const activeEntries = activeSlot?.entries ?? [];
	const showEnd = activeSlot?.key === 'current';

	return (
		<>
			<DatePicker slots={slots} active={activeSlot?.key ?? 'current'} onPick={setSel} />

			{activeEntries.length === 0 ? (
				<p className='r-muted' style={{ marginTop: 'var(--s4)' }}>
					Nothing scheduled.
				</p>
			) : (
				<>
					{RAID_TIERS.map((t) => (
						<Group
							key={t.label}
							title={t.label}
							entries={activeEntries.filter((e) => t.match(e.kind) && !shadow(e.speciesId))}
							endMap={showEnd ? endMap : undefined}
						/>
					))}
					{RAID_TIERS.map((t) => (
						<Group
							key={`${t.label}-shadow`}
							title={`Shadow · ${t.label.replace(' Raids', '')}`}
							entries={activeEntries.filter((e) => t.match(e.kind) && shadow(e.speciesId))}
							endMap={showEnd ? endMap : undefined}
							darker
						/>
					))}
					{activeEntries.filter((e) => !RAID_TIERS.some((t) => t.match(e.kind))).length > 0 && (
						<Group
							title='Other raids'
							entries={activeEntries.filter((e) => !RAID_TIERS.some((t) => t.match(e.kind)))}
						/>
					)}
				</>
			)}
		</>
	);
};

/* ---------- Spawns ---------- */
const SpawnsTab = () => {
	const { season, posts, seasonFetchCompleted, postsFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const [sel, setSel] = useState('');

	if (!seasonFetchCompleted || !postsFetchCompleted || !fetchCompleted) return <Spinner />;

	const now = Date.now();
	const withWild = (posts ?? [])
		.filter((p) => p && (p.wild?.length ?? 0) > 0 && p.endDate >= now)
		.sort((a, b) => a.startDate - b.startDate);

	// spawns from events happening right this moment, merged & deduped
	const nowSeen = new Set<string>();
	const nowSpawns: Array<IEntry> = [];
	for (const p of withWild) {
		if (!isActive(p, now)) continue;
		for (const e of p.wild) {
			const k = `${e.speciesId}-${e.kind ?? ''}`;
			if (nowSeen.has(k)) continue;
			nowSeen.add(k);
			nowSpawns.push(e);
		}
	}

	// only not-yet-started events get their own date tab; live ones are in "Now"
	const eventGroups = groupByRange(
		withWild.filter((p) => p.startDate > now),
		(p) => p.wild
	);
	const known = new Set(BIOMES.map(([k]) => k));
	const wild = season?.wild ?? [];

	const slots: Array<{ key: string; label: string }> = [
		...(nowSpawns.length > 0 ? [{ key: 'now', label: 'Now' }] : []),
		{ key: 'season', label: 'Season' },
		...eventGroups.map((g) => ({ key: g.label, label: g.label })),
	];
	const fallback = nowSpawns.length > 0 ? 'now' : 'season';
	const activeKey = slots.some((s) => s.key === sel) ? sel : fallback;

	return (
		<>
			<DatePicker slots={slots} active={activeKey} onPick={setSel} />

			{activeKey === 'now' ? (
				<div style={{ marginTop: 'var(--s4)' }}>
					<MiniGrid entries={nowSpawns} />
				</div>
			) : activeKey === 'season' ? (
				wild.length === 0 ? (
					<p className='r-muted' style={{ marginTop: 'var(--s4)' }}>
						No seasonal spawn data.
					</p>
				) : (
					<>
						{BIOMES.map(([k, label]) => (
							<Group key={k} title={label} entries={wild.filter((e) => e.kind === k)} />
						))}
						<Group title='All areas' entries={wild.filter((e) => !known.has(e.kind ?? ''))} />
					</>
				)
			) : (
				<div style={{ marginTop: 'var(--s4)' }}>
					<MiniGrid entries={eventGroups.find((g) => g.label === activeKey)?.entries ?? []} />
				</div>
			)}
		</>
	);
};

/* ---------- Rockets ---------- */
const npcAvatar = (trainerId: string): string => {
	if (trainerId.includes('Sierra')) return '/images/NPC/sierra.webp';
	if (trainerId.includes('Cliff')) return '/images/NPC/cliff.webp';
	if (trainerId.includes('Giovanni')) return '/images/NPC/giovanni.webp';
	if (trainerId.includes('Arlo')) return '/images/NPC/arlo.webp';
	if (trainerId.includes('Female')) return '/images/NPC/female-grunt.png';
	return '/images/NPC/male-grunt.webp';
};

const prettyTrainer = (id: string) =>
	id
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim();

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RocketGrunt = ({ g, open, onToggle }: { g: IRocketGrunt; open: boolean; onToggle: () => void }) => {
	const { currentGameLanguage: gl } = useLanguage();
	const t = g.type?.toLowerCase();
	const isNamed = !t && /Sierra|Cliff|Giovanni|Arlo/.test(g.trainerId);
	const avatar = t ? `/images/types/${t}.png` : npcAvatar(g.trainerId);
	const tiers = [g.tier1, g.tier2, g.tier3];
	const firstCatch = [...g.catchableTiers].sort((a, b) => a - b)[0];
	const reward = firstCatch != null ? (tiers[firstCatch] ?? []) : [];
	const title = g.type ? `${cap(g.type)} Grunt` : isNamed ? prettyTrainer(g.trainerId) : 'Grunt';

	// toggle from anywhere on the card, but never when a Pokémon link was clicked
	const toggle = (e: ReactMouseEvent | ReactKeyboardEvent) => {
		if ((e.target as HTMLElement).closest('a')) return;
		onToggle();
	};

	return (
		<div
			className='r-event r-grunt'
			data-open={open}
			role='button'
			tabIndex={0}
			aria-expanded={open}
			aria-label={title}
			onClick={toggle}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggle(e);
				}
			}}
			style={t ? { ['--tc' as string]: `var(--t-${t})` } : undefined}
		>
			<div className='r-event-head r-grunt-head'>
				<img className='r-grunt-av' data-portrait={t ? undefined : ''} src={avatar} alt='' loading='lazy' />
				<span className='r-grunt-id'>
					<b>{title}</b>
					<i>{g.phrase[gl] || '—'}</i>
				</span>
			</div>

			{!open && firstCatch != null && reward.length > 0 && (
				<div className='r-grunt-peek'>
					<u>Slot {firstCatch + 1} reward</u>
					<div className='r-minigrid'>
						{reward.map((id, j) => (
							<PokeMini key={`${id}-${j}`} speciesId={id} forceShadow />
						))}
					</div>
				</div>
			)}

			{open && (
				<div className='r-event-body'>
					{tiers.map((tier, i) =>
						tier.length ? (
							<div key={i} className='r-rocket-tier'>
								<u>
									Slot {i + 1}
									{g.catchableTiers.includes(i) && <span className='r-catch-tag'>catchable</span>}
								</u>
								<div className='r-minigrid'>
									{tier.map((id, j) => (
										<PokeMini key={`${id}-${j}`} speciesId={id} forceShadow catchable={g.catchableTiers.includes(i)} />
									))}
								</div>
							</div>
						) : null
					)}
				</div>
			)}
		</div>
	);
};

const RocketsTab = () => {
	const { currentRockets, currentRocketsFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const [openId, setOpenId] = useState<string | null>(null);

	if (!currentRocketsFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentRockets.length === 0) return <p className='r-muted'>No Rocket line-ups.</p>;

	return (
		<div className='r-eventlist'>
			{currentRockets.map((g) => (
				<RocketGrunt
					key={g.trainerId}
					g={g}
					open={openId === g.trainerId}
					onToggle={() => setOpenId((p) => (p === g.trainerId ? null : g.trainerId))}
				/>
			))}
		</div>
	);
};

/* ---------- Eggs ---------- */
const EggsTab = () => {
	const { currentEggs, currentEggsFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const { currentGameLanguage: gl } = useLanguage();

	if (!currentEggsFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentEggs.length === 0) return <p className='r-muted'>No egg pool data.</p>;

	return (
		<div className='r-egglist'>
			{EGG_TIERS.map(([k, label]) => {
				const all = currentEggs.filter((e) => e.kind === k);
				if (all.length === 0) return null;
				const plain = all.filter((e) => !e.comment?.[gl]);
				const groups = new Map<string, Array<IEntry>>();
				for (const e of all) {
					const c = e.comment?.[gl];
					if (!c) continue;
					if (!groups.has(c)) groups.set(c, []);
					groups.get(c)!.push(e);
				}
				return (
					<section key={k} className='r-eggsec'>
						<div className='r-eggsec-head'>
							<img src={`/images/eggs/${k}km.png`} alt='' loading='lazy' />
							<b>{label}</b>
						</div>
						{plain.length > 0 && <MiniGrid entries={plain} />}
						{[...groups.entries()].map(([c, list]) => (
							<div key={c}>
								<div className='r-section-h'>{c}</div>
								<MiniGrid entries={list} />
							</div>
						))}
					</section>
				);
			})}
		</div>
	);
};

/* ---------- shell ---------- */
const Calendar = () => {
	const { tab } = useParams();
	const active: CalendarTab = (CALENDAR_TABS as ReadonlyArray<string>).includes(tab ?? '')
		? (tab as CalendarTab)
		: 'events';

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>Calendar</h1>
			<nav className='r-tabs r-tabs--cal'>
				{CALENDAR_TABS.map((t) => (
					<NavLink
						key={t}
						to={R.calendar(t)}
						aria-current={t === active ? 'page' : undefined}
						className={({ isActive }) => (isActive ? 'is-active' : '')}
					>
						{TAB_LABEL[t]}
					</NavLink>
				))}
			</nav>

			<div style={{ marginTop: 16 }}>
				{active === 'events' && <EventsTab />}
				{active === 'bosses' && <RaidsTab />}
				{active === 'spawns' && <SpawnsTab />}
				{active === 'rockets' && <RocketsTab />}
				{active === 'eggs' && <EggsTab />}
			</div>
		</div>
	);
};

export default Calendar;
