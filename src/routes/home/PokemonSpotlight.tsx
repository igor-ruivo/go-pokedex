import { type CSSProperties, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { IconTabBar } from '../../components/IconTabBar';
import { pokemonTabIcon } from '../../components/pokemon-tab-icons';
import { Sprite, spriteUrl } from '../../components/Sprite';
import { useImageSource } from '../../contexts/imageSource-context';
import { useLanguage } from '../../contexts/language-context';
import { useRaidMetric } from '../../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cleanName, dexNo, sentenceCase } from '../../lib/format';
import { randomIndexOtherThan } from '../../lib/home';
import { modeColor, modeLabel, R } from '../../lib/nav';
import {
	type BestAttacker,
	type BestForm,
	bestRaidAttacker,
	bestRanked,
	type EvolutionLine,
	evolutionLines,
	lineMembers,
} from '../../lib/pokemon-spotlight';
import { fmtRaidMetric, RAID_METRIC_LABEL, raidRankOf } from '../../lib/raid-metric';
import { accentStyle, typeKey, typeVar } from '../../lib/types';
import { useLeagueDefinitions } from '../../queries/leagues';
import { usePokemon } from '../../queries/pokemon';
import { type RankList, usePvp } from '../../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../../utils/GameTranslator';
import { EvolutionChips } from './EvolutionChips';
import { homeLeagueIcon, LeaguePlate } from './LeaguePlate';
import { PokeAvatar } from './PokeAvatar';
import { type Preload, preloadImages, ROTATE_MS, useRotator } from './useRotator';

/** The width below which the card stacks (keep in step with the 760px rule of the spotlight in home.css). */
const NARROW_SCREEN = '(max-width: 760px)';

/** The additional leagues (the cups) are looked at only when the best of Great, Ultra and Master is worse than this place. */
const CUPS_BELOW_RANK = 100;

/** The tabs of a Pokémon's page that the card has as buttons (their pictures are made ready with the card). */
const SPOT_TABS = ['ranks', 'combat', 'moves', 'counters', 'iv-table', 'strings'] as const;

/** A line of three evolutions, and where its forms stand in the rankings. */
interface Spotlight {
	line: EvolutionLine;
	/** The first stage: the one the card is about. */
	hero: IGamemasterPokemon;
	/** The league where the line ranks highest, with its best form there. */
	pvp: (BestForm & { league: string }) | undefined;
	/** Its best raid attacker rank, in whichever type it is highest. */
	raid: BestAttacker<DPSEntry> | undefined;
}

/** What a stage of the line, or a Mega, is called under the sprite. */
const stageName = (p: IGamemasterPokemon) => cleanName(p.speciesName);

/** One line of three evolutions as the card draws it: the big sprite and its stats, the line below it, and where it ranks. */
const SpotlightView = ({
	spot,
	className,
	countdown,
}: {
	spot: Spotlight;
	className?: string | undefined;
	/** The time left for this card (only the card on show has it). */
	countdown?: { cycle: number; held: boolean; delay: number } | undefined;
}) => {
	const { t } = useTranslation(['home', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const { leagues: leagueDefinitions } = useLeagueDefinitions();
	const { raidMetric } = useRaidMetric();
	const navigate = useNavigate();
	const { hero, line, raid } = spot;
	const narrow = useMediaQuery(NARROW_SCREEN);
	const dex = <div className='r-dexno'>{dexNo(hero.dex)}</div>;
	const nameHeading = (
		<h3 className='h-spot-name'>
			<Link to={R.pokemon(hero.speciesId)}>{stageName(hero)}</Link>
		</h3>
	);
	const typeChips = (
		<div className='r-types'>
			{hero.types.map((type) => (
				<span key={String(type)} className='r-type' style={{ ['--tc' as string]: typeVar(type) }}>
					{gameTypeDisplayTranslator(typeKey(type), gl) || String(type)}
				</span>
			))}
		</div>
	);
	const tabs = [
		{ slug: 'ranks', label: t('pokemonDetail:tabs.ranks') },
		{ slug: 'combat', label: t('pokemonDetail:tabs.combat') },
		{ slug: 'moves', label: t('pokemonDetail:tabs.moves') },
		{ slug: 'counters', label: t('pokemonDetail:tabs.counters') },
		{ slug: 'iv-table', label: t('pokemonDetail:tabs.ivTable') },
		{ slug: 'strings', label: t('pokemonDetail:tabs.strings') },
	];

	return (
		<article className={className ? `h-spot r-hero ${className}` : 'h-spot r-hero'} style={accentStyle(hero.types[0])}>
			<div className='h-spot-main'>
				<div className='h-spot-figure'>
					{narrow ? (
						// on a phone the types float at the right of the sprite
						<div className='h-spot-art'>
							<Sprite pokemon={hero} onTap={() => void navigate(R.pokemon(hero.speciesId))} />
							{typeChips}
						</div>
					) : (
						<Sprite pokemon={hero} onTap={() => void navigate(R.pokemon(hero.speciesId))} />
					)}
					{/* on a phone the dex number (left of the name) and the name go under the sprite, before the family line */}
					{narrow && (
						<div className='h-spot-title'>
							<div className='h-spot-heading'>
								{dex}
								{nameHeading}
							</div>
						</div>
					)}
					<EvolutionChips members={[...line.stages, ...line.megas]} current={hero} label={stageName(hero)} />
				</div>

				<div className='h-spot-info'>
					{!narrow && (
						<div>
							{dex}
							{nameHeading}
							{typeChips}
						</div>
					)}

					{!narrow && (
						<div className='r-stats'>
							{[
								{ stat: 'atk', label: t('pokemonDetail:hero.stats.atk') },
								{ stat: 'def', label: t('pokemonDetail:hero.stats.def') },
								{ stat: 'hp', label: t('pokemonDetail:hero.stats.hp') },
							].map(({ stat, label }) => (
								<div key={stat} className='r-stat'>
									<i>{label}</i>
									<b>{hero.baseStats[stat as 'atk' | 'def' | 'hp']}</b>
								</div>
							))}
						</div>
					)}

					<ul className='h-spot-ranks'>
						{[spot.pvp]
							.flatMap((best) => (best ? [best] : []))
							.map(({ league, pokemon, rank }) => (
								<li key={league} style={{ ['--lg' as string]: modeColor(league) } as CSSProperties}>
									<Link to={`${R.pokemon(pokemon.speciesId)}?lg=${league}`} className='h-spot-rank'>
										<LeaguePlate id={league} />
										<span className='h-spot-rank-text'>
											<b>{modeLabel(league, gl, leagueDefinitions)}</b>
											<span>
												<PokeAvatar pokemon={pokemon} className='h-avatar--sm' />
												<em>{stageName(pokemon)}</em>
											</span>
										</span>
										<i className='h-spot-place'>#{rank}</i>
									</Link>
								</li>
							))}
						{raid && (
							<li
								style={
									{ ['--lg' as string]: 'var(--lg-raid)', ['--tc' as string]: typeVar(raid.type) } as CSSProperties
								}
							>
								<Link to={`${R.pokemon(raid.pokemon.speciesId)}?lg=raid`} className='h-spot-rank'>
									<span className='h-raid-type'>
										<img src={`/images/types/${raid.type}.png`} alt='' loading='lazy' />
									</span>
									<span className='h-spot-rank-text'>
										<b>
											{sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl) || 'Raids')} ·{' '}
											{gameTypeDisplayTranslator(raid.type, gl) || raid.type}
										</b>
										<span>
											<PokeAvatar pokemon={raid.pokemon} className='h-avatar--sm' />
											<em>
												{stageName(raid.pokemon)} · {fmtRaidMetric(raid.entry[raidMetric], raidMetric)}{' '}
												{RAID_METRIC_LABEL[raidMetric]}
											</em>
										</span>
									</span>
									<i className='h-spot-place'>#{raid.rank}</i>
								</Link>
							</li>
						)}
					</ul>
				</div>
			</div>
			{/* the tabs of its page: on a phone the same swipeable icon-over-label strip the Pokémon page has (none is current),
			    otherwise buttons */}
			{narrow ? (
				<IconTabBar
					items={tabs.map(({ slug, label }) => ({ id: slug, label, icon: pokemonTabIcon(slug) }))}
					activeId=''
					onSelect={(slug) => void navigate(R.pokemon(hero.speciesId, slug))}
					ariaLabel={stageName(hero)}
				/>
			) : (
				<ul className='h-lab-links h-spot-tabs'>
					{tabs.map(({ slug, label }) => {
						const icon = pokemonTabIcon(slug);
						return (
							<li key={slug}>
								<Link to={R.pokemon(hero.speciesId, slug)} className='h-chip'>
									<span className='h-chip-ico'>
										{typeof icon === 'string' ? <img src={icon} alt='' loading='lazy' /> : icon}
									</span>
									{label}
								</Link>
							</li>
						);
					})}
				</ul>
			)}
			{/* the track is always there (empty for the card leaving) so the card never changes height */}
			<span className='h-countdown' aria-hidden='true' data-held={countdown?.held ? '' : undefined}>
				{countdown && (
					<i
						key={countdown.cycle}
						style={{ animationDuration: `${ROTATE_MS}ms`, animationDelay: `${countdown.delay}ms` }}
					/>
				)}
			</span>
		</article>
	);
};

/**
 * A rotating showcase of one Pokémon at a time: only plain three-stage lines (so no Eevee and no regional forms; the last
 * stage's Megas come along), shown by its first stage: the big sprite, the base stats, the line below it, the league where it
 * ranks highest (with the best form it can reach there) and its best raid attacker rank. Rotates like the team showcase below it.
 */
export const PokemonSpotlight = () => {
	const { t } = useTranslation(['home']);
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, extraRankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { raidMetric } = useRaidMetric();
	const { leagues } = useLeagueDefinitions();
	const { imageSource } = useImageSource();
	// on a narrow screen the Megas would take a row of their own: those lines are left out
	const narrow = useMediaQuery(NARROW_SCREEN);
	const loaded = fetchCompleted && pvpFetchCompleted && raidDPSFetchCompleted;

	const lines = useMemo(() => evolutionLines(gamemasterPokemon), [gamemasterPokemon]);

	// Every line that is ranked somewhere: the rotation is exactly these, so how many can appear is known.
	const pool = useMemo(() => {
		if (!loaded) return [];
		const main: Array<{ id: string; ranking: RankList }> = (['great', 'ultra', 'master'] as const).map((id, i) => ({
			id: id as string,
			ranking: rankLists[i] ?? {},
		}));
		const cups: Array<{ id: string; ranking: RankList }> = leagues
			.filter((l) => !['great', 'ultra', 'master'].includes(l.id))
			.map((l) => ({ id: l.id, ranking: extraRankLists[l.id] ?? {} }));
		const bestIn = (lists: typeof main, members: ReadonlyArray<IGamemasterPokemon>): Spotlight['pvp'] => {
			let best: Spotlight['pvp'];
			for (const { id, ranking } of lists) {
				const found = bestRanked(members, (speciesId) => ranking[speciesId]?.rank);
				if (found && (!best || found.rank < best.rank)) best = { league: id, ...found };
			}
			return best;
		};
		return lines.flatMap((line): Array<Spotlight> => {
			if (narrow && line.megas.length > 0) return [];
			const members = lineMembers(line);
			// the cups only count when the permanent leagues have little to offer
			let pvp = bestIn(main, members);
			if (!pvp || pvp.rank > CUPS_BELOW_RANK) {
				const cup = bestIn(cups, members);
				if (cup && (!pvp || cup.rank < pvp.rank)) pvp = cup;
			}
			const raid = bestRaidAttacker(members, raidDPS, (entry) => raidRankOf(entry, raidMetric));
			return pvp || raid ? [{ line, hero: line.stages[0], pvp, raid }] : [];
		});
	}, [loaded, narrow, lines, rankLists, extraRankLists, leagues, raidDPS, raidMetric]);

	// Everything the card is made of, so that it swipes in complete: the sprites of the whole line (with the artwork the sprite
	// falls back to), the badge of its league, the type of its raid ranking and the pictures of the tab buttons.
	const assetsOf = useCallback(
		(spot: Spotlight): Array<Preload> => {
			const assets: Array<Preload> = lineMembers(spot.line).map((p) => ({
				url: spriteUrl(p, imageSource),
				fallback: p.imageUrl,
			}));
			const badge = spot.pvp && homeLeagueIcon(spot.pvp.league);
			if (badge) assets.push(badge);
			if (spot.raid) assets.push(`/images/types/${spot.raid.type}.png`);
			for (const slug of SPOT_TABS) {
				const icon = pokemonTabIcon(slug);
				if (typeof icon === 'string' && icon) assets.push(icon);
			}
			return assets;
		},
		[imageSource]
	);
	const { current, leaving, held, cycle, barDelay, rotated, holdProps } = useRotator<Spotlight>({
		ready: pool.length > 0,
		pick: (not) => {
			if (pool.length === 0) return undefined;
			const at = not ? pool.findIndex((s) => s.hero.speciesId === not.hero.speciesId) : -1;
			return pool[randomIndexOtherThan(pool.length, at < 0 ? undefined : at)];
		},
		preload: (spot) => preloadImages(assetsOf(spot)),
	});

	if (loaded && pool.length === 0) return null;

	return (
		<section className='h-section' aria-labelledby='h-spot'>
			<header className='h-sh'>
				<div>
					<h2 id='h-spot'>{t('home:spotlight.title')}</h2>
					<p>{t('home:spotlight.subtitle')}</p>
				</div>
			</header>
			{current ? (
				<div className='h-rotator'>
					<div className='h-swap' {...holdProps}>
						{leaving && <SpotlightView key={leaving.hero.speciesId} spot={leaving} className='h-featured--out' />}
						<SpotlightView
							key={current.hero.speciesId}
							spot={current}
							className={rotated ? 'h-featured--in' : undefined}
							countdown={{ cycle, held, delay: barDelay }}
						/>
					</div>
				</div>
			) : (
				<span className='h-skeleton h-spot-skeleton' aria-hidden='true' />
			)}
		</section>
	);
};
