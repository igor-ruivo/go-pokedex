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
const dfEventShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dfEventTime = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	timeZone: 'UTC',
});
const dfEventTimeOnly = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

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

export const dateRange = (start: number, end: number): string => {
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
		? `${dfEventTime.format(s)} – ${dfEventTimeOnly.format(e)}`
		: `${dfEventShort.format(s)} – ${dfEventShort.format(e)}`;
};

/** Explicit "Starts … · Ends …" line for an expanded event card — the
 *  compact `dateRange` above collapses a same-day range to "2:00 PM – 5:00
 *  PM"; this spells both ends out in full, always. */
export const eventStartEnd = (start: number, end: number): string =>
	`Starts ${dfEventTime.format(new Date(start))} · Ends ${dfEventTime.format(new Date(end))}`;

/** Day/month only, no time — used for the raid/spawn date-picker tab labels.
 *  Its only callers (groupByRange, for RaidsTab/SpawnsTab's upcoming-window
 *  tabs) bucket the same local-time-encoded event feed `dateRange` above
 *  does, so this needs the identical UTC-anchored treatment — otherwise an
 *  event starting late at night local time could get bucketed under the
 *  *next* calendar day for a viewer east of it, or the previous one west of
 *  it, instead of the day it's actually local to. */
export const dayRange = (start: number, end: number): string => {
	if (!start && !end) return '';
	const s = new Date(start);
	const e = new Date(end);
	const sameDay =
		s.getUTCFullYear() === e.getUTCFullYear() &&
		s.getUTCMonth() === e.getUTCMonth() &&
		s.getUTCDate() === e.getUTCDate();
	return sameDay ? dfEventShort.format(s) : `${dfEventShort.format(s)} – ${dfEventShort.format(e)}`;
};

export type EventPhase = 'live' | 'soon' | 'ended';
// `start`/`end` are in the same faked-UTC "local wall clock" scheme as
// everything else on this page — the default `now` has to match that scheme
// (see `nowAsEventTime`), not a raw `Date.now()`, or "live" would keep
// tracking the viewer's *real* UTC offset from the event instead of their
// wall clock actually reading between the two times.
export const eventPhase = (start: number, end: number, now = nowAsEventTime()): EventPhase =>
	now < start ? 'soon' : now > end ? 'ended' : 'live';

export const relativeDays = (ts: number, now = nowAsEventTime()): string => {
	const d = Math.round((ts - now) / 86_400_000);
	if (d <= 0) return 'today';
	if (d === 1) return 'tomorrow';
	return `in ${d}d`;
};
