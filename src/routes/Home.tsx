import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AdornedSprite } from '../components/AdornedSprite';
import { BrandMark } from '../components/BrandMark';
import { CollectionIcon, TeamBuilderIcon } from '../components/NavIcons';
import { RaidIcon } from '../components/RaidIcon';
import { TeamTabIcon } from '../components/team-tab-icons';
import { useLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IPostEntry } from '../DTOs/INews';
import { useLiveNow } from '../hooks/useLiveNow';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { leekduckPosts, nowRaidEntries, spotlightToPost } from '../lib/calendar-events';
import { isCommunityDay } from '../lib/community-days';
import { dateRange } from '../lib/format';
import {
	catchableRocketEntries,
	eventHighlights,
	facesThatFit,
	featuredEvents,
	type HighlightKind,
	homeRaidEntries,
	orderedEggEntries,
	speciesWithShiny,
} from '../lib/home';
import { R } from '../lib/nav';
import { useCalendar } from '../queries/calendar';
import { usePokemon } from '../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { CommunityDays } from './home/CommunityDays';
import { faceStep, useFaceLayout } from './home/face-layout';
import { LeagueCards } from './home/LeagueCards';
import { PokeAvatar } from './home/PokeAvatar';
import { PokemonSpotlight } from './home/PokemonSpotlight';
import { RaidAttackers } from './home/RaidAttackers';
import { TeamLab } from './home/TeamLab';

const KIND_ICON: Record<HighlightKind, string> = {
	raids: '/images/raids/tier-5.png',
	maxBattles: '/images/nav/max-battle.webp',
	wild: '/images/nav/spawns-grass.png',
	researches: '/images/nav/research.png',
	eggs: '/images/eggs/10km.png',
};

const FEATURED_LIMIT = 5;

/** One row: as many overlapping round sprites as fit the width (never more than nine), the shiny ones marked, and a "+N" at the end. */
const Faces = ({
	all,
	pokemon,
	shadow,
}: {
	all: ReadonlyArray<{ speciesId: string; shiny: boolean; kind?: string | undefined }>;
	pokemon: Record<string, IGamemasterPokemon>;
	shadow?: boolean | undefined;
}) => {
	const [ref, layout] = useFaceLayout<HTMLSpanElement>();
	const known = all.filter((e) => !!pokemon[e.speciesId]);
	const { faces, more } = facesThatFit(known.length, layout.count, 1, 9);
	// what is shown is spread over the whole width, so the row ends where its parent does
	const step = faceStep(layout, faces + (more > 0 ? 1 : 0));
	return (
		<span
			className='h-faces'
			ref={ref}
			style={{ ['--face' as string]: `${layout.size}px`, ['--face-step' as string]: `${step}px` }}
		>
			{known.slice(0, faces).map((e) => (
				<PokeAvatar key={e.speciesId} pokemon={pokemon[e.speciesId]} shiny={e.shiny} shadow={shadow} maxForm={e.kind} />
			))}
			{more > 0 && <i className='h-stack-more'>+{more}</i>}
		</span>
	);
};

/** Overlapping avatars of a few species, with how many more there are. */
const AvatarStack = ({
	ids,
	more = 0,
	pokemon,
	shiny,
	forms,
}: {
	ids: ReadonlyArray<string>;
	more?: number;
	pokemon: Record<string, IGamemasterPokemon>;
	/** The species that can be shiny (a Shadow one carries its mark by itself). */
	shiny?: ReadonlySet<string> | undefined;
	/** The Max form (Dynamax or Gigantamax) of the species that are Max Battle Pokémon. */
	forms?: ReadonlyMap<string, string | undefined> | undefined;
}) => (
	<span className='h-stack'>
		{ids.map((id) =>
			pokemon[id] ? <PokeAvatar key={id} pokemon={pokemon[id]} shiny={shiny?.has(id)} maxForm={forms?.get(id)} /> : null
		)}
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
			case 'maxBattles':
				return gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl);
			case 'wild':
				return t('home:now.wild');
			case 'researches':
				return t('home:now.researches');
			default:
				return t('home:now.eggs');
		}
	};
	// With no picture of its own the card shows a few of what it brings, large, on its gradient. A Spotlight Hour has its promo
	// picture and shows its featured Pokémon on top of it (as the Events view does) instead of listing them below.
	const spotlight = !!post.isSpotlight;
	// A Max Monday (a day of Max Battles led by Dynamax Pokémon) does the same: its Pokémon is a chip in the middle of its picture,
	// with the Dynamax cloud.
	const maxMonday = !spotlight && post.source === 'leekduck' && (post.maxBattles?.length ?? 0) > 0;
	// a Community Day is its featured Pokémon: no row of chips to say what it brings
	const communityDay = isCommunityDay(post);
	const maxForms = new Map((post.maxBattles ?? []).map((e) => [e.speciesId, e.kind]));
	const shinyIds = new Set(
		[...post.wild, ...post.raids, ...post.eggs, ...post.researches, ...(post.maxBattles ?? [])]
			.filter((e) => e.shiny)
			.map((e) => e.speciesId)
	);
	const spriteIds = spotlight
		? [...new Set(post.wild.map((e) => e.speciesId))].filter((id) => !!pokemon[id]).slice(0, 3)
		: maxMonday
			? [...maxForms.keys()].filter((id) => !!pokemon[id]).slice(0, 3)
			: post.imageUrl
				? []
				: highlights.flatMap((h) => h.ids).slice(0, 3);
	return (
		<article
			className='h-event'
			data-big={big ? '' : undefined}
			data-live={live ? '' : undefined}
			data-spotlight={spotlight ? '' : undefined}
			data-maxday={maxMonday ? '' : undefined}
		>
			{post.imageUrl && <img className='h-event-img' src={post.imageUrl} alt='' loading='lazy' />}
			{spriteIds.length > 0 && (
				<span className='h-event-fallback' aria-hidden='true' data-count={spriteIds.length}>
					{spriteIds.map((id) => {
						if (!pokemon[id]) return null;
						return spotlight || maxMonday ? (
							<PokeAvatar key={id} pokemon={pokemon[id]} shiny={shinyIds.has(id)} maxForm={maxForms.get(id)} />
						) : (
							<AdornedSprite key={id} pokemon={pokemon[id]} shiny={shinyIds.has(id)} />
						);
					})}
				</span>
			)}
			<span className='h-event-scrim' aria-hidden='true' />
			<div className='h-event-body'>
				<span className='h-pill' data-live={live ? '' : undefined}>
					{live && <i className='h-dot' aria-hidden='true' />}
					{live ? t('home:now.live') : dateRange(post.startDate, post.endDate, currentLanguage)}
				</span>
				<h3>
					<Link to={R.calendarEvent(post.id)} className='h-stretch'>
						{title}
					</Link>
				</h3>
				{live && <p className='h-event-when'>{dateRange(post.startDate, post.endDate, currentLanguage)}</p>}
				{highlights.length > 0 && !spotlight && !maxMonday && !communityDay && (
					<ul className='h-highlights'>
						{highlights.map((h) => (
							<li key={h.kind}>
								<img src={KIND_ICON[h.kind]} alt='' title={label(h.kind)} loading='lazy' />
								<span className='h-sr'>{label(h.kind)}</span>
								<AvatarStack
									ids={h.ids}
									more={h.more}
									pokemon={pokemon}
									shiny={new Set((post[h.kind] ?? []).filter((e) => e.shiny).map((e) => e.speciesId))}
									forms={
										h.kind === 'maxBattles'
											? new Map((post.maxBattles ?? []).map((e) => [e.speciesId, e.kind]))
											: undefined
									}
								/>
							</li>
						))}
					</ul>
				)}
			</div>
		</article>
	);
};

const Skeleton = ({ className }: { className: string }) => (
	<span className={`h-skeleton ${className}`} aria-hidden='true' />
);

const Home = () => {
	const { t } = useTranslation(['home', 'calendar', 'common', 'teams', 'rankings', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const now = useLiveNow();
	const unseenEvents = useUnseenEventsCount();
	const { gamemasterPokemon, fetchCompleted: pokemonReady } = usePokemon();
	const calendar = useCalendar();

	const events = useMemo(() => {
		if (!calendar.postsFetchCompleted) return [];
		const all = [
			...calendar.posts,
			...(calendar.spotlightHoursFetchCompleted ? leekduckPosts(calendar.spotlightHours, calendar.maxMondays) : []),
		];
		return featuredEvents(all, now, gl, FEATURED_LIMIT, calendar.season?.id);
	}, [
		calendar.posts,
		calendar.spotlightHours,
		calendar.maxMondays,
		calendar.postsFetchCompleted,
		calendar.spotlightHoursFetchCompleted,
		calendar.season,
		now,
		gl,
	]);

	// the same bosses as the Raids tab's "Now": the rotation plus every event or special window that is on
	const nowRaids = useMemo(
		() =>
			nowRaidEntries({
				posts: [...calendar.posts, ...calendar.spotlightHours.map(spotlightToPost)],
				specialBosses: calendar.specialBosses,
				currentBosses: calendar.currentBosses,
				language: gl,
				now,
			}),
		[calendar.posts, calendar.spotlightHours, calendar.specialBosses, calendar.currentBosses, gl, now]
	);
	const known = (id: string) => !!gamemasterPokemon[id];
	const right = [
		{
			to: R.calendar('spawns'),
			icon: '/images/nav/spawns-grass.png',
			title: t('calendar:tabs.spawns'),
			hint: t('home:right.spawns'),
			...speciesWithShiny(
				events.flatMap((e) => e.wild),
				known,
				Infinity
			),
			shadow: false,
			ready: calendar.postsFetchCompleted,
		},
		{
			to: R.calendar('bosses'),
			icon: '/images/raids/tier-5.png',
			title: t('calendar:tabs.bosses'),
			hint: t('home:right.bosses'),
			...speciesWithShiny(
				homeRaidEntries(nowRaids, (id) => !!gamemasterPokemon[id]?.isShadow),
				known,
				Infinity
			),
			shadow: false,
			ready:
				calendar.currentBossesFetchCompleted && calendar.postsFetchCompleted && calendar.specialBossesFetchCompleted,
		},
		{
			to: R.calendar('max'),
			icon: '/images/nav/max-battle.webp',
			title: gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl),
			hint: t('home:right.max'),
			// the highest tiers first: the faces that fit are the hardest bosses
			...speciesWithShiny(
				[...calendar.currentMaxBattles].sort((x, y) => Number(y.tier ?? 0) - Number(x.tier ?? 0)),
				known,
				Infinity
			),
			shadow: false,
			ready: calendar.currentMaxBattlesFetchCompleted,
		},
		{
			to: R.calendar('rockets'),
			icon: '/images/NPC/male-grunt.webp',
			title: t('calendar:tabs.rockets'),
			hint: t('home:right.rockets'),
			...speciesWithShiny(catchableRocketEntries(calendar.currentRockets), known, Infinity),
			shadow: true,
			ready: calendar.currentRocketsFetchCompleted,
		},
		{
			to: R.calendar('eggs'),
			icon: '/images/eggs/10km.png',
			title: t('calendar:tabs.eggs'),
			hint: t('home:right.eggs'),
			...speciesWithShiny(orderedEggEntries(calendar.currentEggs), known, Infinity),
			shadow: false,
			ready: calendar.currentEggsFetchCompleted,
		},
	];

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
					<Link to={R.pokedex} className='h-dock-item'>
						<span className='h-dock-art'>
							<img src='/images/nav/pokedex.png' alt='' />
						</span>
						<span>Pokédex</span>
					</Link>
					<Link to={R.teamsCollection} className='h-dock-item'>
						<span className='h-dock-art'>
							<CollectionIcon />
						</span>
						<span>{t('home:hero.ctaRegister')}</span>
					</Link>
					<Link to={R.rankings('great')} className='h-dock-item'>
						<span className='h-dock-art'>
							<img src='/images/nav/rankings.webp' alt='' />
						</span>
						<span>{t('home:hero.ctaPvp')}</span>
					</Link>
					<Link to={R.rankings('raid')} className='h-dock-item'>
						<span className='h-dock-art'>
							<RaidIcon />
						</span>
						<span>{t('home:hero.ctaRaid')}</span>
					</Link>
					<Link to={R.teams} className='h-dock-item'>
						<span className='h-dock-art'>
							<TeamBuilderIcon />
						</span>
						<span>{t('home:hero.ctaTeams')}</span>
					</Link>
					<Link to={R.calendar()} className='h-dock-item'>
						<span className='h-dock-art'>
							<img src='/images/nav/calendar.png' alt='' />
							{unseenEvents > 0 && (
								<i
									className='h-dock-badge'
									aria-label={t('common:nav.calendarBadge', {
										label: t('common:nav.calendar.label'),
										count: unseenEvents,
									})}
								>
									{unseenEvents > 9 ? '9+' : unseenEvents}
								</i>
							)}
						</span>
						<span>{t('calendar:tabs.events')}</span>
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
				<div className='h-tiles h-tiles--5'>
					{right.map((tile) => (
						<div className='h-tile' key={tile.to}>
							<span className='h-tile-icon'>
								<img src={tile.icon} alt='' loading='lazy' />
							</span>
							<h3>
								<Link to={tile.to} className='h-stretch'>
									{tile.title}
								</Link>
							</h3>
							<p>{tile.hint}</p>
							<span className='h-tile-foot'>
								{tile.ready ? (
									<Faces all={tile.shown} pokemon={gamemasterPokemon} shadow={tile.shadow} />
								) : (
									<Skeleton className='h-skeleton--row' />
								)}
							</span>
						</div>
					))}
				</div>
			</section>

			<CommunityDays />

			<PokemonSpotlight />

			<TeamLab />

			<section className='h-section' aria-labelledby='h-ranks'>
				<header className='h-sh'>
					<div>
						<h2 id='h-ranks'>{t('home:ranks.title')}</h2>
						<p>{t('home:ranks.subtitle')}</p>
					</div>
				</header>
				<LeagueCards />
			</section>

			<RaidAttackers />

			<section className='h-section' aria-labelledby='h-tools'>
				<header className='h-sh'>
					<div>
						<h2 id='h-tools'>{t('home:tools.title')}</h2>
					</div>
				</header>
				<div className='h-tiles h-tiles--2'>
					<div className='h-tile h-tile--row'>
						<span className='h-tile-icon'>
							<TeamTabIcon id='collection' size={32} />
						</span>
						<div>
							<h3>
								<Link to={R.teamsCollection} className='h-stretch'>
									{t('teams:page.collectionTab')}
								</Link>
							</h3>
							<p>{t('home:tools.collectionPitch')}</p>
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
					<div className='h-tile h-tile--row'>
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
				</div>
			</section>
		</div>
	);
};

export default Home;
