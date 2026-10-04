import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { BallMark, BrandMark } from '../components/BrandMark';
import { SpriteImg } from '../components/Sprite';
import { useLanguage } from '../contexts/language-context';
import type { IPostEntry } from '../DTOs/INews';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { useLiveNow } from '../hooks/useLiveNow';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { cleanName, dateRange } from '../lib/format';
import { distinctSpecies, eventHighlights, featuredEvents, type HighlightKind, topRanked } from '../lib/home';
import { leagueIcon } from '../lib/league-visuals';
import { modeColor, modeLabel, R } from '../lib/nav';
import { spotlightToPost } from '../lib/calendar-events';
import { useCalendar } from '../queries/calendar';
import { useLeagueDefinitions } from '../queries/leagues';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';

const KIND_ICON: Record<HighlightKind, string> = {
	raids: '/images/raids/tier-5.png',
	wild: '/images/nav/spawns-grass.png',
	researches: '/images/nav/research.png',
	eggs: '/images/eggs/10km.png',
};

const FEATURED_LIMIT = 5;

// Same fallbacks the Rankings league picker uses when a league has no icon of its own.
const LEAGUE_FALLBACK_ICON = {
	great: '/images/leagues/cups/pogo_great_league.png',
	ultra: '/images/leagues/cups/pogo_ultra_league.png',
	master: '/images/leagues/cups/pogo_master_league.png',
} as const;

/** A round sprite, the unit all the little "this brings these Pokémon" hints are made of. */
const Avatar = ({ pokemon, rank }: { pokemon: IGamemasterPokemon; rank?: number }) => (
	<span className='r-ctr-art h-avatar' title={cleanName(pokemon.speciesName)}>
		<SpriteImg pokemon={pokemon} loading='lazy' />
		{rank !== undefined && <i className='h-avatar-rank'>{rank}</i>}
	</span>
);

/** Overlapping avatars of a few species, with how many more there are. */
const AvatarStack = ({
	ids,
	more = 0,
	pokemon,
}: {
	ids: ReadonlyArray<string>;
	more?: number;
	pokemon: Record<string, IGamemasterPokemon>;
}) => (
	<span className='h-stack'>
		{ids.map((id) => (pokemon[id] ? <Avatar key={id} pokemon={pokemon[id]} /> : null))}
		{more > 0 && <i className='h-stack-more'>+{more}</i>}
	</span>
);

const EventCard = ({
	post,
	big,
	pokemon,
	now,
}: {
	post: IPostEntry;
	big: boolean;
	pokemon: Record<string, IGamemasterPokemon>;
	now: number;
}) => {
	const { t } = useTranslation(['home', 'calendar']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const live = post.startDate <= now;
	const title = post.title[gl] || post.subtitle[gl] || t('calendar:events.fallbackTitle');
	const highlights = eventHighlights(post, (id) => !!pokemon[id], big ? 4 : 3);
	const label = (kind: HighlightKind) => {
		switch (kind) {
			case 'raids':
				return t('home:now.raids');
			case 'wild':
				return t('home:now.wild');
			case 'researches':
				return t('home:now.researches');
			default:
				return t('home:now.eggs');
		}
	};
	// With no picture of its own the card shows a few of what it brings, large, on its gradient.
	const fallbackIds = post.imageUrl ? [] : highlights.flatMap((h) => h.ids).slice(0, 3);
	return (
		<article className='h-event' data-big={big ? '' : undefined} data-live={live ? '' : undefined}>
			{post.imageUrl ? (
				<img className='h-event-img' src={post.imageUrl} alt='' loading='lazy' />
			) : (
				<span className='h-event-fallback' aria-hidden='true'>
					{fallbackIds.map((id) => (pokemon[id] ? <SpriteImg key={id} pokemon={pokemon[id]} loading='lazy' /> : null))}
				</span>
			)}
			<span className='h-event-scrim' aria-hidden='true' />
			<div className='h-event-body'>
				<span className='h-pill' data-live={live ? '' : undefined}>
					{live && <i className='h-dot' aria-hidden='true' />}
					{live ? t('home:now.live') : dateRange(post.startDate, post.endDate, currentLanguage)}
				</span>
				<h3>
					<Link to={R.calendar('events')} className='h-stretch'>
						{title}
					</Link>
				</h3>
				{live && <p className='h-event-when'>{dateRange(post.startDate, post.endDate, currentLanguage)}</p>}
				{highlights.length > 0 && (
					<ul className='h-highlights'>
						{highlights.map((h) => (
							<li key={h.kind}>
								<img src={KIND_ICON[h.kind]} alt='' title={label(h.kind)} loading='lazy' />
								<span className='h-sr'>{label(h.kind)}</span>
								<AvatarStack ids={h.ids} more={h.more} pokemon={pokemon} />
							</li>
						))}
					</ul>
				)}
			</div>
		</article>
	);
};

const Skeleton = ({ className }: { className: string }) => <span className={`h-skeleton ${className}`} aria-hidden='true' />;

const Home = () => {
	const { t } = useTranslation(['home', 'calendar', 'common', 'teams', 'rankings', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const now = useLiveNow();
	const unseenEvents = useUnseenEventsCount();
	const { gamemasterPokemon, fetchCompleted: pokemonReady } = usePokemon();
	const calendar = useCalendar();
	const { leagues } = useLeagueDefinitions();
	const { rankLists } = usePvp();

	const events = useMemo(() => {
		if (!calendar.postsFetchCompleted) return [];
		const all = [...calendar.posts, ...(calendar.spotlightHoursFetchCompleted ? calendar.spotlightHours.map(spotlightToPost) : [])];
		return featuredEvents(all, now, gl, FEATURED_LIMIT, calendar.season?.id);
	}, [calendar.posts, calendar.spotlightHours, calendar.postsFetchCompleted, calendar.spotlightHoursFetchCompleted, calendar.season, now, gl]);

	const known = (id: string) => !!gamemasterPokemon[id];
	const right = [
		{
			to: R.calendar('bosses'),
			icon: '/images/raids/tier-5.png',
			title: t('calendar:tabs.bosses'),
			hint: t('home:right.bosses'),
			ids: distinctSpecies(calendar.currentBosses, known, 4),
			ready: calendar.currentBossesFetchCompleted,
		},
		{
			to: R.calendar('spawns'),
			icon: '/images/nav/spawns-grass.png',
			title: t('calendar:tabs.spawns'),
			hint: t('home:right.spawns'),
			ids: distinctSpecies(
				events.flatMap((e) => e.wild),
				known,
				4
			),
			ready: calendar.postsFetchCompleted,
		},
		{
			to: R.calendar('rockets'),
			icon: '/images/NPC/male-grunt.webp',
			title: t('calendar:tabs.rockets'),
			hint: t('home:right.rockets'),
			ids: distinctSpecies(
				calendar.currentRockets.flatMap((g) => g.tier1.map((speciesId) => ({ speciesId }))),
				known,
				4
			),
			ready: calendar.currentRocketsFetchCompleted,
		},
		{
			to: R.calendar('eggs'),
			icon: '/images/eggs/10km.png',
			title: t('calendar:tabs.eggs'),
			hint: t('home:right.eggs'),
			ids: distinctSpecies(calendar.currentEggs, known, 4),
			ready: calendar.currentEggsFetchCompleted,
		},
	];

	const leagueTiles = (['great', 'ultra', 'master'] as const).map((mode, i) => ({
		mode,
		top: topRanked(rankLists[i] ?? {}, 3),
	}));

	const teamLinks = [
		{ to: R.teams, label: t('teams:page.builderTab'), icon: '/images/leagues/great.png' },
		{ to: R.teamsTop, label: t('teams:page.topTab'), icon: '/images/leagues/master.png' },
		{ to: R.teamsCollection, label: t('teams:page.collectionTab'), icon: '/images/nav/pokemon-storage.png' },
		{ to: R.teamsFavorites, label: t('teams:page.favoritesTab'), icon: '/images/nav/rankings.webp' },
	];
	const trio = topRanked(rankLists[0] ?? {}, 3);

	return (
		<div className='h-page'>
			<section className='h-hero'>
				<div className='h-lockup'>
					<BrandMark animate label={t('common:app.name')} className='h-hero-mark' />
					<span className='h-lockup-word' aria-hidden='true'>
						Pokédex
					</span>
				</div>
				<p className='h-eyebrow'>{t('home:hero.eyebrow')}</p>
				<h1>{t('home:hero.title')}</h1>
				<p className='h-lede'>{t('home:hero.subtitle')}</p>
				<nav className='h-dock' aria-label={t('common:app.name')}>
					<Link to={R.teams} className='h-dock-item'>
						<img src='/images/nav/rankings.webp' alt='' />
						<span>{t('home:hero.ctaTeams')}</span>
					</Link>
					<Link to={R.teamsCollection} className='h-dock-item'>
						<img src='/images/nav/pokemon-storage.png' alt='' />
						<span>{t('home:hero.ctaRegister')}</span>
					</Link>
					<Link to={R.rankings('great')} className='h-dock-item'>
						<span className='h-dock-icon h-dock-medal'>
							<img src='/images/nav/leagues.png' alt='' />
							<BallMark className='h-dock-ball' />
						</span>
						<span>{t('pokemonDetail:tabs.ranks')}</span>
					</Link>
					<Link to={R.calendar()} className='h-dock-item'>
						<span className='h-dock-icon'>
							<img src='/images/nav/calendar.png' alt='' />
							{unseenEvents > 0 && (
								<i className='h-dock-badge' aria-label={t('common:nav.calendarBadge', { label: t('common:nav.calendar.label'), count: unseenEvents })}>
									{unseenEvents > 9 ? '9+' : unseenEvents}
								</i>
							)}
						</span>
						<span>{t('common:nav.calendar.label')}</span>
					</Link>
					<Link to={R.pokedex} className='h-dock-item'>
						<img src='/images/nav/pokedex.png' alt='' />
						<span>Pokédex</span>
					</Link>
					<Link to={R.moves} className='h-dock-item'>
						<img src='/images/nav/moves.png' alt='' />
						<span>{t('common:nav.moves.label')}</span>
					</Link>
				</nav>
			</section>

			<section className='h-section' aria-labelledby='h-now'>
				<header className='h-sh'>
					<div>
						<h2 id='h-now'>{t('home:now.title')}</h2>
						<p>{t('home:now.subtitle')}</p>
					</div>
					<Link to={R.calendar('events')} className='h-more'>
						{t('home:now.all')} <span aria-hidden='true'>→</span>
					</Link>
				</header>
				{!calendar.postsFetchCompleted || !pokemonReady ? (
					<div className='h-events'>
						<Skeleton className='h-skeleton--big' />
						<Skeleton className='' />
						<Skeleton className='' />
					</div>
				) : events.length === 0 ? (
					<p className='r-muted'>{t('home:now.empty')}</p>
				) : (
					<div className='h-events'>
						{events.map((post, i) => (
							<EventCard key={post.id} post={post} big={i === 0} pokemon={gamemasterPokemon} now={now} />
						))}
					</div>
				)}
			</section>

			<section className='h-section' aria-labelledby='h-right'>
				<header className='h-sh'>
					<div>
						<h2 id='h-right'>{t('home:right.title')}</h2>
					</div>
				</header>
				<div className='h-tiles h-tiles--4'>
					{right.map((tile) => (
						<div className='h-tile' key={tile.to}>
							<img className='h-tile-icon' src={tile.icon} alt='' loading='lazy' />
							<h3>
								<Link to={tile.to} className='h-stretch'>
									{tile.title}
								</Link>
							</h3>
							<p>{tile.hint}</p>
							<span className='h-tile-foot'>
								{tile.ready ? (
									<AvatarStack ids={tile.ids} pokemon={gamemasterPokemon} />
								) : (
									<Skeleton className='h-skeleton--row' />
								)}
							</span>
						</div>
					))}
				</div>
			</section>

			<section className='h-section' aria-labelledby='h-ranks'>
				<header className='h-sh'>
					<div>
						<h2 id='h-ranks'>{t('home:ranks.title')}</h2>
						<p>{t('home:ranks.subtitle')}</p>
					</div>
				</header>
				<div className='h-tiles h-tiles--3'>
					{leagueTiles.map(({ mode, top }) => (
						<div className='h-tile h-tile--league' key={mode} style={{ ['--lg' as string]: modeColor(mode) } as CSSProperties}>
							<img className='h-tile-icon h-tile-icon--lg' src={leagueIcon(mode) ?? LEAGUE_FALLBACK_ICON[mode]} alt='' loading='lazy' />
							<h3>
								<Link to={R.rankings(mode)} className='h-stretch'>
									{modeLabel(mode, gl, leagues)}
								</Link>
							</h3>
							<ol className='h-top' aria-label={t('home:ranks.top')}>
								{top.length === 0
									? [0, 1, 2].map((i) => (
											<li key={i}>
												<Skeleton className='h-skeleton--avatar' />
											</li>
										))
									: top.map((id, i) =>
											gamemasterPokemon[id] ? (
												<li key={id}>
													<Link to={R.pokemon(id)} className='h-top-link'>
														<Avatar pokemon={gamemasterPokemon[id]} rank={i + 1} />
														<span>{cleanName(gamemasterPokemon[id].speciesName)}</span>
													</Link>
												</li>
											) : null
										)}
							</ol>
						</div>
					))}
				</div>
				<div className='h-tiles h-tiles--2 h-tiles--tight'>
					<div className='h-tile h-tile--row' style={{ ['--lg' as string]: modeColor('raid') } as CSSProperties}>
						<img className='h-tile-icon' src='/images/raids/tier-5.png' alt='' loading='lazy' />
						<div>
							<h3>
								<Link to={R.rankings('raid')} className='h-stretch'>
									{modeLabel('raid', gl, leagues)}
								</Link>
							</h3>
							<p>{t('home:ranks.raid')}</p>
						</div>
					</div>
					<div className='h-tile h-tile--row' style={{ ['--lg' as string]: modeColor('pokedex') } as CSSProperties}>
						<img className='h-tile-icon' src='/images/nav/pokedex.png' alt='' loading='lazy' />
						<div>
							<h3>
								<Link to={R.pokedex} className='h-stretch'>
									{modeLabel('pokedex', gl, leagues)}
								</Link>
							</h3>
							<p>{t('home:ranks.pokedex')}</p>
						</div>
					</div>
				</div>
			</section>

			<section className='h-lab' aria-labelledby='h-lab'>
				<div className='h-lab-copy'>
					<span className='h-eyebrow h-eyebrow--quiet'>{t('home:teams.title')}</span>
					<h2 id='h-lab'>{t('home:teams.headline')}</h2>
					<p>{t('home:teams.body')}</p>
					<ul className='h-lab-links'>
						{teamLinks.map((l) => (
							<li key={l.to}>
								<Link to={l.to} className='h-chip'>
									<img src={l.icon} alt='' loading='lazy' />
									{l.label}
								</Link>
							</li>
						))}
					</ul>
				</div>
				<div className='h-lab-art' aria-hidden='true'>
					{trio.map((id, i) =>
						gamemasterPokemon[id] ? (
							<span className='h-lab-mon' key={id} data-i={i}>
								<SpriteImg pokemon={gamemasterPokemon[id]} loading='lazy' />
							</span>
						) : null
					)}
				</div>
			</section>

			<section className='h-section' aria-labelledby='h-tools'>
				<header className='h-sh'>
					<div>
						<h2 id='h-tools'>{t('home:tools.title')}</h2>
					</div>
				</header>
				<div className='h-tiles h-tiles--3'>
					<div className='h-tile h-tile--row h-tile--wide'>
						<img className='h-tile-icon' src='/images/nav/search-strings.svg' alt='' loading='lazy' />
						<div>
							<h3>
								<Link to={R.searchStrings()} className='h-stretch'>
									{t('common:nav.searches.label')}
								</Link>
							</h3>
							<p>{t('home:tools.searchesPitch')}</p>
						</div>
					</div>
					<div className='h-tile h-tile--row'>
						<img className='h-tile-icon' src='/images/nav/moves.png' alt='' loading='lazy' />
						<div>
							<h3>
								<Link to={R.moves} className='h-stretch'>
									{t('common:nav.moves.label')}
								</Link>
							</h3>
							<p>{t('common:nav.moves.hint')}</p>
						</div>
					</div>
					<div className='h-tile h-tile--row'>
						<img className='h-tile-icon' src='/images/types/psychic.png' alt='' loading='lazy' />
						<div>
							<h3>
								<Link to={R.types} className='h-stretch'>
									{t('common:nav.types.label')}
								</Link>
							</h3>
							<p>{t('common:nav.types.hint')}</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Home;
