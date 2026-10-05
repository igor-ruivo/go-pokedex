import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg, spriteUrl } from '../../components/Sprite';
import { TeamTabIcon } from '../../components/team-tab-icons';
import { useImageSource } from '../../contexts/imageSource-context';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamRanking } from '../../DTOs/ITeamBuilder';
import { cleanName } from '../../lib/format';
import { randomIndexOtherThan } from '../../lib/home';
import { modeLabel, R } from '../../lib/nav';
import { encodeTeam, TEAM_ROLES } from '../../lib/team-analysis';
import { useLeagueDefinitions } from '../../queries/leagues';
import { usePokemon } from '../../queries/pokemon';
import { useTeamRanking } from '../../queries/teams';
import { roleNames } from '../teams/teams-text';
import { LeaguePlate } from './LeaguePlate';

/** Each league contributes its best fifty teams to the rotation. */
const SAMPLE_PER_LEAGUE = 50;

/** How long a team stays before the next one swipes in. */
const ROTATE_MS = 7000;
const SWIPE_MS = 560;

interface Pick {
	league: string;
	/** Place in the league's list, from 1. */
	rank: number;
	team: RankedTeam;
}

/** Any rated team of any league that has a list: not only the best ones. */
const pickTeam = (ranking: TeamRanking | undefined, not?: Pick): Pick | undefined => {
	const byLeague = ranking?.leagues;
	if (!byLeague) return undefined;
	const ids = Object.keys(byLeague).filter((id) => (byLeague[id]?.byScore.length ?? 0) > 0);
	if (ids.length === 0) return undefined;
	const league = ids[Math.floor(Math.random() * ids.length)];
	const list = (byLeague[league]?.byScore ?? []).slice(0, SAMPLE_PER_LEAGUE);
	const index = randomIndexOtherThan(list.length, not && not.league === league ? not.rank - 1 : undefined);
	return { league, rank: index + 1, team: list[index] };
};

/** Loads (and decodes) the sprites of a team, so that it can swipe in already drawn. Gives up after a moment. */
const preloadTeam = (pick: Pick, urlOf: (speciesId: string) => string | undefined): Promise<void> =>
	new Promise((resolve) => {
		const urls = pick.team.members.map((m) => urlOf(m.speciesId)).filter((u): u is string => !!u);
		const timeout = window.setTimeout(resolve, 2500);
		void Promise.all(
			urls.map((url) => {
				const img = new Image();
				img.src = url;
				return img.decode().catch(() => undefined);
			})
		).then(() => {
			window.clearTimeout(timeout);
			resolve();
			return undefined;
		});
	});

/** One team as the Battle plan draws it: who leads, who is the safe switch, who closes, and the sentence that says so. */
const TeamView = ({
	pick,
	className,
	countdown,
}: {
	pick: Pick;
	className?: string | undefined;
	/** The time left for this team (only the team on show has it). */
	countdown?: { cycle: number; held: boolean } | undefined;
}) => {
	const { t } = useTranslation(['teams', 'home']);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { leagues } = useLeagueDefinitions();
	const names = roleNames(t);

	const members = pick.team.members.map((m, i) => ({ role: TEAM_ROLES[i], pokemon: gamemasterPokemon[m.speciesId] }));
	if (members.some((m) => !m.pokemon)) return null;
	const nameOf = (i: number) => cleanName(members[i].pokemon.speciesName);

	// The translated sentence with each name swapped for a marker, split back apart so the names take their role colour.
	const MARK = (key: string) => `${key}`;
	const sentence = t('teams:plan.summary', {
		lead: MARK('0'),
		switch: MARK('1'),
		closer: MARK('2'),
		interpolation: { escapeValue: false },
	}).split(/([012])/);

	const href = `${R.teams}?league=${pick.league}&t=${encodeURIComponent(encodeTeam(pick.team.members))}`;

	return (
		<Link to={href} className={className ? `h-featured ${className}` : 'h-featured'}>
			<div className='h-trio'>
				{members.map((m, i) => (
					<Fragment key={m.role}>
						{i > 0 && (
							<svg className='h-trio-arrow' viewBox='0 0 40 24' aria-hidden='true'>
								<path d='M4 12h26M23 5l8 7-8 7' />
							</svg>
						)}
						<div className='h-trio-card' data-role={m.role}>
							<span className='h-trio-role'>{names[m.role]}</span>
							<span className='h-trio-art'>
								{m.pokemon.isShadow && <ShadowMark />}
								<SpriteImg pokemon={m.pokemon} loading='lazy' />
							</span>
							<b>{nameOf(i)}</b>
						</div>
					</Fragment>
				))}
			</div>
			{/* the track is always there (empty for the team leaving) so the card never changes height */}
			<span className='h-countdown' aria-hidden='true' data-held={countdown?.held ? '' : undefined}>
				{countdown && <i key={countdown.cycle} style={{ animationDuration: `${ROTATE_MS}ms` }} />}
			</span>
			<p className='h-featured-line'>
				{sentence.map((part, i) =>
					i % 2 === 1 ? (
						<b key={i} className='h-featured-name' data-role={TEAM_ROLES[Number(part)]}>
							{nameOf(Number(part))}
						</b>
					) : (
						<Fragment key={i}>{part}</Fragment>
					)
				)}
			</p>
			<span className='h-featured-chip'>
				<LeaguePlate id={pick.league} small />
				<span>
					{modeLabel(pick.league, gl, leagues)} · #{pick.rank}
				</span>
				<svg viewBox='0 0 24 24' aria-hidden='true'>
					<path d='M9 6l6 6-6 6' />
				</svg>
			</span>
		</Link>
	);
};

/**
 * A rotating showcase: every few seconds the team swipes out to the left and another rated team, from any league, swipes
 * in. It holds still while the pointer or the keyboard is on it or the tab is in the background, and does not move at all
 * for anyone who asked for less motion.
 */
const FeaturedTeam = () => {
	const ranking = useTeamRanking();
	const { gamemasterPokemon } = usePokemon();
	const { imageSource } = useImageSource();
	const urlOf = useCallback(
		(speciesId: string) => {
			const pokemon = gamemasterPokemon[speciesId];
			return pokemon ? spriteUrl(pokemon, imageSource) : undefined;
		},
		[gamemasterPokemon, imageSource]
	);
	const [current, setCurrent] = useState<Pick | undefined>(undefined);
	const [leaving, setLeaving] = useState<Pick | undefined>(undefined);
	const [held, setHeld] = useState(false);
	// restarts the countdown bar with each new team
	const [cycle, setCycle] = useState(0);
	const rotated = useRef(false);
	const currentRef = useRef<Pick | undefined>(undefined);
	currentRef.current = current;

	// the first team, as soon as the ranking is in
	useEffect(() => {
		if (!current && ranking.data) setCurrent(pickTeam(ranking.data));
	}, [ranking.data, current]);

	// The next team is chosen and its sprites loaded as soon as the current one lands, so it is ready well before the bar runs out.
	const upcoming = useRef<{ pick: Pick; ready: Promise<void> } | undefined>(undefined);
	useEffect(() => {
		if (!current || !ranking.data) return;
		const pick = pickTeam(ranking.data, current);
		upcoming.current = pick && { pick, ready: preloadTeam(pick, urlOf) };
	}, [current, ranking.data, urlOf]);

	// What is left of the current team's time. Holding the team (pointer or focus) stops the clock where it is, and letting go
	// carries on from there — it is not restarted. The clock (and the bar, which remounts with the team) only start over at the
	// very moment the next team is brought in, never before.
	const remaining = useRef(ROTATE_MS);
	const startedAt = useRef(0);
	const swapping = useRef(false);
	useEffect(() => {
		if (!ranking.data || held || !current) return;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let timer = 0;
		let expired = false;
		const tick = () => {
			const next = upcoming.current;
			if (document.hidden || !next) {
				timer = window.setTimeout(tick, 500);
				return;
			}
			if (swapping.current) return;
			expired = true;
			swapping.current = true;
			remaining.current = 0;
			// the next team's sprites are already in (or nearly): it swipes in, and the bar starts over, at this very moment
			void next.ready.then(() => {
				swapping.current = false;
				rotated.current = true;
				remaining.current = ROTATE_MS;
				setLeaving(reduced ? undefined : currentRef.current);
				setCurrent(next.pick);
				setCycle((c) => c + 1);
				if (!reduced) window.setTimeout(() => setLeaving(undefined), SWIPE_MS);
				return undefined;
			});
		};
		startedAt.current = performance.now();
		timer = window.setTimeout(tick, remaining.current);
		return () => {
			window.clearTimeout(timer);
			// held (or unmounted): remember how much of the time is left
			if (!expired) remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
		};
	}, [ranking.data, held, current]);

	if (!current) {
		return (
			<div className='h-trio' aria-hidden='true'>
				{TEAM_ROLES.map((role) => (
					<span key={role} className='h-skeleton h-trio-skeleton' />
				))}
			</div>
		);
	}

	return (
		<div className='h-rotator'>
			<div
				className='h-swap'
				onMouseEnter={() => setHeld(true)}
				onMouseLeave={() => setHeld(false)}
				onFocus={() => setHeld(true)}
				onBlur={() => setHeld(false)}
			>
				{leaving && <TeamView key={`${leaving.league}-${leaving.rank}`} pick={leaving} className='h-featured--out' />}
				<TeamView
					key={`${current.league}-${current.rank}`}
					pick={current}
					className={rotated.current ? 'h-featured--in' : undefined}
					countdown={{ cycle, held }}
				/>
			</div>
		</div>
	);
};

export const TeamLab = () => {
	const { t } = useTranslation(['home', 'teams']);
	const links = [
		{ to: R.teams, label: t('teams:page.builderTab'), id: 'builder' as const },
		{ to: R.teamsTop, label: t('teams:page.topTab'), id: 'top' as const },
		{ to: R.teamsCollection, label: t('teams:page.collectionTab'), id: 'collection' as const },
		{ to: R.teamsFavorites, label: t('teams:page.favoritesTab'), id: 'favorites' as const },
	];
	return (
		<section className='h-lab' aria-labelledby='h-lab'>
			<div className='h-lab-copy'>
				<span className='h-eyebrow h-eyebrow--quiet'>{t('home:teams.title')}</span>
				<h2 id='h-lab'>{t('home:teams.headline')}</h2>
				<p>{t('home:teams.body')}</p>
				<ul className='h-lab-links'>
					{links.map((l) => (
						<li key={l.to}>
							<Link to={l.to} className='h-chip'>
								<span className='h-chip-ico'>
									<TeamTabIcon id={l.id} size={20} />
								</span>
								{l.label}
							</Link>
						</li>
					))}
				</ul>
			</div>
			<FeaturedTeam />
		</section>
	);
};
