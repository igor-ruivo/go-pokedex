import type { TFunction } from 'i18next';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { bonusBullet, BonusIcons, DEFAULT_BONUS_ICON } from '../components/BonusBullet';
import { IconTabBar } from '../components/IconTabBar';
import { PokeMini } from '../components/PokeMini';
import { RichText } from '../components/RichText';
import { SearchListBar } from '../components/SearchListBar';
import { SeasonMilestones } from '../components/SeasonMilestones';
import { SparkleIcon } from '../components/SparkleIcon';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useSeenEvents } from '../contexts/seen-events-context';
import type { IEntry, IPostEntry, IRocketGrunt } from '../DTOs/INews';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLiveNow } from '../hooks/useLiveNow';
import { usePlayOnChange } from '../hooks/usePlayOnChange';
import { useScrollAnchor } from '../hooks/useScrollAnchor';
import { leekduckPosts, specialToPost, spotlightToPost } from '../lib/calendar-events';
import { startsIn, timeLeft } from '../lib/event-timing';
import {
	cleanName,
	dateRange,
	dayRange,
	eventPhase,
	formatEventDateTime,
	nowAsEventTime,
	sentenceCase,
} from '../lib/format';
import { BONUS_ICON_URL, bonusIcons } from '../lib/milestone-icons';
import { CALENDAR_TABS, type CalendarTab, R } from '../lib/nav';
import { sortByCalendarRelevance, useRelevanceSets } from '../lib/relevance';
import { scrollOneStep } from '../lib/scroll-step';
import { useCalendar } from '../queries/calendar';
import { usePokemon } from '../queries/pokemon';
import { useGameTranslationsData } from '../utils/game-translations-store';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';
import { PokeAvatar } from './home/PokeAvatar';

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
	['1', '1 km'],
	['2', '2 km'],
	['5', '5 km'],
	['7', '7 km'],
	['10', '10 km'],
	['12', '12 km'],
];

const BonusesIcon = () => <SparkleIcon className='r-section-h-icon' />;

const TAB_ICON: Record<CalendarTab, string> = {
	events: '/images/nav/calendar.png',
	bosses: '/images/raids/tier-5.png',
	max: '/images/nav/max-battle.webp',
	spawns: '/images/nav/spawns-grass.png',
	rockets: '/images/NPC/male-grunt.webp',
	eggs: '/images/eggs/10km.png',
};

const isActive = (p: { startDate: number; endDate: number }, now: number) => now >= p.startDate && now < p.endDate;

/** Whichever single post contributed the most entries to a merged chip,
 *  reduced down to just what `SlotSource` needs to credit it — never the
 *  post's own title for a LeekDuck-sourced one (a fan site, not an official
 *  source), only the bare domain instead. */
export type SlotSourcePost = Pick<IPostEntry, 'title'> & {
	/** The bosses of a special raid window, which its title (English only) is about. */
	raids?: IPostEntry['raids'] | undefined;
	/** Where the information comes from: an official post, or a third party's site (LeekDuck, Pokebattler). */
	source: IPostEntry['source'] | 'pokebattler';
};
/** The third parties that are credited by their site rather than by a post: their domain, and where the credit links. */
const THIRD_PARTY_SOURCES = {
	leekduck: { label: 'leekduck.com', url: 'https://leekduck.com/' },
	pokebattler: { label: 'pokebattler.com', url: 'https://www.pokebattler.com/max' },
} as const;
export const slotSourceLabel = (post: SlotSourcePost | undefined, gl: GameLanguage): string | undefined => {
	if (!post) return undefined;
	// A post with a title of its own (a Spotlight Hour, a special raid boss window) is credited by that name, like any other event; the
	// third party's site only stands in for one that has none.
	return (
		post.title[gl] ||
		(post.source === 'leekduck' || post.source === 'pokebattler' ? THIRD_PARTY_SOURCES[post.source].label : undefined)
	);
};

/**
 * The title of a special raid window ("Yveltal Raid Hour", "Mega Blastoise in Mega Raids", "Shadow Landorus in Shadow Raids", "Yveltal
 * in 5-star Raid Battles") in the language shown: the feed only has them in English, but they are always the Pokémon and the kind of
 * window, so they are put together from the game's own words for it. `undefined` for any other post, and for English.
 */
const specialRaidTitle = (
	post: SlotSourcePost | undefined,
	gl: GameLanguage,
	dex: ReturnType<typeof usePokemon>['gamemasterPokemon'],
	t: TFunction<['calendar']>
): string | undefined => {
	if (gl === GameLanguage.en || post?.source !== 'leekduck' || !post.raids?.length) return undefined;
	const english = post.title.en ?? '';
	const kind = /Raid Hour$/i.test(english)
		? 'hour'
		: /in Mega Raids$/i.test(english)
			? 'mega'
			: /in Shadow Raids$/i.test(english)
				? 'shadow'
				: /in 5-star Raid Battles$/i.test(english)
					? 'five'
					: undefined;
	if (!kind) return undefined;
	const raid = sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl));
	const mega = gameTranslator(GameTranslatorKeys.MegaDisplay, gl);
	const shadow = gameTranslator(GameTranslatorKeys.ShadowDisplay, gl);
	const names = post.raids
		.map((r) => dex[r.speciesId])
		.filter((p): p is NonNullable<typeof p> => !!p)
		.map((p) => {
			const name = cleanName(p.speciesName);
			// the words Mega and Shadow are the game's own in the language shown, and said once: by the kind of window when it is one
			if (name.startsWith('Mega ')) return kind === 'mega' ? name.slice(5) : `${mega} ${name.slice(5)}`;
			return name;
		})
		.join(' + ');
	if (!names) return undefined;
	const label =
		kind === 'hour'
			? t('calendar:raids.raidHour')
			: kind === 'mega'
				? `${mega} ${raid}`
				: kind === 'shadow'
					? `${shadow} ${raid}`
					: `5★ ${raid}`;
	return `${names} · ${label}`;
};

/** Merge a list of dated posts into day-range buckets, deduping their entries.
 *  Each bucket also tracks whichever single post contributed the most
 *  entries to it — shown as a small "From: <event>" subtitle before that
 *  chip's grid, so a merged day still credits *something* concrete instead
 *  of just presenting an anonymous pile of Pokémon. */
const groupByRange = (
	posts: Array<IPostEntry>,
	pick: (p: IPostEntry) => Array<IEntry>,
	locale: string
): Array<{ label: string; entries: Array<IEntry>; sources: Array<SlotSourcePost> }> => {
	const map = new Map<
		string,
		{
			entries: Array<IEntry>;
			seen: Set<string>;
			minStart: number;
			maxEnd: number;
			sources: Array<SlotSourcePost>;
		}
	>();
	for (const p of posts) {
		const label = dayRange(p.startDate, p.endDate, locale);
		let g = map.get(label);
		if (!g) {
			g = {
				entries: [],
				seen: new Set(),
				minStart: p.startDate,
				maxEnd: p.endDate,
				sources: [],
			};
			map.set(label, g);
		} else {
			g.minStart = Math.min(g.minStart, p.startDate);
			g.maxEnd = Math.max(g.maxEnd, p.endDate);
		}
		const picked = pick(p);
		if (picked.length > 0) g.sources.push(p);
		for (const e of picked) {
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
	return [...map.values()].map(({ entries, minStart, maxEnd, sources }) => ({
		label: dayRange(minStart, maxEnd, locale).includes('–')
			? dayRange(minStart, maxEnd, locale)
			: dateRange(minStart, maxEnd, locale),
		entries,
		sources,
	}));
};

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

const MiniGrid = ({
	entries,
	endMap,
	showForm,
}: {
	entries: Array<IEntry>;
	endMap?: Map<string, number> | undefined;
	/** A chip shows its Max form: the Dynamax cloud over a Dynamax Pokémon, the Gigantamax artwork for a Gigantamax one (the Max Battle lists). */
	showForm?: boolean | undefined;
}) => {
	// `endMap` values come from the same local-time-encoded event feed
	// everything else on this page does — see nowAsEventTime()'s doc comment.
	// Ticking (not a one-off `nowAsEventTime()` read) so the "Xh/Xm/Xs left"
	// note keeps counting down live while the tab stays open, all the way
	// down through minutes and seconds as the deadline approaches.
	const now = useLiveNow();
	const { gamemasterPokemon } = usePokemon();
	const sets = useRelevanceSets();
	// Ending soonest first (when `endMap` gives it a countdown at all), then
	// most relevant (most league/raid dots), dex order, and family order only
	// for tied dex numbers — see `sortByCalendarRelevance` for the full chain.
	// Re-sorts every tick so a chip about to expire visibly climbs to the front.
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
						maxForm={showForm ? e.kind : undefined}
					/>
				);
			})}
		</div>
	);
};

/** "From: <event>" line above a date/Now chip's grid — credits whichever
 *  single event actually contributed those Pokémon, so a merged or "Now"
 *  chip doesn't read as an anonymous pile. Renders nothing without a title
 *  (e.g. "Now" backed only by the baseline current-rotation bosses, with no
 *  active event behind it at all). */
const SlotSource = ({ posts, gl }: { posts: ReadonlyArray<SlotSourcePost>; gl: GameLanguage }) => {
	const { t } = useTranslation(['calendar']);
	const { gamemasterPokemon } = usePokemon();
	// Every event that brings what is listed, joined with a plus sign (the same event once, whatever it brings twice).
	const labels = posts
		.map((post) => specialRaidTitle(post, gl, gamemasterPokemon, t) ?? slotSourceLabel(post, gl))
		.filter((label): label is string => !!label);
	const unique = [...new Set(labels)];
	if (unique.length === 0) return null;
	const label = unique.join(' + ');
	// A LeekDuck-sourced credit with no title of its own (a fan site isn't an official source — see `slotSourceLabel`) links out to the
	// site itself instead of just naming it, so it's still useful rather than a dead-end label.
	// `Trans` clones whichever of these two it picks and injects the translated text as its child at render time — `jsx-a11y` can't see
	// that statically, hence the disable right on the `<a>` below.
	const only = posts.length === 1 ? posts[0] : undefined;
	const highlight =
		only &&
		(only.source === 'leekduck' || only.source === 'pokebattler') &&
		label === slotSourceLabel(only, gl) &&
		!only.title[gl] ? (
			// eslint-disable-next-line jsx-a11y/anchor-has-content
			<a href={THIRD_PARTY_SOURCES[only.source].url} target='_blank' rel='noopener noreferrer' />
		) : (
			<em />
		);
	return (
		<p className='r-slot-source'>
			<Trans i18nKey='calendar:slotSource' values={{ event: label }} components={{ em: highlight }} />
		</p>
	);
};

/** Pokebattler is where the current Max Battle bosses come from: it is credited like the sites the other tabs name. */
const POKEBATTLER_SOURCE: SlotSourcePost = {
	title: {
		[GameLanguage.en]: '',
		[GameLanguage.ptbr]: '',
		[GameLanguage.de]: '',
		[GameLanguage.es]: '',
		[GameLanguage.esMx]: '',
		[GameLanguage.fr]: '',
		[GameLanguage.hi]: '',
		[GameLanguage.id]: '',
		[GameLanguage.it]: '',
		[GameLanguage.ja]: '',
		[GameLanguage.ko]: '',
		[GameLanguage.ru]: '',
		[GameLanguage.th]: '',
		[GameLanguage.tr]: '',
		[GameLanguage.zhHant]: '',
	},
	source: 'pokebattler',
};

const Group = ({
	title,
	entries,
	endMap,
	darker,
	egg,
	icon,
	centered,
	showForm,
}: {
	title: string;
	entries: Array<IEntry>;
	endMap?: Map<string, number> | undefined;
	darker?: boolean | undefined;
	/** Chips say Dynamax / Gigantamax (the Max Battle group of an event). */
	showForm?: boolean | undefined;
	/** Raid-egg icon key in /public/images/raids (raid groups only). */
	egg?: string | undefined;
	/** Full icon path for a plain (`.r-section-h`) group heading — mutually
	 *  exclusive with `egg`, which already renders its own bigger icon+title
	 *  header. */
	icon?: string | undefined;
	/** A smaller heading in the middle, between two lines, with no icon (a sub-section of a group). */
	centered?: boolean | undefined;
}) =>
	entries.length ? (
		<div className='r-group' data-egg={egg ? '' : undefined}>
			{egg ? (
				<div className='r-eggsec-head' data-darker={darker ? '' : undefined}>
					<span className='r-eggsec-icon'>
						<img src={`/images/raids/${egg}.png`} alt='' loading='lazy' />
					</span>
					<b>{title}</b>
				</div>
			) : (
				<div className='r-section-h' data-darker={darker ? '' : undefined} data-centered={centered ? '' : undefined}>
					{icon && (
						<span className='r-section-h-icon'>
							<img src={icon} alt='' loading='lazy' />
						</span>
					)}
					{title}
				</div>
			)}
			<MiniGrid entries={entries} endMap={endMap} showForm={showForm} />
		</div>
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
		if (el) scrollOneStep(el, dir);
	};

	return (
		<div className='r-datepick'>
			<span className='r-datepick-ic' aria-hidden='true'>
				<img src='/images/nav/calendar.png' alt='' />
			</span>
			<div className='r-datepick-scroller'>
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
	/** Told which card it is, to keep it where it is on the page while the open one changes (see `useScrollAnchor`). */
	onToggle: (card: HTMLElement | null) => void;
	preferSubtitle: boolean;
	isSeason: boolean;
	/** Never expanded on this device — see the Calendar nav badge, same idea
	 *  and same colour, just per-row instead of a total count. */
	unseen: boolean;
}) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const cardRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(cardRef, open);
	// Ticking so a same-day "in Xh/Xm/Xs" countdown (see `startsIn`) counts
	// down live and flips this card straight to "Live" the instant it starts,
	// instead of sitting on a static "today" until some unrelated re-render.
	const now = useLiveNow();
	const phase = eventPhase(post.startDate, post.endDate, now);
	const title =
		(preferSubtitle ? post.subtitle[gl] || post.title[gl] : post.title[gl] || post.subtitle[gl]) ||
		t('calendar:events.fallbackTitle');
	const bonuses = post.bonuses[gl] ?? [];
	// the bonuses with their formatting (bullet points, bold, footnotes) when the data has it, the plain lines otherwise
	const bonusBlocks = post.bonusBlocks?.[gl] ?? [];
	// the rewards of the event's GO Pass, with their formatting (and the English ones, to know which icon each gets)
	const rewardBlocks = post.rewardBlocks?.[gl] ?? [];
	const rewardReference = post.rewardBlocks?.[GameLanguage.en];
	// the major milestone bonuses of the season, or of an event with a GO Pass
	const milestones = post.milestoneBonuses?.[gl];
	// the link to this very event: the Events tab opens it expanded and scrolls to it
	const [copied, setCopied] = useState(false);
	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(`${window.location.origin}${R.calendarEvent(post.id)}`);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
		} catch {
			// no clipboard access (an insecure page, a blocked permission): the button simply does nothing
		}
	};
	// A Spotlight Hour, a Max Monday (a day of Max Battles led by one Dynamax Pokémon) and Raid Hours are shown the same way: their picture
	// with the featured Pokémon on it.
	const maxMons = post.maxBattles ?? [];
	const isFeaturedDay = !!post.isSpotlight || !!post.isRaidHour || (post.source === 'leekduck' && maxMons.length > 0);
	const spotlightMons = post.isSpotlight ? post.wild : post.isRaidHour ? post.raids : maxMons;
	// The GO/shiny sprite assets carry a lot of built-in transparent padding
	// (unlike the official artwork), so the shared sprite rule scales them
	// up without changing this layout box.
	return (
		<div className='r-event' ref={cardRef} data-open={open} data-event={post.id}>
			<button
				type='button'
				className='r-event-head'
				onClick={(e) => onToggle(e.currentTarget.closest<HTMLElement>('[data-event]'))}
			>
				{isFeaturedDay ? (
					<span className='r-event-spotlight'>
						{post.imageUrl && <img className='r-event-spotlight-bg' src={post.imageUrl} alt='' loading='lazy' />}
						<span className='r-event-spotlight-sprites' data-count={Math.min(spotlightMons.length, 4)}>
							{spotlightMons.map((e) => {
								const p = gamemasterPokemon[e.speciesId];
								// the round chip of the site's faces, small enough to sit inside the white circle of the picture
								return p ? <PokeAvatar key={e.speciesId} pokemon={p} shiny={e.shiny} maxForm={e.kind} /> : null;
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
					{(bonuses.length > 0 || bonusBlocks.length > 0) && (
						<>
							<div className='r-section-h'>
								<BonusesIcon />
								{t('calendar:events.bonuses')}
							</div>
							{bonusBlocks.length > 0 ? (
								<RichText
									blocks={bonusBlocks}
									className='r-bonuses-rich'
									bullet={bonusBullet(bonusBlocks, post.bonusBlocks?.[GameLanguage.en])}
									fallbackBullet={DEFAULT_BONUS_ICON}
								/>
							) : (
								<ul
									className={
										bonuses.some((b, i) => b && bonusIcons(post.bonuses[GameLanguage.en]?.[i] ?? b).length > 0)
											? 'r-bonuses r-bonuses--icons'
											: 'r-bonuses'
									}
								>
									{bonuses.map((b, i) => {
										if (!b) return null;
										const english = post.bonuses[GameLanguage.en]?.[i] ?? b;
										return bonusIcons(english).length > 0 ? (
											<li key={i}>
												<BonusIcons englishText={english} />
												<span>{b}</span>
											</li>
										) : (
											<li key={i}>
												{DEFAULT_BONUS_ICON}
												<span>{b}</span>
											</li>
										);
									})}
								</ul>
							)}
						</>
					)}
					{rewardBlocks.length > 0 && (
						<>
							<div className='r-section-h'>
								<BonusesIcon />
								{t('calendar:events.rewards')}
							</div>
							<RichText
								blocks={rewardBlocks}
								className='r-rewards'
								bullet={bonusBullet(rewardBlocks, rewardReference)}
								fallbackBullet={DEFAULT_BONUS_ICON}
							/>
						</>
					)}
					{milestones && (
						<SeasonMilestones milestones={milestones} reference={post.milestoneBonuses?.[GameLanguage.en]} />
					)}
					<Group
						title={t('calendar:events.groups.featuredSpawns')}
						entries={post.wild}
						icon='/images/nav/spawns-grass.png'
					/>
					<RaidTierGroups entries={post.raids} plainHeadings />
					<Group
						title={gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl)}
						entries={post.maxBattles ?? []}
						icon='/images/nav/max-battle.webp'
						showForm
					/>
					<Group
						title={t('calendar:events.groups.researchEncounters')}
						entries={post.researches}
						icon='/images/nav/research.png'
					/>
					<EventEggs entries={post.eggs} />
					<Group
						title={t('calendar:events.groups.incense')}
						entries={post.incenses}
						icon='/images/bonuses/incense-plain.png'
					/>
					<Group title={t('calendar:events.groups.lures')} entries={post.lures} icon={BONUS_ICON_URL.lure} />
					<div className='r-event-actions'>
						<button
							type='button'
							className='r-ext-link r-copy-link'
							data-done={copied ? '' : undefined}
							onClick={(e) => {
								e.stopPropagation();
								void copyLink();
							}}
						>
							{copied ? t('calendar:events.linkCopied') : t('calendar:events.copyLink')}
							<span aria-hidden='true'>{copied ? '✓' : '⧉'}</span>
						</button>
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
				</div>
			)}
		</div>
	);
};

const EventsTab = () => {
	const { t } = useTranslation(['calendar']);
	const {
		posts,
		season,
		spotlightHours,
		maxMondays,
		raidHours,
		postsFetchCompleted,
		seasonFetchCompleted,
		spotlightHoursFetchCompleted,
		maxMondaysFetchCompleted,
		raidHoursFetchCompleted,
	} = useCalendar();
	// An event named in the link (?event=…, from the Home page) starts open, and the page scrolls to it once it is drawn.
	const [searchParams] = useSearchParams();
	const linkedId = searchParams.get('event');
	const [openId, setOpenId] = useState<string | null>(linkedId);
	const { currentGameLanguage: gl } = useLanguage();
	const { seenIds, markSeen } = useSeenEvents();
	const scrolledTo = useRef<string | null>(null);
	// opening an event closes the one that was open, which can be above it: the one just opened is kept where it was on the screen
	const holdAnchor = useScrollAnchor(openId);

	const ready =
		postsFetchCompleted && spotlightHoursFetchCompleted && maxMondaysFetchCompleted && raidHoursFetchCompleted;

	const list = useMemo(() => {
		// Not a raw `Date.now()` — see nowAsEventTime()'s own doc comment.
		// Getting this wrong is exactly what made events linger an hour past
		// their real (local-time) end before disappearing.
		const now = nowAsEventTime();
		// Spotlight Hours fold straight into the same Events feed — the
		// pre-revamp site did the same (a Spotlight Hour is just a very short
		// event), rather than giving them their own section.
		// Max Mondays are the same kind of LeekDuck event (a day of Max Battles with its Dynamax Pokémon).
		// Same for Raid Hours.
		const allPosts = ready ? [...posts, ...leekduckPosts(spotlightHours, maxMondays, raidHours)] : [];
		// Same-day starts (the common case — most events go live at the same
		// local hour) tie-break by shorter overall duration first, then
		// alphabetically — never by exact start instant, or two events
		// announced the same day in a different order each import would keep
		// reshuffling for no visible reason.
		const dayOf = (time: number) => Math.floor(time / 86_400_000);
		const events = allPosts
			// `availableLocales` excludes real pokemongo.com posts that have no
			// page of their own for the current game language — LeekDuck-sourced
			// synthetic posts (Spotlight Hours) always list every language here,
			// so they're never filtered out by this (see their own note).
			.filter((p) => p && p.endDate >= now && p.availableLocales.includes(gl))
			.sort((a, b) => {
				const dayDiff = dayOf(a.startDate) - dayOf(b.startDate);
				if (dayDiff !== 0) return dayDiff;
				const durationDiff = a.endDate - a.startDate - (b.endDate - b.startDate);
				if (durationDiff !== 0) return durationDiff;
				return a.title[gl].localeCompare(b.title[gl]);
			});
		return seasonFetchCompleted && season ? [season, ...events] : events;
	}, [posts, spotlightHours, maxMondays, raidHours, ready, season, seasonFetchCompleted, gl]);

	const dupeTitles = useMemo(() => {
		const seen = new Map<string, number>();
		for (const p of list) seen.set(p.title[gl], (seen.get(p.title[gl]) ?? 0) + 1);
		return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
	}, [list, gl]);

	// the linked event: opened (and marked seen) as soon as it is in the list, and scrolled into view once, below the app bar
	useEffect(() => {
		if (!linkedId || scrolledTo.current === linkedId || !list.some((p) => p.id === linkedId)) return;
		scrolledTo.current = linkedId;
		setOpenId(linkedId);
		markSeen(linkedId);
		requestAnimationFrame(() => {
			const card = [...document.querySelectorAll<HTMLElement>('[data-event]')].find(
				(el) => el.dataset.event === linkedId
			);
			card?.scrollIntoView({
				block: 'start',
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
			});
		});
	}, [linkedId, list, markSeen]);

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
						onToggle={(card) => {
							const opening = p.id !== openId;
							holdAnchor(card, opening);
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

/**
 * Raid Pokémon by tier, each tier a section with its egg and its name (5★ and Mega, 3★, 1★), the Shadow ones of each tier in a
 * quieter section of their own, and any other raid after them. The Bosses tab and the raids of an event are laid out the same way.
 */
const RaidTierGroups = ({
	entries,
	endMap,
	plainHeadings,
}: {
	entries: Array<IEntry>;
	endMap?: Map<string, number> | undefined;
	/** Headings like the other sections of an event (a small egg in the heading's plate) instead of the tab's larger ones. */
	plainHeadings?: boolean | undefined;
}) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const shadow = (id: string) => !!gamemasterPokemon[id]?.isShadow;

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
	const others = entries.filter((e) => !RAID_TIERS.some((tier) => tier.match(e.kind)));
	return (
		<>
			{RAID_TIERS.map((tier) => (
				<Group
					key={tier.key}
					title={tierLabels[tier.key].full}
					{...(plainHeadings ? { icon: `/images/raids/${tier.egg}.png` } : { egg: tier.egg })}
					entries={entries.filter((e) => tier.match(e.kind) && !shadow(e.speciesId))}
					endMap={endMap}
				/>
			))}
			{RAID_TIERS.map((tier) => (
				<Group
					key={`${tier.key}-shadow`}
					title={t('calendar:raids.shadowPrefix', {
						tier: tierLabels[tier.key].short,
						shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
					})}
					{...(plainHeadings ? { icon: `/images/raids/${tier.egg}.png` } : { egg: tier.egg })}
					entries={entries.filter((e) => tier.match(e.kind) && shadow(e.speciesId))}
					endMap={endMap}
					darker
				/>
			))}
			{others.length > 0 && (
				<Group
					title={t('calendar:raids.otherRaids', { raid: raidWord })}
					entries={others}
					icon={plainHeadings ? '/images/raids/tier-5.png' : undefined}
				/>
			)}
		</>
	);
};

// Which date/Now chip was last picked on the Raids tab — module-scoped, not
// component state, so it survives navigating away (e.g. to Settings) and
// back, which remounts RaidsTab and would otherwise silently reset a plain
// `useState` back to its initial value. Resets only on a full page reload.
let lastRaidsSlot = 'current';

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
	const { fetchCompleted } = usePokemon();
	const [sel, setSelRaw] = useState(lastRaidsSlot);
	const setSel = (key: string) => {
		lastRaidsSlot = key;
		setSelRaw(key);
	};
	const slotRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(slotRef, sel, true);

	const ready = postsFetchCompleted && specialBossesFetchCompleted && currentBossesFetchCompleted && fetchCompleted;

	const { current, upcoming, endMap, currentSources } = useMemo(() => {
		const endMap = new Map<string, number>();
		if (!ready) {
			return {
				current: [] as Array<IEntry>,
				upcoming: [] as Array<IPostEntry>,
				endMap,
				currentSources: [] as Array<SlotSourcePost>,
			};
		}
		// `raidPosts` below is the same local-time-encoded event feed as the
		// Events tab (any post with raids listed) — see nowAsEventTime(). Also
		// excludes any pokemongo.com post with no page of its own in the
		// current game language (LeekDuck posts always pass — their
		// `availableLocales` always lists every language, since they have no
		// per-locale page to check in the first place).
		const now = nowAsEventTime();

		const raidPosts: Array<IPostEntry> = [
			...posts.filter((p) => p && (p.raids?.length ?? 0) > 0 && p.availableLocales.includes(gl)),
			...specialBosses.map(specialToPost),
		].filter((p) => p.endDate >= now);

		const seen = new Set<string>();
		const current: Array<IEntry> = [];
		for (const e of currentBosses) {
			if (seen.has(e.speciesId)) continue;
			seen.add(e.speciesId);
			current.push(e);
		}
		// Every active event that brings raid bosses to "Now" (none when Now is backed only by the baseline current-rotation bosses).
		const currentSources: Array<SlotSourcePost> = [];
		for (const p of raidPosts) {
			if (!isActive(p, now)) continue;
			if (p.raids.length > 0) currentSources.push(p);
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
		return { current, upcoming, endMap, currentSources };
	}, [ready, posts, specialBosses, currentBosses, gl]);

	if (!ready) return <Spinner />;

	const upcomingGroups = groupByRange(upcoming, (p) => p.raids, currentLanguage);

	const slots: Array<{
		key: string;
		label: string;
		entries: Array<IEntry>;
		sources: Array<SlotSourcePost>;
	}> = [
		{ key: 'current', label: t('calendar:raids.nowSlot'), entries: current, sources: currentSources },
		...upcomingGroups.map((g) => ({ key: g.label, label: g.label, entries: g.entries, sources: g.sources })),
	];
	const activeSlot = slots.find((s) => s.key === sel) ?? slots[0];
	const activeEntries = activeSlot?.entries ?? [];
	const showEnd = activeSlot?.key === 'current';

	return (
		<>
			<DatePicker slots={slots} active={activeSlot?.key ?? 'current'} onPick={setSel} />

			<div ref={slotRef}>
				{activeEntries.length === 0 ? (
					<p className='r-muted' style={{ marginTop: 'var(--s4)' }}>
						{t('calendar:raids.nothingScheduled')}
					</p>
				) : (
					<>
						<SlotSource posts={activeSlot?.sources ?? []} gl={gl} />
						<RaidTierGroups entries={activeEntries} endMap={showEnd ? endMap : undefined} />
					</>
				)}
			</div>
		</>
	);
};

// Same idea as RaidsTab's own `lastRaidsSlot` — survives a remount from
// navigating away and back (e.g. to Settings) instead of resetting.
let lastSpawnsSlot = '';

/* ---------- Spawns ---------- */
const SpawnsTab = () => {
	const { t } = useTranslation(['calendar', 'home']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { posts, spotlightHours, postsFetchCompleted, spotlightHoursFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();
	const [sel, setSelRaw] = useState(lastSpawnsSlot);
	const setSel = (key: string) => {
		lastSpawnsSlot = key;
		setSelRaw(key);
	};
	const slotRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(slotRef, sel, true);

	if (!postsFetchCompleted || !spotlightHoursFetchCompleted || !fetchCompleted) {
		return <Spinner />;
	}

	// Same local-time-encoded event feed as the Events tab — see nowAsEventTime().
	const now = nowAsEventTime();
	// A Spotlight Hour's featured Pokémon are a "current spawn" too, for the
	// same duration — same synthetic post as the Events tab (see
	// spotlightToPost), so it costs nothing beyond scanning it alongside
	// everything else here that already carries a `wild` list. Also excludes
	// any pokemongo.com post with no page of its own in the current game
	// language — see RaidsTab's own `raidPosts` note (LeekDuck posts always
	// pass this).
	const withWild = [...posts, ...spotlightHours.map(spotlightToPost)]
		.filter((p) => p && (p.wild?.length ?? 0) > 0 && p.endDate >= now && p.availableLocales.includes(gl))
		.sort((a, b) => a.startDate - b.startDate);

	// spawns from events happening right this moment, merged & deduped
	const nowSeen = new Set<string>();
	const nowSpawns: Array<IEntry> = [];
	const endMap = new Map<string, number>();
	// Every active event that brings spawns to "Now" (none when nothing active backs it).
	const nowSources: Array<SlotSourcePost> = [];
	for (const p of withWild) {
		if (!isActive(p, now)) continue;
		if (p.wild.length > 0) nowSources.push(p);
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

	const slots: Array<{ key: string; label: string }> = [
		...(nowSpawns.length > 0 ? [{ key: 'now', label: t('calendar:spawns.nowSlot') }] : []),
		...eventGroups.map((g) => ({ key: g.label, label: g.label })),
	];
	// the season has no spawns of its own (they come with the events), so there is no slot for it
	const fallback = nowSpawns.length > 0 ? 'now' : (slots[0]?.key ?? '');
	const activeKey = slots.some((s) => s.key === sel) ? sel : fallback;

	return (
		<>
			<DatePicker slots={slots} active={activeKey} onPick={setSel} />

			<div ref={slotRef}>
				{activeKey === 'now' ? (
					<div style={{ marginTop: 'var(--s4)' }}>
						<SlotSource posts={nowSources} gl={gl} />
						<MiniGrid entries={nowSpawns} endMap={endMap} />
					</div>
				) : slots.length === 0 ? (
					<p className='r-muted' style={{ marginTop: 'var(--s4)' }}>
						{t('home:now.empty')}
					</p>
				) : (
					<div style={{ marginTop: 'var(--s4)' }}>
						<SlotSource posts={eventGroups.find((g) => g.label === activeKey)?.sources ?? []} gl={gl} />
						<MiniGrid entries={eventGroups.find((g) => g.label === activeKey)?.entries ?? []} />
					</div>
				)}
			</div>
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

const rocketGruntTitle = (g: IRocketGrunt, gl: GameLanguage): string => {
	const typeKey = g.type?.toLowerCase();
	const namedTrainerKey = !typeKey ? NAMED_TRAINER_KEYS.find(([needle]) => g.trainerId.includes(needle)) : undefined;
	return g.type
		? GRUNT_TITLE_ORDER[gl](
				gameTypeDisplayTranslator(typeKey ?? '', gl) || g.type,
				gameTranslator(GameTranslatorKeys.GruntDisplay, gl)
			)
		: namedTrainerKey
			? gameTranslator(namedTrainerKey[1], gl)
			: gameTranslator(GameTranslatorKeys.GruntDisplay, gl);
};

const RocketGrunt = ({
	g,
	open,
	onToggle,
}: {
	g: IRocketGrunt;
	open: boolean;
	onToggle: (card: HTMLElement) => void;
}) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const cardRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(cardRef, open);
	const sets = useRelevanceSets();
	const typeKey = g.type?.toLowerCase();
	const avatar = typeKey ? `/images/types/${typeKey}.png` : npcAvatar(g.trainerId);
	// Most relevant first (most league/raid dots), dex order, then family-line
	// order only for tied dex numbers — same rule the other grids use (see `MiniGrid`).
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
	// The shadow Pokémon of this grunt that can be shiny (dex-server reads the icon off LeekDuck's lineup) — only the ones in a
	// tier you can catch get the mark: a Pokémon you only fight can never be shiny.
	const shinyIds = useMemo(() => new Set(g.shinyPokemon ?? []), [g]);
	const title = rocketGruntTitle(g, gl);

	// toggle from anywhere on the card, but never when a Pokémon link was clicked
	const toggle = (e: ReactMouseEvent | ReactKeyboardEvent) => {
		if ((e.target as HTMLElement).closest('a')) return;
		onToggle(e.currentTarget as HTMLElement);
	};

	return (
		<div
			ref={cardRef}
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
								<PokeMini key={`${id}-${j}`} speciesId={id} forceShadow shiny={shinyIds.has(id)} />
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
												shiny={g.catchableTiers.includes(i) && shinyIds.has(id)}
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
	const { currentGameLanguage: gl } = useLanguage();
	const { currentRockets, currentRocketsFetchCompleted } = useCalendar();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const [openId, setOpenId] = useState<string | null>(null);
	const holdAnchor = useScrollAnchor(openId);
	const [query, setQuery] = useState('');
	const searchQuery = useDebouncedValue(query.trim().toLowerCase(), 220);
	const filteredRockets = useMemo(() => {
		if (!searchQuery) return currentRockets;
		return currentRockets.filter((g) => {
			const searchableText = [rocketGruntTitle(g, gl), g.phrase[gl] ?? ''];
			if (searchableText.some((text) => text.toLowerCase().includes(searchQuery))) return true;
			return [...g.tier1, ...g.tier2, ...g.tier3].some((speciesId) => {
				const pokemon = gamemasterPokemon[speciesId];
				return pokemon && cleanName(pokemon.speciesName).toLowerCase().includes(searchQuery);
			});
		});
	}, [currentRockets, gamemasterPokemon, gl, searchQuery]);

	if (!currentRocketsFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentRockets.length === 0) return <p className='r-muted'>{t('calendar:rockets.noLineups')}</p>;

	return (
		<div>
			<SearchListBar
				value={query}
				onChange={setQuery}
				placeholder={t('calendar:tabs.searchRockets')}
				clearAriaLabel={t('calendar:tabs.rockets')}
				onClear={() => setQuery('')}
				label={`${t('calendar:tabs.rockets')}: ${filteredRockets.length}`}
			/>
			<div className='r-eventlist'>
				{filteredRockets.map((g) => (
					<RocketGrunt
						key={g.trainerId}
						g={g}
						open={openId === g.trainerId}
						onToggle={(card) => {
							holdAnchor(card, openId !== g.trainerId);
							setOpenId((p) => (p === g.trainerId ? null : g.trainerId));
						}}
					/>
				))}
			</div>
			{filteredRockets.length === 0 && <p className='r-muted'>{t('calendar:rockets.noLineups')}</p>}
		</div>
	);
};

/* ---------- Eggs ---------- */
// dex-server ships this one egg-pool comment as a raw, un-localized English
// constant under every `GameLanguage` key (unlike every other comment, which
// it does translate per language) — a gap on its end, not something this
// repo's own i18n resources can fix at the source. Since it's the one known
// exception, override it with our own translation by matching its literal
// (case-insensitive) text rather than leaving it stuck in English; every
// other comment passes through unchanged.
const eggCommentLabel = (comment: string, t: TFunction): string =>
	comment.trim().toUpperCase() === 'FROM FRIEND GIFTS' ? t('calendar:eggs.fromFriendGifts') : comment;

/**
 * The eggs of an event, one section for each egg distance (with that egg's own picture), and, within a distance, the ones the
 * post says come another way (Adventure Sync rewards, friend gifts) in a section of their own.
 */
const EventEggs = ({ entries }: { entries: Array<IEntry> }) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	if (entries.length === 0) return null;
	const title = t('calendar:events.groups.eggs');
	const known = new Set(EGG_TIERS.map(([k]) => k));
	const sections: Array<ReactNode> = [];
	for (const [k, label] of EGG_TIERS) {
		const all = entries.filter((e) => e.kind === k);
		if (all.length === 0) continue;
		const icon = `/images/eggs/${k}km.png`;
		sections.push(
			<Group key={k} title={`${title} · ${label}`} entries={all.filter((e) => !e.comment?.[gl])} icon={icon} />
		);
		const comments = new Map<string, Array<IEntry>>();
		for (const e of all) {
			const c = e.comment?.[gl];
			if (c) comments.set(c, [...(comments.get(c) ?? []), e]);
		}
		for (const [c, list] of comments) {
			sections.push(<Group key={`${k}-${c}`} title={eggCommentLabel(c, t)} entries={list} centered />);
		}
	}
	// an egg with no distance of its own
	sections.push(
		<Group
			key='other'
			title={title}
			entries={entries.filter((e) => !known.has(e.kind ?? ''))}
			icon='/images/eggs/10km.png'
		/>
	);
	return <>{sections}</>;
};

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
							<span className='r-eggsec-icon'>
								<img src={`/images/eggs/${k}km.png`} alt='' loading='lazy' />
							</span>
							<b>{label}</b>
						</div>
						{plain.length > 0 && <MiniGrid entries={plain} />}
						{[...groups.entries()].map(([c, list]) => (
							<div key={c}>
								<div className='r-section-h'>{eggCommentLabel(c, t)}</div>
								<MiniGrid entries={list} />
							</div>
						))}
					</section>
				);
			})}
		</div>
	);
};

/** The Max Battle bosses of right now, by tier, each saying whether it is a Dynamax or a Gigantamax Pokémon. */
const MaxBattlesTab = () => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { currentMaxBattles, currentMaxBattlesFetchCompleted } = useCalendar();
	const { fetchCompleted } = usePokemon();

	if (!currentMaxBattlesFetchCompleted || !fetchCompleted) return <Spinner />;
	if (currentMaxBattles.length === 0) return <p className='r-muted'>{t('calendar:max.empty')}</p>;

	// the highest tiers first
	const tiers = [...new Set(currentMaxBattles.map((e) => e.tier ?? ''))].sort((a, b) => Number(b) - Number(a));
	return (
		<div className='r-egglist'>
			{/* the list of current bosses comes from Pokebattler */}
			<SlotSource posts={[POKEBATTLER_SOURCE]} gl={gl} />
			{tiers.map((tier) => (
				<section key={tier} className='r-eggsec'>
					<div className='r-eggsec-head'>
						<span className='r-eggsec-icon'>
							<img src='/images/nav/max-battle.webp' alt='' loading='lazy' />
						</span>
						<b>{tier ? `★ ${tier}` : '★'}</b>
					</div>
					<MiniGrid entries={currentMaxBattles.filter((e) => (e.tier ?? '') === tier)} showForm />
				</section>
			))}
		</div>
	);
};

/* ---------- shell ---------- */
const Calendar = () => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { tab } = useParams();
	const navigate = useNavigate();
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
	const panelRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(panelRef, active, true);

	// Literal t() calls, not a Record built from a dynamic key — see
	// RaidsTab's tierLabels for why. "bosses" is the Raids tab — its label
	// tracks the player's in-game language like every other GameTranslator
	// use, not the website UI's.
	const TAB_LABEL: Record<CalendarTab, string> = {
		events: t('calendar:tabs.events'),
		bosses: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
		max: gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl),
		spawns: t('calendar:tabs.spawns'),
		rockets: t('calendar:tabs.rockets'),
		eggs: t('calendar:tabs.eggs'),
	};

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{t('calendar:shell.title')}</h1>
			<IconTabBar
				items={CALENDAR_TABS.map((tabKey) => ({ id: tabKey, label: TAB_LABEL[tabKey], icon: TAB_ICON[tabKey] }))}
				activeId={active}
				onSelect={(id) => void navigate(R.calendar(id as CalendarTab))}
				ariaLabel={t('calendar:tabs.ariaLabel')}
			/>

			<div ref={panelRef} style={{ marginTop: 16 }}>
				{active === 'events' && <EventsTab />}
				{active === 'bosses' && <RaidsTab />}
				{active === 'max' && <MaxBattlesTab />}
				{active === 'spawns' && <SpawnsTab />}
				{active === 'rockets' && <RocketsTab />}
				{active === 'eggs' && <EggsTab />}
			</div>
		</div>
	);
};

export default Calendar;
