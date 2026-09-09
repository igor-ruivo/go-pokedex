/** Strips the "Shadow" marker and any empty "()" the game-master leaves behind. */
export const cleanName = (name: string): string =>
	name
		.replace(/\(Shadow\)/gi, '')
		.replace(/Shadow/g, '')
		.replace(/\s*\(\s*\)/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();

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
