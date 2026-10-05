import i18n from '../i18n';

// `end`/`start`/`now` are in the "local wall clock encoded as UTC" scheme of the event feed (see `nowAsEventTime`).

/** How long is left until `end`, as "3d left", "5h left", "12m left" or "40s left" (empty once it is over). */
export const timeLeft = (end: number, now: number): string => {
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
export const startsIn = (start: number, now: number): string => {
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
