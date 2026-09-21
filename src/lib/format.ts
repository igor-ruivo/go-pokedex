/** Short labels for the wordy form parentheticals so names stay on one line. */
const FORM_ABBR: Record<string, string> = {
	// legendaries / signature forms
	'crowned sword': 'Sw.',
	'crowned shield': 'Sh.',
	'hero of many battles': 'Hero',
	'dawn wings': 'Dawn',
	'dusk mane': 'Dusk',
	'origin': 'Origin',
	'origin forme': 'Origin',
	'altered': 'Altered',
	'altered forme': 'Altered',
	'incarnate': 'Incarnate',
	'incarnate forme': 'Incarnate',
	'therian': 'Therian',
	'therian forme': 'Therian',
	'attack forme': 'Atk',
	'defense forme': 'Def',
	'speed forme': 'Spd',
	'normal forme': '',
	'blade forme': 'Blade',
	'shield forme': 'Shield',
	'sky forme': 'Sky',
	'land forme': 'Land',
	'complete forme': 'Complete',
	'10% forme': '10%',
	'50% forme': '50%',
	'pirouette forme': 'Pirouette',
	'aria forme': '',
	'zen mode': 'Zen',
	'standard mode': '',
	'galarian standard': 'Galar',
	'galarian zen': 'Galar Zen',
	'sunshine': 'Sun',
	'unbound': 'Unbound',
	'confined': '',
	// regionals
	'alolan': 'Alola',
	'galarian': 'Galar',
	'hisuian': 'Hisui',
	'paldean': 'Paldea',
	'paldean combat breed': 'Combat',
	'paldean blaze breed': 'Blaze',
	'paldean aqua breed': 'Aqua',
	// gender
	'male': '♂',
	'female': '♀',
};

/** Forms that read as a prefix: "Mega Charizard X", "Primal Kyogre", "Ultra Necrozma". */
const PREFIX_FORMS: Record<string, string> = { primal: 'Primal', ultra: 'Ultra' };

/**
 * Strips the "Shadow" marker, rewrites Mega / Primal names ("Mewtwo (Mega Y)" →
 * "Mega Mewtwo Y", "Kyogre (Primal)" → "Primal Kyogre") and abbreviates other
 * form parentheticals so a name never needs a second line.
 */
export const cleanName = (name: string): string => {
	let s = name
		.replace(/\(Shadow\)/gi, '')
		.replace(/\bShadow\b/g, '')
		.replace(/\s*\(\s*\)/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();

	const mega = /^(.*?)\s*\(Mega(?:\s+([A-Za-z]))?\)\s*$/.exec(s);
	if (mega?.[1] != null) {
		const base = mega[1].trim();
		return mega[2] ? `Mega ${base} ${mega[2].toUpperCase()}` : `Mega ${base}`;
	}

	const form = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(s);
	if (form?.[1] != null) {
		const base = form[1].trim();
		const key = form[2].trim().toLowerCase();
		const prefix = PREFIX_FORMS[key];
		if (prefix) return `${prefix} ${base}`;
		const abbr = FORM_ABBR[key] ?? form[2].trim();
		s = abbr ? `${base} ${abbr}` : base;
	}

	return s;
};

export const dexNo = (dex: number): string => `#${String(dex).padStart(3, '0')}`;

// Truncate to one decimal (no rounding — matches pvpivs.com), then drop a
// trailing ".0" so a whole value like 178.0 reads "178" and 100.0% reads "100%".
export const dec1 = (n: number): string => {
	const t = Math.trunc(n * 10) / 10;
	return Number.isInteger(t) ? String(t) : t.toFixed(1);
};

/**
 * Stat-product percentile of one spread vs. the #1 (best) spread — the same
 * definition pvpivs.com/PvPoke use, and the only correct one: a raw rank-
 * position fraction (e.g. `(4095 - rank) / 4095`) is NOT a percentile, it's
 * just where the spread sits in the sorted list, and gets further from the
 * true figure the more ties/close spreads exist below it.
 *
 * Rounds each stat product to an integer (as the games' own PvP ranking
 * conventionally does, and as this library's `computeBestIVs` already does
 * internally) before dividing — comparing raw floating-point products
 * (`A * D * S`) directly can land a spread's ratio against *itself* at
 * something like 99.999999999999% instead of exactly 100 (IEEE754 rounding
 * in the intermediate `* 100` multiply), which both misreports the #1 spread
 * and can misreport a genuine tie for #1. Dividing two *equal* integers is
 * always exactly 1 in IEEE754, so the rank-1 spread — and any other spread
 * that's a true stat-product tie with it — reports exactly 100, never 99.9.
 */
export const statProdPercentile = (
	candidate: { A: number; D: number; S: number },
	best: { A: number; D: number; S: number }
): number => {
	const candidateProd = Math.round(candidate.A * candidate.D * candidate.S);
	const bestProd = Math.round(best.A * best.D * best.S);
	return bestProd > 0 ? (candidateProd * 100) / bestProd : 0;
};

/**
 * "Perfection" shown on a Pokémon's own Ranks tab: where this spread's
 * competition rank sits among all 4096 possible raw IV combos, #1 → 100%
 * and #4096 → 0%, evenly spaced by rank position (not by stat product like
 * `statProdPercentile` above, which is what the IV Table shows instead).
 */
export const rankPerfection = (rank: number): number => ((4096 - rank) / 4095) * 100;

export const ordinal = (n: number): string => {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

// Events (and the special-raid-boss windows folded into the same feed) are
// published as "local time" — the same wall-clock hour in every timezone,
// not one fixed real-world instant (a Community Day at "2pm–5pm local" starts
// at 2pm in Portugal AND, separately, at 2pm in Spain, an hour apart in real
// UTC terms). dex-server has nowhere to put a real timezone for that (there
// isn't one — it depends on whoever's looking), so it encodes those wall-clock
// numbers *as if* they were UTC (e.g. "2:00 PM" becomes the UTC instant
// 14:00:00Z) — a neutral carrier, not a real moment. Reading them back with
// the default (browser-local) formatter re-applies a real timezone conversion
// on top of that, shifting the displayed hour by the viewer's own UTC offset
// — which is where the "3pm–6pm" (should be 2pm–5pm) bug came from. Reading
// them with `timeZone: 'UTC'` instead just echoes the encoded wall-clock
// numbers back out unchanged, which is what "local time" actually means here.
// Keyed by website locale (not `undefined`/browser-locale) so the compact
// date strings actually follow the language the player picked on-site,
// not whatever their OS/browser happens to be set to — those can disagree
// (e.g. a pt-PT site pick on an en-US OS used to still render "Jan 15").
// Cached per locale since `Intl.DateTimeFormat` construction isn't free and
// these are built from render paths that can run per list item.
const dfEventShortCache = new Map<string, Intl.DateTimeFormat>();
const dfEventTimeCache = new Map<string, Intl.DateTimeFormat>();
const dfEventTimeOnlyCache = new Map<string, Intl.DateTimeFormat>();

const dfEventShort = (locale: string): Intl.DateTimeFormat => {
	let df = dfEventShortCache.get(locale);
	if (!df) {
		df = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
		dfEventShortCache.set(locale, df);
	}
	return df;
};
const dfEventTime = (locale: string): Intl.DateTimeFormat => {
	let df = dfEventTimeCache.get(locale);
	if (!df) {
		df = new Intl.DateTimeFormat(locale, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC',
		});
		dfEventTimeCache.set(locale, df);
	}
	return df;
};
const dfEventTimeOnly = (locale: string): Intl.DateTimeFormat => {
	let df = dfEventTimeOnlyCache.get(locale);
	if (!df) {
		df = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
		dfEventTimeOnlyCache.set(locale, df);
	}
	return df;
};

/** The same "wall-clock numbers encoded as UTC" scheme events use, applied to
 *  *now* — lets `now` be compared directly against `startDate`/`endDate`
 *  without a second, opposite timezone bug: a raw `Date.now()` is a real
 *  instant, and comparing a real instant against these faked-UTC numbers is
 *  exactly as wrong as formatting them with the browser's real timezone is.
 *  This shifts "now" by the *viewer's own* current UTC offset instead, so the
 *  comparison lines up — the event goes live/ends at 2pm/5pm on each
 *  viewer's own clock, wherever they are. */
export const nowAsEventTime = (): number => {
	const d = new Date();
	return d.getTime() - d.getTimezoneOffset() * 60_000;
};

export const dateRange = (start: number, end: number, locale: string): string => {
	if (!start && !end) return '';
	const s = new Date(start);
	const e = new Date(end);
	// UTC fields, not `.toDateString()` (browser-local) — has to agree with
	// the UTC-anchored formatters below on what "the same day" means, or a
	// viewer whose local date would differ from the encoded one gets a
	// same-day range rendered as if it crossed midnight, or vice versa.
	const sameDay =
		s.getUTCFullYear() === e.getUTCFullYear() &&
		s.getUTCMonth() === e.getUTCMonth() &&
		s.getUTCDate() === e.getUTCDate();
	return sameDay
		? `${dfEventTime(locale).format(s)} – ${dfEventTimeOnly(locale).format(e)}`
		: `${dfEventShort(locale).format(s)} – ${dfEventShort(locale).format(e)}`;
};

/** Explicit "Starts … · Ends …" line for an expanded event card — the
 *  compact `dateRange` above collapses a same-day range to "2:00 PM – 5:00
 *  PM"; this spells both ends out in full, always. */
export const eventStartEnd = (start: number, end: number, locale: string): string =>
	`Starts ${dfEventTime(locale).format(new Date(start))} · Ends ${dfEventTime(locale).format(new Date(end))}`;

/** Day/month only, no time — used for the raid/spawn date-picker tab labels.
 *  Its only callers (groupByRange, for RaidsTab/SpawnsTab's upcoming-window
 *  tabs) bucket the same local-time-encoded event feed `dateRange` above
 *  does, so this needs the identical UTC-anchored treatment — otherwise an
 *  event starting late at night local time could get bucketed under the
 *  *next* calendar day for a viewer east of it, or the previous one west of
 *  it, instead of the day it's actually local to. */
export const dayRange = (start: number, end: number, locale: string): string => {
	if (!start && !end) return '';
	const s = new Date(start);
	const e = new Date(end);
	const sameDay =
		s.getUTCFullYear() === e.getUTCFullYear() &&
		s.getUTCMonth() === e.getUTCMonth() &&
		s.getUTCDate() === e.getUTCDate();
	return sameDay ? dfEventShort(locale).format(s) : `${dfEventShort(locale).format(s)} – ${dfEventShort(locale).format(e)}`;
};

export type EventPhase = 'live' | 'soon' | 'ended';
// `start`/`end` are in the same faked-UTC "local wall clock" scheme as
// everything else on this page — the default `now` has to match that scheme
// (see `nowAsEventTime`), not a raw `Date.now()`, or "live" would keep
// tracking the viewer's *real* UTC offset from the event instead of their
// wall clock actually reading between the two times.
export const eventPhase = (start: number, end: number, now = nowAsEventTime()): EventPhase =>
	now < start ? 'soon' : now > end ? 'ended' : 'live';

/**
 * `now` is expected to come from `useLiveNow()` (ticking every second) for
 * anything rendering this live — for same-day events (`d <= 0`) this counts
 * down to the minute/second instead of sitting on a static "today" all day,
 * flipping to `eventPhase`'s own 'live' the moment it reaches zero.
 */
export const relativeDays = (ts: number, now = nowAsEventTime()): string => {
	const ms = ts - now;
	const d = Math.round(ms / 86_400_000);
	if (d >= 2) return `in ${d}d`;
	if (d === 1) return 'tomorrow';
	if (ms <= 0) return 'today';
	const h = Math.floor(ms / 3_600_000);
	if (h >= 1) return `in ${h}h`;
	const m = Math.floor(ms / 60_000);
	if (m >= 1) return `in ${m}m`;
	const s = Math.floor(ms / 1000);
	return `in ${s}s`;
};
