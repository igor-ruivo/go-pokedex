import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';

import { PokeMini } from '../components/PokeMini';
import { handleSpriteError, spriteUrl } from '../components/Sprite';
import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useSeenEvents } from '../contexts/seen-events-context';
import type { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import { useLiveNow } from '../hooks/useLiveNow';
import i18n from '../i18n';
import { everyLanguage, spotlightToPost } from '../lib/calendar-events';
import {
	dateRange,
	dayRange,
	eventPhase,
	formatEventDateTime,
	nowAsEventTime,
	sentenceCase,
} from '../lib/format';
import { CALENDAR_TABS, type CalendarTab, R } from '../lib/nav';
import { sortByCalendarRelevance, useRelevanceSets } from '../lib/relevance';
import { type ILeekduckSpecialRaidBoss, useCalendar } from '../queries/calendar';
import { usePokemon } from '../queries/pokemon';
import { useGameTranslationsData } from '../utils/game-translations-store';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';

/** Raid-egg icon key (/public/images/raids) and tier-matcher per raid tier —
 *  labels are looked up from the `calendar:raids.tiers.<key>` i18n keys at
 *  render time (see RaidsTab), not stored here, so this stays a plain literal
 *  key rather than a template-interpolated t() call the parity checker
 *  (scripts/check-i18n-parity.mjs) couldn't statically verify. */
const RAID_TIERS: ReadonlyArray<{ key: 'higher' | 'tier3' | 'tier1'; egg: string; match: (k?: string) => boolean }> = [
	{ key: 'higher', egg: 'tier-5', match: (k) => k === '5' || k === 'mega' },
	{ key: 'tier3', egg: 'tier-3', match: (k) => k === '3' },
	{ key: 'tier1', egg: 'tier-1', match: (k) => k === '1' },
];

// Distance labels ("2 km" etc.) aren't translated — "km" reads identically in
// every locale this site supports, so there's no UI-chrome string here worth
// routing through i18n.
const EGG_TIERS: ReadonlyArray<readonly [string, string]> = [
	['2', '2 km'],
	['5', '5 km'],
	['7', '7 km'],
	['10', '10 km'],
	['12', '12 km'],
];

const isActive = (p: { startDate: number; endDate: number }, now: number) => now >= p.startDate && now < p.endDate;

/** Merge a list of dated posts into day-range buckets, deduping their entries. */
const groupByRange = (
	posts: Array<IPostEntry>,
	pick: (p: IPostEntry) => Array<IEntry>,
	locale: string
): Array<{ label: string; entries: Array<IEntry> }> => {
	const map = new Map<string, { entries: Array<IEntry>; seen: Set<string>; minStart: number; maxEnd: number }>();
	for (const p of posts) {
		const label = dayRange(p.startDate, p.endDate, locale);
		let g = map.get(label);
		if (!g) {
			g = { entries: [], seen: new Set(), minStart: p.startDate, maxEnd: p.endDate };
			map.set(label, g);
		} else {
			g.minStart = Math.min(g.minStart, p.startDate);
			g.maxEnd = Math.max(g.maxEnd, p.endDate);
		}
		for (const e of pick(p)) {
			const k = `${e.speciesId}-${e.kind ?? ''}`;
			if (g.seen.has(k)) continue;
			g.seen.add(k);
			g.entries.push(e);
		}
	}
	// A bucket's own grouping key only ever collapses posts that land on the
	// exact same single calendar day (dayRange falls back to a "day1 – day2"
	// string otherwise, which never merges with anything) — safe then to
	// upgrade the displayed label to a full start/end time range, same as
	// Events already show (`dateRange` itself still falls back to day-only
	// for anything spanning more than one day).
	return [...map.values()].map(({ entries, minStart, maxEnd }) => ({
		label: dayRange(minStart, maxEnd, locale).includes('–')
			? dayRange(minStart, maxEnd, locale)
			: dateRange(minStart, maxEnd, locale),
		entries,
	}));
};

const timeLeft = (end: number, now: number): string => {
	const ms = end - now;
	if (ms <= 0) return '';
	const h = Math.floor(ms / 3_600_000);
	if (h >= 48) return i18n.t('calendar:timeLeft.days', { count: Math.round(h / 24) });
	if (h >= 1) return i18n.t('calendar:timeLeft.hours', { count: h });
	const m = Math.floor(ms / 60_000);
	if (m >= 1) return i18n.t('calendar:timeLeft.minutes', { count: m });
	const s = Math.floor(ms / 1000);
	return i18n.t('calendar:timeLeft.seconds', { count: s });
};

/** Countdown until an event starts — same wall-clock scheme as `timeLeft`,
 *  but for the start boundary and with "in …" / tomorrow / today wording. */
const startsIn = (start: number, now: number): string => {
	const ms = start - now;
	const d = Math.round(ms / 86_400_000);
	if (d >= 2) return i18n.t('calendar:events.startsIn.days', { count: d });
	if (d === 1) return i18n.t('calendar:events.startsIn.tomorrow');
	if (ms <= 0) return i18n.t('calendar:events.startsIn.today');
	const h = Math.floor(ms / 3_600_000);
	if (h >= 1) return i18n.t('calendar:events.startsIn.hours', { count: h });
	const m = Math.floor(ms / 60_000);
	if (m >= 1) return i18n.t('calendar:events.startsIn.minutes', { count: m });
	const s = Math.floor(ms / 1000);
	return i18n.t('calendar:events.startsIn.seconds', { count: s });
};

/** Leekduck special-boss windows behave like tiny raid-only events. */
const specialToPost = (s: ILeekduckSpecialRaidBoss): IPostEntry => ({
	id: s.rawUrl,
	url: everyLanguage(s.rawUrl),
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
	// `Object.values`, not `Object.keys` — GameLanguage's member *names*
	// don't all match their runtime string *values* (see spotlightToPost's
	// own note); harmless here since every value is just `[]` regardless of
	// which key name it lands on, but keyed consistently with the real
	// `GameLanguage` values all the same.
	bonuses: Object.values(GameLanguage).reduce(
		(acc, key) => {
			acc[key] = [];
			return acc;
		},
		{} as Record<GameLanguage, Array<string>>
	),
});

/* ---------- shared bits ---------- */
/** Small inline placeholder for a single grid still waiting on relevance
 *  data — not the page-level `Spinner` (60dvh is far too tall for a single
 *  section) and not just skipping straight to `sorted`'s fallback (family-
 *  line) order, which is exactly what caused the chips to render once, then
 *  visibly jump into their real (relevance) order a split second later. */
const MiniGridLoading = () => (
	<div className='r-minigrid-loading'>
		<div className='r-spinner r-spinner--sm' />
	</div>
);

const MiniGrid = ({ entries, endMap }: { entries: Array<IEntry>; endMap?: Map<string, number> | undefined }) => {
	// `endMap` values come from the same local-time-encoded event feed
	// everything else on this page does — see nowAsEventTime()'s doc comment.
	// Ticking (not a one-off `nowAsEventTime()` read) so the "Xh/Xm/Xs left"
	// note keeps counting down live while the tab stays open, all the way
	// down through minutes and seconds as the deadline approaches.
	const now = useLiveNow();
	const { gamemasterPokemon } = usePokemon();
	const sets = useRelevanceSets();
	// Ending soonest first (when `endMap` gives it a countdown at all), then
	// most relevant (most league/raid dots), family-line order as the final
	// tiebreak — see `sortByCalendarRelevance`'s own doc comment for the exact
	// priority chain. Re-sorts every tick so a chip about to expire visibly
	// climbs to the front as its own countdown counts down.
	const sorted = useMemo(
		() =>
			sortByCalendarRelevance(
				entries,
				(e) => e.speciesId,
				gamemasterPokemon,
				sets,
				endMap
					? (e) => {
							const end = endMap.get(e.speciesId);
							return end !== undefined ? end - now : undefined;
						}
					: undefined
			),
		[entries, gamemasterPokemon, sets, endMap, now]
	);

	// Only "current" raid/spawn grids pass an `endMap` at all (see RaidsTab/
	// SpawnsTab) — once any of THIS grid's own countdowns hits zero, the
	// underlying "current" bucket it came from is stale (computed from a
	// single non-live `nowAsEventTime()` snapshot, unlike this chip's own
	// live `now`), and surgically dropping just this one chip risks a subtler
	// bug than the one it fixes: the tab's own bucketing/date-tab boundaries,
	// "nothing scheduled" empty state, and any entry that should have just
	// rotated in from "upcoming" would all need to be recomputed in lockstep.
	// A full reload re-derives everything from fresh data instead — simple,
	// and guaranteed consistent. Guarded so a render tick that still sees the
	// same expiry (before navigation actually happens) can't call it twice.
	const reloadTriggeredRef = useRef(false);
	useEffect(() => {
		if (reloadTriggeredRef.current || !endMap) return;
		const expired = sorted.some((e) => {
			const end = endMap.get(e.speciesId);
			return end !== undefined && end - now <= 0;
		});
		if (expired) {
			reloadTriggeredRef.current = true;
			window.location.reload();
		}
	}, [now, sorted, endMap]);

	// `sets.ready` lags behind this tab's own `xFetchCompleted` gate (it's a
	// completely separate data source — PvP/raid rankings, not the Calendar
	// feed) — without waiting on it too, this grid renders once in the
	// meaningless fallback (family-line) order, then reorders into the real
	// relevance order the instant that data lands.
	if (!sets.ready) return <MiniGridLoading />;
	return (
		<div className='r-minigrid'>
			{sorted.map((e, i) => {
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
	egg,
}: {
	title: string;
	entries: Array<IEntry>;
	endMap?: Map<string, number> | undefined;
	darker?: boolean | undefined;
	/** Raid-egg icon key in /public/images/raids (raid groups only). */
	egg?: string | undefined;
}) =>
	entries.length ? (
		<>
			{egg ? (
				<div className='r-eggsec-head' data-darker={darker ? '' : undefined}>
					<img src={`/images/raids/${egg}.png`} alt='' loading='lazy' />
					<b>{title}</b>
				</div>
			) : (
				<div className='r-section-h' data-darker={darker ? '' : undefined}>
					{title}
				</div>
			)}
			<MiniGrid entries={entries} endMap={endMap} />
		</>
	) : null;

const Spinner = () => (
	<div className='r-loading' style={{ minHeight: '30dvh' }}>
		<div className='r-spinner' />
	</div>
);

/**
 * Timeframe switcher for the raid / spawn tabs — with 10-15+ dated slots
 * (each showing its own start/end time, so genuinely wide), the row scrolls
 * horizontally rather than wrapping onto multiple lines and eating vertical
 * space. Touch already scrolls it fine via swipe; a mouse-only desktop
 * visitor has no such gesture (and the scrollbar itself is deliberately
 * hidden — see `.r-datepick-chips`), so this adds the two things a
 * professional site would for that case: a plain vertical wheel scrolls the
 * row horizontally while hovering it, and a pair of chevron buttons (shown
 * only on a fine, hover-capable pointer, and only on the side that actually
 * has more to reveal) do the same a click at a time.
 */
const DatePicker = ({
	slots,
	active,
	onPick,
}: {
	slots: Array<{ key: string; label: string }>;
	active: string;
	onPick: (k: string) => void;
}) => {
	const { t } = useTranslation(['calendar']);
	const activeBtnRef = useRef<HTMLButtonElement | null>(null);
	const chipsRef = useRef<HTMLDivElement | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = chipsRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
	}, []);

	useEffect(() => {
		activeBtnRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
	}, [active]);

	useEffect(() => {
		const el = chipsRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener('scroll', updateScrollState, { passive: true });
		// React's onWheel is passive — preventDefault() is ignored and the page
		// scrolls anyway. Native { passive: false } is required to hijack a
		// vertical wheel into horizontal chip scrolling on desktop.
		const onWheel = (e: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll — let the page scroll normally
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad horizontal — don't fight it
			e.preventDefault();
			el.scrollBy({ left: e.deltaY });
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		const ro = new ResizeObserver(updateScrollState);
		ro.observe(el);
		return () => {
			el.removeEventListener('scroll', updateScrollState);
			el.removeEventListener('wheel', onWheel);
			ro.disconnect();
		};
	}, [slots, updateScrollState]);

	const scrollByPage = (dir: 1 | -1) => {
		const el = chipsRef.current;
		el?.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
	};

	return (
		<div className='r-datepick'>
			<span className='r-datepick-ic' aria-hidden='true'>
				📅
			</span>
			<div
				className='r-datepick-scroller'
				data-fade-left={canScrollLeft || undefined}
				data-fade-right={canScrollRight || undefined}
			>
				{canScrollLeft && (
					<button
						type='button'
						className='r-datepick-arrow r-datepick-arrow--left'
						aria-label={t('calendar:datePicker.scrollEarlier')}
						onClick={() => scrollByPage(-1)}
					>
						‹
					</button>
				)}
				<div
					className='r-datepick-chips'
					role='tablist'
					aria-label={t('calendar:datePicker.timeframeAriaLabel')}
					ref={chipsRef}
				>
					{slots.map((s) => (
						<button
							key={s.key}
							ref={active === s.key ? activeBtnRef : undefined}
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
				{canScrollRight && (
					<button
						type='button'
						className='r-datepick-arrow r-datepick-arrow--right'
						aria-label={t('calendar:datePicker.scrollLater')}
						onClick={() => scrollByPage(1)}
					>
						›
					</button>
				)}
			</div>
		</div>
	);
};

/* ---------- Events ---------- */
const EventCard = ({
	post,
	open,
	onToggle,
	preferSubtitle,
	isSeason,
	unseen,
}: {
	post: IPostEntry;
	open: boolean;
	onToggle: () => void;
	preferSubtitle: boolean;
	isSeason: boolean;
	/** Never expanded on this device — see the Calendar nav badge, same idea
	 *  and same colour, just per-row instead of a total count. */
	unseen: boolean;
}) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { imageSource } = useImageSource();
	// Ticking so a same-day "in Xh/Xm/Xs" countdown (see `startsIn`) counts
	// down live and flips this card straight to "Live" the instant it starts,
	// instead of sitting on a static "today" until some unrelated re-render.
	const now = useLiveNow();
	const phase = eventPhase(post.startDate, post.endDate, now);
	const title =
		(preferSubtitle ? post.subtitle[gl] || post.title[gl] : post.title[gl] || post.subtitle[gl]) ||
		t('calendar:events.fallbackTitle');
	const bonuses = post.bonuses[gl] ?? [];
	const spotlightMons = post.wild;
	// The GO/shiny sprite assets carry a lot of built-in transparent padding
	// (unlike the official artwork), so they render visibly smaller than the
	// official ones at the same box size — scaled up to compensate (see the
	// `[data-go]` rule; the layout box itself is untouched, so this is
	// allowed to overlap neighbours slightly rather than staying starved).
	const isGoLike = imageSource !== ImageSource.Official;
	return (
		<div className='r-event' data-open={open}>
			<button type='button' className='r-event-head' onClick={onToggle}>
				{post.isSpotlight ? (
					<span className='r-event-spotlight'>
						{post.imageUrl && <img className='r-event-spotlight-bg' src={post.imageUrl} alt='' loading='lazy' />}
						<span
							className='r-event-spotlight-sprites'
							data-count={Math.min(spotlightMons.length, 4)}
							data-go={isGoLike || undefined}
						>
							{spotlightMons.map((e, i) => {
								const p = gamemasterPokemon[e.speciesId];
								if (!p) return null;
								// Only the 3-in-a-row layout overlaps (see the `data-count='3'`
								// CSS) — first mon stacked on top, each one after sinking
								// behind the last.
								const style = spotlightMons.length === 3 ? { zIndex: spotlightMons.length - i } : undefined;
								return (
									<img
										key={e.speciesId}
										src={spriteUrl(p, imageSource)}
										alt=''
										loading='lazy'
										style={style}
										onError={handleSpriteError(p)}
									/>
								);
							})}
						</span>
					</span>
				) : (
					post.imageUrl && <img src={post.imageUrl} alt='' loading='lazy' />
				)}
				<div>
					<b>
						{unseen && <i className='r-event-new' aria-label={t('calendar:events.unseenAriaLabel')} />}
						{title}
					</b>
					<span>{dateRange(post.startDate, post.endDate, currentLanguage)}</span>
				</div>
				{isSeason ? (
					<i className='r-phase' data-phase='season'>
						{t('calendar:events.phase.season')}
					</i>
				) : (
					<i className='r-phase' data-phase={phase}>
						{phase === 'live'
							? t('calendar:events.phase.live')
							: phase === 'soon'
								? startsIn(post.startDate, now)
								: t('calendar:events.phase.ended')}
					</i>
				)}
			</button>
			{open && (
				<div className='r-event-body'>
					{!isSeason && (
						<p className='r-event-when'>
							{t('calendar:events.startEndLine', {
								start: formatEventDateTime(post.startDate, currentLanguage),
								end: formatEventDateTime(post.endDate, currentLanguage),
							})}
						</p>
					)}
					{bonuses.length > 0 && (
						<>
							<div className='r-section-h'>{t('calendar:events.bonuses')}</div>
							<ul className='r-bonuses'>
								{bonuses.filter(Boolean).map((b, i) => (
									<li key={i}>{b}</li>
								))}
							</ul>
						</>
					)}
					<Group title={t('calendar:events.groups.featuredSpawns')} entries={post.wild} />
					<Group
						title={t('calendar:events.groups.featuredRaids', {
							raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
						})}
						entries={post.raids}
					/>
					<Group title={t('calendar:events.groups.researchEncounters')} entries={post.researches} />
					<Group title={t('calendar:events.groups.eggs')} entries={post.eggs} />
					<Group title={t('calendar:events.groups.incense')} entries={post.incenses} />
					<Group title={t('calendar:events.groups.lures')} entries={post.lures} />
					{(post.url[gl] || post.url[GameLanguage.en]) && (
						<a
							className='r-ext-link'
							href={post.url[gl] || post.url[GameLanguage.en]}
							target='_blank'
							rel='noopener noreferrer'
							onClick={(e) => e.stopPropagation()}
						>
							{t('calendar:events.readAnnouncement')}
							<span aria-hidden='true'>↗</span>
						</a>
					)}
				</div>
			)}
		</div>
	);
};

const EventsTab = () => {
	const { t } = useTranslation(['calendar']);
	const { posts, season, spotlightHours, postsFetchCompleted, seasonFetchCompleted, spotlightHoursFetchCompleted } =
		useCalendar();
	const [openId, setOpenId] = useState<string | null>(null);
	const { currentGameLanguage: gl } = useLanguage();
	const { seenIds, markSeen } = useSeenEvents();

	const ready = postsFetchCompleted && spotlightHoursFetchCompleted;

	const list = useMemo(() => {
		// Not a raw `Date.now()` — see nowAsEventTime()'s own doc comment.
		// Getting this wrong is exactly what made events linger an hour past
		// their real (local-time) end before disappearing.
		const now = nowAsEventTime();
		// Spotlight Hours fold straight into the same Events feed — the
		// pre-revamp site did the same (a Spotlight Hour is just a very short
		// event), rather than giving them their own section.
		const allPosts = ready ? [...posts, ...spotlightHours.map(spotlightToPost)] : [];
		// Same-day starts (the common case — most events go live at the same
		// local hour) tie-break by shorter overall duration first, then
		// alphabetically — never by exact start instant, or two events
		// announced the same day in a different order each import would keep
		// reshuffling for no visible reason.
		const dayOf = (time: number) => Math.floor(time / 86_400_000);
		const events = allPosts
			.filter((p) => p && p.endDate >= now)
			.sort((a, b) => {
				const dayDiff = dayOf(a.startDate) - dayOf(b.startDate);
				if (dayDiff !== 0) return dayDiff;
				const durationDiff = a.endDate - a.startDate - (b.endDate - b.startDate);
				if (durationDiff !== 0) return durationDiff;
				return a.title[gl].localeCompare(b.title[gl]);
			});
		return seasonFetchCompleted && season ? [season, ...events] : events;
	}, [posts, spotlightHours, ready, season, seasonFetchCompleted, gl]);

	const dupeTitles = useMemo(() => {
		const seen = new Map<string, number>();
		for (const p of list) seen.set(p.title[gl], (seen.get(p.title[gl]) ?? 0) + 1);
		return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
	}, [list, gl]);

	if (!ready) return <Spinner />;
	if (list.length === 0) return <p className='r-muted'>{t('calendar:events.noEvents')}</p>;

	const seasonId = seasonFetchCompleted && season ? season.id : null;
	return (
		<>
			<div className='r-section-h'>{t('calendar:events.scheduledCount', { count: list.length.toLocaleString() })}</div>
			<div className='r-eventlist'>
				{list.map((p) => (
					<EventCard
						key={p.id}
						post={p}
						isSeason={p.id === seasonId}
						unseen={!seenIds.has(p.id)}
						open={p.id === openId}
						onToggle={() => {
							const opening = p.id !== openId;
							setOpenId(opening ? p.id : null);
							// Only marking it seen on *open* (not close) — that's the
							// action that actually means "you looked at this one".
							if (opening) markSeen(p.id);
						}}
						preferSubtitle={dupeTitles.has(p.title[gl]) && !!p.subtitle[gl]}
					/>
				))}
			</div>
		</>
	);
};

/* ---------- Raids ---------- */
const RaidsTab = () => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
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
		// `raidPosts` below is the same local-time-encoded event feed as the
		// Events tab (any post with raids listed) — see nowAsEventTime().
		const now = nowAsEventTime();

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
	const upcomingGroups = groupByRange(upcoming, (p) => p.raids, currentLanguage);

	// Literal t() calls per tier — not a dynamic template key — so
	// scripts/check-i18n-parity.mjs can statically verify every one. "raid"
	// itself always comes from GameTranslator, never website i18n — see
	// RaidDisplay's other call sites.
	const raidWord = sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl));
	const tierLabels: Record<(typeof RAID_TIERS)[number]['key'], { full: string; short: string }> = {
		higher: {
			full: t('calendar:raids.tiers.higher.full', { raid: raidWord }),
			short: t('calendar:raids.tiers.higher.short'),
		},
		tier3: {
			full: t('calendar:raids.tiers.tier3.full', { raid: raidWord }),
			short: t('calendar:raids.tiers.tier3.short'),
		},
		tier1: {
			full: t('calendar:raids.tiers.tier1.full', { raid: raidWord }),
			short: t('calendar:raids.tiers.tier1.short'),
		},
	};

	const slots: Array<{ key: string; label: string; entries: Array<IEntry> }> = [
		{ key: 'current', label: t('calendar:raids.nowSlot'), entries: current },
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
					{t('calendar:raids.nothingScheduled')}
				</p>
			) : (
				<>
					{RAID_TIERS.map((tier) => (
						<Group
							key={tier.key}
							title={tierLabels[tier.key].full}
							egg={tier.egg}
							entries={activeEntries.filter((e) => tier.match(e.kind) && !shadow(e.speciesId))}
							endMap={showEnd ? endMap : undefined}
						/>
					))}
					{RAID_TIERS.map((tier) => (
						<Group
							key={`${tier.key}-shadow`}
							title={t('calendar:raids.shadowPrefix', {
								tier: tierLabels[tier.key].short,
								shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
							})}
							egg={tier.egg}
							entries={activeEntries.filter((e) => tier.match(e.kind) && shadow(e.speciesId))}
							endMap={showEnd ? endMap : undefined}
							darker
						/>
					))}
					{activeEntries.filter((e) => !RAID_TIERS.some((tier) => tier.match(e.kind))).length > 0 && (
						<Group
							title={t('calendar:raids.otherRaids', { raid: raidWord })}
							entries={activeEntries.filter((e) => !RAID_TIERS.some((tier) => tier.match(e.kind)))}
						/>
					)}
				</>
			)}
		</>
	);
};

/* ---------- Spawns ---------- */
const SpawnsTab = () => {
	const { t } = useTranslation(['calendar']);
	const { currentLanguage } = useLanguage();
	const { season, posts, spotlightHours, seasonFetchCompleted, postsFetchCompleted, spotlightHoursFetchCompleted } =
		useCalendar();
	const { fetchCompleted } = usePokemon();
	const [sel, setSel] = useState('');

	// Literal t() calls, not the dynamic BIOMES module-level keys — see
	// RaidsTab's tierLabels for why (the parity checker needs a static key).
	const BIOMES: ReadonlyArray<readonly [string, string]> = [
		['0', t('calendar:biomes.cities')],
		['1', t('calendar:biomes.forests')],
		['2', t('calendar:biomes.mountains')],
		['3', t('calendar:biomes.beaches')],
		['4', t('calendar:biomes.northernHemisphere')],
		['5', t('calendar:biomes.southernHemisphere')],
	];

	if (!seasonFetchCompleted || !postsFetchCompleted || !spotlightHoursFetchCompleted || !fetchCompleted) {
		return <Spinner />;
	}

	// Same local-time-encoded event feed as the Events tab — see nowAsEventTime().
	const now = nowAsEventTime();
	// A Spotlight Hour's featured Pokémon are a "current spawn" too, for the
	// same duration — same synthetic post as the Events tab (see
	// spotlightToPost), so it costs nothing beyond scanning it alongside
	// everything else here that already carries a `wild` list.
	const withWild = [...posts, ...spotlightHours.map(spotlightToPost)]
		.filter((p) => p && (p.wild?.length ?? 0) > 0 && p.endDate >= now)
		.sort((a, b) => a.startDate - b.startDate);

	// spawns from events happening right this moment, merged & deduped
	const nowSeen = new Set<string>();
	const nowSpawns: Array<IEntry> = [];
	const endMap = new Map<string, number>();
	for (const p of withWild) {
		if (!isActive(p, now)) continue;
		for (const e of p.wild) {
			const prev = endMap.get(e.speciesId);
			if (prev === undefined || p.endDate < prev) endMap.set(e.speciesId, p.endDate);
			const k = `${e.speciesId}-${e.kind ?? ''}`;
			if (nowSeen.has(k)) continue;
			nowSeen.add(k);
			nowSpawns.push(e);
		}
	}

	// only not-yet-started events get their own date tab; live ones are in "Now"
	const eventGroups = groupByRange(
		withWild.filter((p) => p.startDate > now),
		(p) => p.wild,
		currentLanguage
	);
	const known = new Set(BIOMES.map(([k]) => k));
	const wild = season?.wild ?? [];

	const slots: Array<{ key: string; label: string }> = [
		...(nowSpawns.length > 0 ? [{ key: 'now', label: t('calendar:spawns.nowSlot') }] : []),
		{ key: 'season', label: t('calendar:spawns.seasonSlot') },
		...eventGroups.map((g) => ({ key: g.label, label: g.label })),
	];
	const fallback = nowSpawns.length > 0 ? 'now' : 'season';
	const activeKey = slots.some((s) => s.key === sel) ? sel : fallback;

	return (
		<>
			<DatePicker slots={slots} active={activeKey} onPick={setSel} />

			{activeKey === 'now' ? (
				<div style={{ marginTop: 'var(--s4)' }}>
					<MiniGrid entries={nowSpawns} endMap={endMap} />
				</div>
			) : activeKey === 'season' ? (
				wild.length === 0 ? (
					<p className='r-muted' style={{ marginTop: 'var(--s4)' }}>
						{t('calendar:spawns.noSeasonalData')}
					</p>
				) : (
					<>
						{BIOMES.map(([k, label]) => (
							<Group key={k} title={label} entries={wild.filter((e) => e.kind === k)} />
						))}
						<Group title={t('calendar:biomes.allAreas')} entries={wild.filter((e) => !known.has(e.kind ?? ''))} />
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

// Maps a `trainerId` substring to the matching NPC's own GameTranslator key —
// each value is already the full display name per locale (e.g. "Leader
// Sierra"/"Boss Sierra"), not just the bare first name.
const NAMED_TRAINER_KEYS: ReadonlyArray<[string, GameTranslatorKeys]> = [
	['Sierra', GameTranslatorKeys.SierraDisplay],
	['Cliff', GameTranslatorKeys.CliffDisplay],
	['Giovanni', GameTranslatorKeys.GiovanniDisplay],
	['Arlo', GameTranslatorKeys.ArloDisplay],
];

// How to combine a type name with "Grunt" into a title, e.g. "Water Grunt" vs
// "Recruta de Água" — both `type` and `grunt` are themselves already sourced
// from GameTranslator, so which one leads (and any connecting word) has to
// be picked by GAME language (`gl`), not by website UI locale/i18next: a
// player can run the site in English while their in-game language is
// Portuguese, and then it's the Portuguese word order that has to apply to
// these Portuguese words, regardless of what language the rest of the page
// is in. A plain t() call keyed by website locale would silently reach for
// the wrong language's word order whenever the two differ.
const GRUNT_TITLE_ORDER: Record<GameLanguage, (type: string, grunt: string) => string> = {
	[GameLanguage.en]: (type, grunt) => `${type} ${grunt}`,
	[GameLanguage.de]: (type, grunt) => `${type}-${grunt}`,
	[GameLanguage.es]: (type, grunt) => `${grunt} de tipo ${type}`,
	[GameLanguage.esMx]: (type, grunt) => `${grunt} de tipo ${type}`,
	[GameLanguage.fr]: (type, grunt) => `${grunt} ${type}`,
	[GameLanguage.hi]: (type, grunt) => `${type} ${grunt}`,
	[GameLanguage.id]: (type, grunt) => `${grunt} ${type}`,
	[GameLanguage.it]: (type, grunt) => `${grunt} ${type}`,
	[GameLanguage.ja]: (type, grunt) => `${type}タイプの${grunt}`,
	[GameLanguage.ko]: (type, grunt) => `${type} 타입 로켓단 ${grunt}`,
	[GameLanguage.ptbr]: (type, grunt) => `${grunt} de ${type}`,
	[GameLanguage.ru]: (type, grunt) => `${grunt} (${type})`,
	[GameLanguage.th]: (type, grunt) => `${grunt}ธาตุ${type}`,
	[GameLanguage.tr]: (type, grunt) => `${type} ${grunt}`,
	[GameLanguage.zhHant]: (type, grunt) => `${type} 系${grunt}`,
};

const RocketGrunt = ({ g, open, onToggle }: { g: IRocketGrunt; open: boolean; onToggle: () => void }) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const sets = useRelevanceSets();
	const typeKey = g.type?.toLowerCase();
	const namedTrainerKey = !typeKey ? NAMED_TRAINER_KEYS.find(([needle]) => g.trainerId.includes(needle)) : undefined;
	const avatar = typeKey ? `/images/types/${typeKey}.png` : npcAvatar(g.trainerId);
	// Most relevant first (most league/raid dots), family-line order as tiebreak —
	// same rule the Calendar's other Pokémon chip grids use (see `MiniGrid`).
	// Memoized for the same reason `MiniGrid` memoizes its own sort: each call
	// walks every listed species' whole evolution family (`leagueBadgesFor` →
	// `fetchReachablePokemonIncludingSelf`) — unmemoized and called 3× per
	// grunt, across the ten-plus grunts this tab typically renders, that's
	// what made this page noticeably slower to load than every other Calendar
	// tab, and re-ran on every grunt for every single open/close toggle.
	const tiers = useMemo(() => {
		const sortIds = (ids: Array<string>) => sortByCalendarRelevance(ids, (id) => id, gamemasterPokemon, sets);
		return [sortIds(g.tier1), sortIds(g.tier2), sortIds(g.tier3)];
	}, [g, gamemasterPokemon, sets]);
	const firstCatch = [...g.catchableTiers].sort((a, b) => a - b)[0];
	const reward = firstCatch != null ? (tiers[firstCatch] ?? []) : [];
	const title = g.type
		? GRUNT_TITLE_ORDER[gl](
				gameTypeDisplayTranslator(typeKey ?? '', gl) || g.type,
				gameTranslator(GameTranslatorKeys.GruntDisplay, gl)
			)
		: namedTrainerKey
			? gameTranslator(namedTrainerKey[1], gl)
			: gameTranslator(GameTranslatorKeys.GruntDisplay, gl);

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
			style={typeKey ? { ['--tc' as string]: `var(--t-${typeKey})` } : undefined}
		>
			<div className='r-event-head r-grunt-head'>
				<img className='r-grunt-av' data-portrait={typeKey ? undefined : ''} src={avatar} alt='' loading='lazy' />
				<span className='r-grunt-id'>
					<b>{title}</b>
					<i>{g.phrase[gl] || '—'}</i>
				</span>
			</div>

			{!open && firstCatch != null && reward.length > 0 && (
				<div className='r-grunt-peek'>
					<u>{t('calendar:rockets.slotReward', { slot: firstCatch + 1 })}</u>
					{sets.ready ? (
						<div className='r-minigrid'>
							{reward.map((id, j) => (
								<PokeMini key={`${id}-${j}`} speciesId={id} forceShadow />
							))}
						</div>
					) : (
						<MiniGridLoading />
					)}
				</div>
			)}

			{open && (
				<div className='r-event-body'>
					{sets.ready ? (
						tiers.map((tier, i) =>
							tier.length ? (
								<div key={i} className='r-rocket-tier'>
									<u>
										{t('calendar:rockets.slotHeader', { slot: i + 1 })}
										{g.catchableTiers.includes(i) && (
											<span className='r-catch-tag'>{t('calendar:rockets.catchableTag')}</span>
										)}
									</u>
									<div className='r-minigrid'>
										{tier.map((id, j) => (
											<PokeMini
												key={`${id}-${j}`}
												speciesId={id}
												forceShadow
												catchable={g.catchableTiers.includes(i)}
											/>
										))}
									</div>
								</div>
							) : null
						)
					) : (
						<MiniGridLoading />
					)}
				</div>
			)}
		</div>
	);
};

const RocketsTab = () => {
	const { t } = useTranslation(['calendar']);
	const { currentRockets, currentRocketsFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const [openId, setOpenId] = useState<string | null>(null);

	if (!currentRocketsFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentRockets.length === 0) return <p className='r-muted'>{t('calendar:rockets.noLineups')}</p>;

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
	const { t } = useTranslation(['calendar']);
	const { currentEggs, currentEggsFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const { currentGameLanguage: gl } = useLanguage();

	if (!currentEggsFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentEggs.length === 0) return <p className='r-muted'>{t('calendar:eggs.noPoolData')}</p>;

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
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { tab } = useParams();
	// `Shell` already kicks off/subscribes to this same fetch, and normally
	// its re-render cascades down through the router `<Outlet/>` to this
	// component too — but this tab bar's own label going blank until some
	// unrelated navigation forces a re-render (reported: the Raids/Reide tab
	// disappearing on a hard refresh, only showing up again after clicking
	// it) means that cascade isn't reliable enough on its own. Subscribing
	// here directly guarantees this component re-renders the instant the
	// fetch resolves, independent of whatever's happening upstream.
	useGameTranslationsData();
	const active: CalendarTab = (CALENDAR_TABS as ReadonlyArray<string>).includes(tab ?? '')
		? (tab as CalendarTab)
		: 'events';

	// Literal t() calls, not a Record built from a dynamic key — see
	// RaidsTab's tierLabels for why. "bosses" is the Raids tab — its label
	// tracks the player's in-game language like every other GameTranslator
	// use, not the website UI's.
	const TAB_LABEL: Record<CalendarTab, string> = {
		events: t('calendar:tabs.events'),
		bosses: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
		spawns: t('calendar:tabs.spawns'),
		rockets: t('calendar:tabs.rockets'),
		eggs: t('calendar:tabs.eggs'),
	};

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{t('calendar:shell.title')}</h1>
			<nav className='r-tabs r-tabs--cal'>
				{CALENDAR_TABS.map((tabKey) => (
					<NavLink
						key={tabKey}
						to={R.calendar(tabKey)}
						aria-current={tabKey === active ? 'page' : undefined}
						className={({ isActive }) => (isActive ? 'is-active' : '')}
					>
						{TAB_LABEL[tabKey]}
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
