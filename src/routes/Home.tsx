import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AdornedSprite } from '../components/AdornedSprite';
import { BonusIcons } from '../components/BonusBullet';
import { BrandMark } from '../components/BrandMark';
import { CollectionIcon, TeamBuilderIcon } from '../components/NavIcons';
import { RaidIcon } from '../components/RaidIcon';
import { SparkleIcon } from '../components/SparkleIcon';
import { TeamTabIcon } from '../components/team-tab-icons';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useRelevanceSets } from '../contexts/relevance-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IPostEntry } from '../DTOs/INews';
import { useLiveNow } from '../hooks/useLiveNow';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { leekduckPosts, nowRaidEntries, spotlightToPost } from '../lib/calendar-events';
import { isCommunityDay, isRaidHour } from '../lib/community-days';
import { dateRange } from '../lib/format';
import {
	type ContentKind,
	eggHeroes,
	eventContentKinds,
	eventHighlights,
	featuredEvents,
	type HeroPick,
	homeRaidEntries,
	maxBattleHero,
	type RaidEggKind,
	raidEggKind,
	raidHero,
	rocketHero,
	spawnHero,
} from '../lib/home';
import { gigantamaxOf } from '../lib/max-forms';
import { bonusIcons } from '../lib/milestone-icons';
import { R } from '../lib/nav';
import { sortByCalendarRelevance } from '../lib/relevance';
import { useCalendar } from '../queries/calendar';
import { usePokemon } from '../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { CommunityDays } from './home/CommunityDays';
import { LeagueCards } from './home/LeagueCards';
import { PokeAvatar } from './home/PokeAvatar';
import { PokemonSpotlight } from './home/PokemonSpotlight';
import { RaidAttackers } from './home/RaidAttackers';
import { TeamLab } from './home/TeamLab';
import { TileHero } from './home/TileHero';

/** The egg that stands for the raids of an event, by the highest tier it has (see `raidEggKind`). */
const RAID_EGG_ICON: Record<RaidEggKind, string> = {
	'5': '/images/raids/tier-5.png',
	'mega': '/images/raids/mega.png',
	'3': '/images/raids/tier-3.png',
	'1': '/images/raids/tier-1.png',
};

const KIND_ICON: Record<ContentKind, string> = {
	raids: '/images/raids/tier-5.png',
	maxBattles: '/images/nav/max-battle.webp',
	wild: '/images/nav/spawns-grass.png',
	researches: '/images/nav/research.png',
	eggs: '/images/eggs/10km.png',
	incenses: '/images/bonuses/incense-plain.png',
	lures: '/images/bonuses/lure-module.png',
};

const FEATURED_LIMIT = 5;

/** Below this width the Eggs card (the last of the five) is stretched across both columns (keep in step with `.h-tiles--5` in home.css). */
const STRETCHED_TILE = '(max-width: 700px)';
/** How many egg Pokémon it shows then. */
const STRETCHED_EGGS = 3;

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
	// A Spotlight Hour is about its one bonus: the chip is that bonus's own picture (the two candies of a 2× Catch Candy…), when it has one.
	const spotlightBonuses = post.isSpotlight
		? (post.bonuses[GameLanguage.en] ?? [])
				.map((english, i) => ({ english, text: post.bonuses[gl]?.[i] || english }))
				.filter((b) => bonusIcons(b.english).length > 0)
				.slice(0, 2)
		: [];
	// bonuses, rewards and milestones are one chip: the same logo stands for all three
	const hasBonuses =
		(post.bonuses[gl] ?? []).some(Boolean) ||
		(post.rewardBlocks?.[gl]?.length ?? 0) > 0 ||
		!!post.milestoneBonuses?.[gl];
	const label = (kind: ContentKind) => {
		switch (kind) {
			case 'raids':
				return t('home:now.raids');
			case 'maxBattles':
				return gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl);
			case 'wild':
				return t('home:now.wild');
			case 'researches':
				return t('home:now.researches');
			case 'incenses':
				return t('calendar:events.groups.incense');
			case 'lures':
				return t('calendar:events.groups.lures');
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
	// The chip that only says what the kind of event already is is left out: spawns on a Spotlight Hour or a Community Day, the Max
	// Battle symbol on a Max Monday, the raid egg on a Raid Hour.
	const obvious = new Set<ContentKind>([
		...(post.isSpotlight || isCommunityDay(post) ? (['wild'] as const) : []),
		...(maxMonday ? (['maxBattles'] as const) : []),
		...(isRaidHour(post) ? (['raids'] as const) : []),
	]);
	const kinds = eventContentKinds(post).filter((kind) => !obvious.has(kind));
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
				{(hasBonuses || kinds.length > 0) && (
					<ul className='h-highlights'>
						{spotlightBonuses.map((b) => (
							<li key={b.english}>
								<span className='h-kind h-kind--bonus' title={b.text}>
									<BonusIcons englishText={b.english} />
								</span>
								<span className='h-sr'>{b.text}</span>
							</li>
						))}
						{hasBonuses && spotlightBonuses.length === 0 && (
							<li>
								<span className='h-kind' title={t('calendar:events.bonuses')}>
									<SparkleIcon />
								</span>
								<span className='h-sr'>{t('calendar:events.bonuses')}</span>
							</li>
						)}
						{kinds.map((kind) => (
							<li key={kind}>
								{/* the plate is the box and the picture inside it carries the light theme's contour (eggs, raids, the Max Battle symbol…) */}
								<span className='h-kind' title={label(kind)}>
									<img
										src={kind === 'raids' ? RAID_EGG_ICON[raidEggKind(post.raids)] : KIND_ICON[kind]}
										alt=''
										loading='lazy'
									/>
								</span>
								<span className='h-sr'>{label(kind)}</span>
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
	const sets = useRelevanceSets();
	const byRelevance = <T extends { speciesId: string }>(list: ReadonlyArray<T>): Array<T> =>
		sortByCalendarRelevance(list, (e) => e.speciesId, gamemasterPokemon, sets);

	// One Pokémon per card, and how many more the card has behind it. The sorts walk evolution families, so they are redone only when
	// what they sort changes (the clock ticks every second, and `nowRaids` is a new array each time).
	const raidKey = nowRaids.map((e) => `${e.speciesId}:${e.kind}`).join();
	const raids = useMemo(
		() => {
			const entries = homeRaidEntries(nowRaids, (id) => !!gamemasterPokemon[id]?.isShadow);
			return {
				hero: raidHero(entries, known, byRelevance, (id) => !!gamemasterPokemon[id]?.isShadow),
				count: new Set(entries.filter((e) => known(e.speciesId)).map((e) => e.speciesId)).size,
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[raidKey, gamemasterPokemon, sets]
	);
	// The Eggs card is the last of the five, and on a narrow screen it is stretched across both columns: it then has the room for
	// more than one egg Pokémon (the next ones in the same ranking order).
	const eggsStretched = useMediaQuery(STRETCHED_TILE);
	const eggsShown = eggsStretched ? STRETCHED_EGGS : 1;
	const eggs = useMemo(
		() => ({
			heroes: eggHeroes(calendar.currentEggs, known, byRelevance, eggsShown),
			count: new Set(calendar.currentEggs.filter((e) => known(e.speciesId)).map((e) => e.speciesId)).size,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[calendar.currentEggs, gamemasterPokemon, sets, eggsShown]
	);
	const spawnIds = new Set(
		events
			.flatMap((e) => e.wild)
			.filter((e) => known(e.speciesId))
			.map((e) => e.speciesId)
	);
	const maxIds = new Set(calendar.currentMaxBattles.filter((e) => known(e.speciesId)).map((e) => e.speciesId));
	const rocketIds = new Set(
		calendar.currentRockets
			.flatMap((g) => [g.tier1, g.tier2, g.tier3].filter((_, i) => g.catchableTiers.includes(i)).flat())
			.filter(known)
	);

	const right: Array<{
		to: string;
		icon: string;
		title: string;
		hint: string;
		/** The colour the card takes on (its header, the edge of its panel). */
		tint: string;
		hero: HeroPick | undefined;
		/** More Pokémon beside the first, when the card has the room (the same size, in ranking order). */
		extra?: Array<HeroPick>;
		/** How many more Pokémon the card has than the one it shows. */
		more: number;
		shadow: boolean;
		ready: boolean;
	}> = [
		{
			to: R.calendar('spawns'),
			icon: '/images/nav/spawns-grass.png',
			title: t('calendar:tabs.spawns'),
			hint: t('home:right.spawns'),
			tint: 'var(--t-grass)',
			hero: spawnHero(events, now, known),
			more: Math.max(0, spawnIds.size - 1),
			shadow: false,
			ready: calendar.postsFetchCompleted,
		},
		{
			to: R.calendar('bosses'),
			icon: '/images/raids/tier-5.png',
			title: t('calendar:tabs.bosses'),
			hint: t('home:right.bosses'),
			tint: 'var(--lg-raid)',
			hero: raids.hero,
			more: Math.max(0, raids.count - 1),
			shadow: false,
			ready:
				calendar.currentBossesFetchCompleted && calendar.postsFetchCompleted && calendar.specialBossesFetchCompleted,
		},
		{
			to: R.calendar('max'),
			icon: '/images/nav/max-battle.webp',
			title: gameTranslator(GameTranslatorKeys.MaxBattleDisplay, gl),
			hint: t('home:right.max'),
			tint: 'var(--t-fighting)',
			hero: maxBattleHero(calendar.currentMaxBattles, known),
			more: Math.max(0, maxIds.size - 1),
			shadow: false,
			ready: calendar.currentMaxBattlesFetchCompleted,
		},
		{
			to: R.calendar('rockets'),
			icon: '/images/NPC/giovanni.webp',
			title: t('calendar:tabs.rockets'),
			hint: t('home:right.rockets'),
			tint: 'var(--t-dark)',
			hero: rocketHero(calendar.currentRockets, known),
			more: Math.max(0, rocketIds.size - 1),
			shadow: true,
			ready: calendar.currentRocketsFetchCompleted,
		},
		{
			to: R.calendar('eggs'),
			icon: '/images/eggs/10km.png',
			title: t('calendar:tabs.eggs'),
			hint: t('home:right.eggs'),
			tint: 'var(--t-psychic)',
			hero: eggs.heroes[0],
			extra: eggs.heroes.slice(1),
			more: Math.max(0, eggs.count - eggs.heroes.length),
			shadow: false,
			ready: calendar.currentEggsFetchCompleted,
		},
	];
	// A Gigantamax Pokémon is drawn with its own artwork.
	const heroPokemon = (pick: HeroPick): IGamemasterPokemon | undefined => {
		const base = gamemasterPokemon[pick.speciesId];
		if (!base) return undefined;
		return pick.kind === 'gigantamax'
			? gigantamaxOf(base, gamemasterPokemon, gameTranslator(GameTranslatorKeys.GigantamaxDisplay, gl))
			: base;
	};

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
					{right.map((tile) => {
						const hero = tile.ready && tile.hero ? heroPokemon(tile.hero) : undefined;
						const extras = tile.ready
							? (tile.extra ?? []).flatMap((pick) => {
									const pokemon = heroPokemon(pick);
									return pokemon ? [{ pokemon, shiny: pick.shiny }] : [];
								})
							: [];
						return (
							<div
								className='h-tile h-tile--hero'
								key={tile.to}
								style={{ ['--lg' as string]: tile.tint } as CSSProperties}
							>
								{hero && tile.hero && (
									<TileHero
										pokemon={hero}
										shiny={tile.hero.shiny}
										shadow={tile.shadow}
										more={tile.more}
										extras={extras}
									/>
								)}
								<span className='h-tile-icon'>
									<img src={tile.icon} alt='' loading='lazy' />
								</span>
								<h3>
									<Link to={tile.to} className='h-stretch'>
										{tile.title}
									</Link>
								</h3>
								<p>{tile.hint}</p>
								{!tile.ready && (
									<span className='h-tile-foot'>
										<Skeleton className='h-skeleton--row' />
									</span>
								)}
							</div>
						);
					})}
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
