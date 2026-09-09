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

const dfShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dfTime = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
});

export const dateRange = (start: number, end: number): string => {
	if (!start && !end) return '';
	const s = new Date(start);
	const e = new Date(end);
	const sameDay = s.toDateString() === e.toDateString();
	return sameDay
		? `${dfTime.format(s)} – ${dfTime.format(e).split(', ').pop()}`
		: `${dfShort.format(s)} – ${dfShort.format(e)}`;
};

/** Day/month only, no time — used for the raid/spawn date picker labels. */
export const dayRange = (start: number, end: number): string => {
	if (!start && !end) return '';
	const s = new Date(start);
	const e = new Date(end);
	return s.toDateString() === e.toDateString() ? dfShort.format(s) : `${dfShort.format(s)} – ${dfShort.format(e)}`;
};

export type EventPhase = 'live' | 'soon' | 'ended';
export const eventPhase = (start: number, end: number, now = Date.now()): EventPhase =>
	now < start ? 'soon' : now > end ? 'ended' : 'live';

export const relativeDays = (ts: number, now = Date.now()): string => {
	const d = Math.round((ts - now) / 86_400_000);
	if (d <= 0) return 'today';
	if (d === 1) return 'tomorrow';
	return `in ${d}d`;
};
