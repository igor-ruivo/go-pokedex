import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { BonusIcons } from '../../components/BonusBullet';
import { GameLanguage, useLanguage } from '../../contexts/language-context';
import { useLiveNow } from '../../hooks/useLiveNow';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { spotlightToPost } from '../../lib/calendar-events';
import { type SpecialDay, specialDays } from '../../lib/community-days';
import { startsIn, timeLeft } from '../../lib/event-timing';
import { cleanName, dateRange, eventPhase } from '../../lib/format';
import { R } from '../../lib/nav';
import { useCalendar } from '../../queries/calendar';
import { usePokemon } from '../../queries/pokemon';
import { DayHeroes } from './DayHeroes';

/** How many of the Pokémon a day is about its row shows side by side, by width (the rest are a "+N"): a medium screen and a wide one. On a phone (keep in step with the 760px rule of `.h-day` in home.css) they take turns instead. */
const NARROW_SCREEN = '(max-width: 760px)';
const WIDE_SCREEN = '(min-width: 1000px)';
const MID_HEROES = 3;
const WIDE_HEROES = 4;

/**
 * A weekday name that fits the date block, from the locale's own full name (Intl, so it follows the language): the part before a
 * hyphen ("quinta-feira" → "quinta"), kept whole up to six letters (Sábado, Monday) and otherwise cut to five with a dot
 * (Thurs., Donne.). Counted in letters as a reader sees them (grapheme clusters), so a script with combining marks is not cut in
 * the middle of one.
 */
const shortWeekday = (name: string, locale: string): string => {
	const letters = Array.from(
		new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(name.split('-')[0].trim()),
		(part) => part.segment
	);
	return letters.length > 6 ? `${letters.slice(0, 5).join('')}.` : letters.join('');
};

/** The day, weekday and month an event starts on, read the way the event feed is (its wall clock, not the viewer's zone). */
const dayParts = (start: number, locale: string) => {
	const d = new Date(start);
	const part = (options: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(d);
	return {
		day: d.getUTCDate(),
		weekday: shortWeekday(part({ weekday: 'long' }), locale),
		// the locale's own abbreviation ("sáb.", "qui.", "Sat", "土"), for the narrowest date block
		weekdayAbbr: part({ weekday: 'short' }),
		month: part({ month: 'short' }),
		monthLong: part({ month: 'long', year: 'numeric' }),
	};
};

const DayRow = ({ day, now }: { day: SpecialDay; now: number }) => {
	const { t } = useTranslation(['home', 'calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const narrow = useMediaQuery(NARROW_SCREEN);
	const wide = useMediaQuery(WIDE_SCREEN);
	const { kind, post } = day;
	const phase = eventPhase(post.startDate, post.endDate, now);
	const when = dayParts(post.startDate, currentLanguage);

	// The species the day is about (the ones that can be caught) that the game master knows, and the ones of them that can be shiny.
	const featured = useMemo(() => {
		const known = new Map<string, boolean>();
		for (const e of post.wild) {
			if (gamemasterPokemon[e.speciesId]) known.set(e.speciesId, (known.get(e.speciesId) ?? false) || !!e.shiny);
		}
		return {
			species: [...known.keys()].map((id) => gamemasterPokemon[id]),
			shiny: new Set([...known].filter(([, canBeShiny]) => canBeShiny).map(([id]) => id)),
		};
	}, [post.wild, gamemasterPokemon]);

	const status =
		phase === 'live'
			? `${t('calendar:events.phase.live')} · ${timeLeft(post.endDate, now)}`
			: phase === 'soon'
				? startsIn(post.startDate, now)
				: t('calendar:events.phase.ended');
	const title = post.title[gl] || post.subtitle[gl] || t('calendar:events.fallbackTitle');
	const bonuses = (post.bonuses[gl] ?? []).slice(0, 2);

	return (
		<li>
			<article className='h-day' data-kind={kind} data-phase={phase}>
				<div className='h-day-date' aria-hidden='true'>
					<span>
						<i className='h-day-wd-long'>{when.weekday}</i>
						<i className='h-day-wd-short'>{when.weekdayAbbr}</i>
					</span>
					<b>{when.day}</b>
					<span>{when.month}</span>
				</div>
				<div className='h-day-body'>
					<div className='h-day-head'>
						<span className='h-day-kind'>
							{t(kind === 'community' ? 'home:days.community' : 'home:days.spotlight')}
						</span>
						<span className='h-day-status' data-phase={phase}>
							{phase === 'live' && <i className='h-dot' aria-hidden='true' />}
							{status}
						</span>
					</div>
					<h3>
						<Link to={R.calendarEvent(post.id)} className='h-stretch'>
							{title}
						</Link>
					</h3>
					<p className='h-day-when'>{dateRange(post.startDate, post.endDate, currentLanguage)}</p>
					{bonuses.length > 0 && (
						<ul className='h-day-bonuses'>
							{bonuses.map((b, i) => (
								<li key={b}>
									<BonusIcons englishText={post.bonuses[GameLanguage.en]?.[i] ?? b} />
									{b}
								</li>
							))}
						</ul>
					)}
				</div>
				{featured.species.length > 0 && (
					<DayHeroes
						pokemon={featured.species}
						shiny={featured.shiny}
						max={wide ? WIDE_HEROES : MID_HEROES}
						rotate={narrow}
						label={featured.species.map((p) => cleanName(p.speciesName)).join(', ')}
					/>
				)}
			</article>
		</li>
	);
};

/**
 * The Community Days and Spotlight Hours of this month and the next, one row each, under the month they fall in: the date,
 * whether it is on right now (or how long until it, or that it is over) and who it features. A single Pokémon comes with the
 * line it can evolve along.
 */
export const CommunityDays = () => {
	const { t } = useTranslation(['home']);
	const { currentLanguage } = useLanguage();
	const { posts, spotlightHours, postsFetchCompleted, spotlightHoursFetchCompleted } = useCalendar();
	// the rows draw the species a day features, so none appear before the species data is in
	const { fetchCompleted: pokemonFetchCompleted } = usePokemon();
	const now = useLiveNow();
	// the window only moves with the month, so the list is built from the first moment of the month, not from the ticking clock
	const monthStart = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
	const days = useMemo(
		() => specialDays(posts, spotlightHours.map(spotlightToPost), monthStart, now),
		[posts, spotlightHours, monthStart, now]
	);
	const months = useMemo(() => {
		const groups: Array<{ label: string; days: Array<SpecialDay> }> = [];
		for (const day of days) {
			const label = dayParts(day.post.startDate, currentLanguage).monthLong;
			const last = groups[groups.length - 1];
			if (last?.label === label) last.days.push(day);
			else groups.push({ label, days: [day] });
		}
		return groups;
	}, [days, currentLanguage]);

	if (!postsFetchCompleted || !spotlightHoursFetchCompleted || !pokemonFetchCompleted || days.length === 0) return null;

	return (
		<section className='h-section' aria-labelledby='h-days'>
			<header className='h-sh'>
				<div>
					<h2 id='h-days'>{t('home:days.title')}</h2>
					<p>{t('home:days.subtitle')}</p>
				</div>
				<Link to={R.calendar('events')} className='h-more'>
					{t('home:now.all')} <span aria-hidden='true'>→</span>
				</Link>
			</header>
			{months.map((group) => (
				<div key={group.label} className='h-days-month'>
					<h3>{group.label}</h3>
					<ul className='h-days'>
						{group.days.map((day) => (
							<DayRow key={day.post.id} day={day} now={now} />
						))}
					</ul>
				</div>
			))}
		</section>
	);
};
