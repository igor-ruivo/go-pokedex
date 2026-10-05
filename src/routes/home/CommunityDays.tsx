import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { BonusIcons } from '../../components/BonusBullet';
import { GameLanguage, useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useLiveNow } from '../../hooks/useLiveNow';
import { spotlightToPost } from '../../lib/calendar-events';
import { baseForm, reachableLine, type SpecialDay, specialDays } from '../../lib/community-days';
import { startsIn, timeLeft } from '../../lib/event-timing';
import { cleanName, dateRange, eventPhase } from '../../lib/format';
import { R } from '../../lib/nav';
import { useCalendar } from '../../queries/calendar';
import { usePokemon } from '../../queries/pokemon';
import { EvolutionChips } from './EvolutionChips';

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
		month: part({ month: 'short' }),
		monthLong: part({ month: 'long', year: 'numeric' }),
	};
};

const DayRow = ({ day, now }: { day: SpecialDay; now: number }) => {
	const { t } = useTranslation(['home', 'calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { kind, post } = day;
	const phase = eventPhase(post.startDate, post.endDate, now);
	const when = dayParts(post.startDate, currentLanguage);

	// The featured species the game master knows: a single one comes with the line it can evolve along, several are shown by their first stage.
	const featured = useMemo(() => {
		const known = new Map<string, boolean>();
		for (const e of post.wild) {
			if (gamemasterPokemon[e.speciesId]) known.set(e.speciesId, (known.get(e.speciesId) ?? false) || !!e.shiny);
		}
		const species = [...known.keys()].map((id) => gamemasterPokemon[id]);
		if (species.length === 1) {
			const [only] = species;
			const members = reachableLine(only, gamemasterPokemon);
			// when the featured one can be shiny, so can everything it evolves into
			return { species, members, shiny: new Set(known.get(only.speciesId) ? members.map((m) => m.speciesId) : []) };
		}
		// several featured: just the first stage of each, once
		const bases = new Map<string, IGamemasterPokemon>();
		const shiny = new Set<string>();
		for (const p of species) {
			const base = baseForm(p, gamemasterPokemon);
			bases.set(base.speciesId, base);
			if (known.get(p.speciesId)) shiny.add(base.speciesId);
		}
		return { species, members: [...bases.values()], shiny };
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
					<span>{when.weekday}</span>
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
				{featured.members.length > 0 && (
					<div className='h-day-mons'>
						<EvolutionChips
							members={featured.members}
							current={featured.species.length === 1 ? featured.species[0] : undefined}
							shiny={featured.shiny}
							label={featured.species.map((p) => cleanName(p.speciesName)).join(', ')}
						/>
					</div>
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
	const now = useLiveNow();
	const month = new Date(now).getUTCMonth();

	// the window only moves with the month, so a tick of the clock must not rebuild the list
	const nowRef = useRef(now);
	nowRef.current = now;
	const days = useMemo(
		() => specialDays(posts, spotlightHours.map(spotlightToPost), nowRef.current),
		[posts, spotlightHours, month]
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

	if (!postsFetchCompleted || !spotlightHoursFetchCompleted || days.length === 0) return null;

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
