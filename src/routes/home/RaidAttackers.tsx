import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { useLanguage } from '../../contexts/language-context';
import { useRaidMetric } from '../../contexts/raid-metric-context';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cleanName } from '../../lib/format';
import { topAttackers } from '../../lib/home';
import { R } from '../../lib/nav';
import { fmtRaidMetric, RAID_METRIC_LABEL, raidRankOf } from '../../lib/raid-metric';
import { RAID_TYPE_KEYS, typeVar } from '../../lib/types';
import { usePokemon } from '../../queries/pokemon';
import { useRaidRanker } from '../../queries/raid-ranker';
import { gameTypeDisplayTranslator } from '../../utils/GameTranslator';
import { PokeAvatar } from './PokeAvatar';

/** The width below which the cards are replaced by a type picker. */
const NARROW_SCREEN = '(max-width: 700px)';
/** A type's card lists its three best attackers, with their names and figures. */
const LISTED = 3;

/** One small card for an attacking type: its icon on the type's colour, and its best raid attackers. */
const RaidTypeCard = ({ type }: { type: string }) => {
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { raidMetric } = useRaidMetric();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

	const top = topAttackers(raidDPS[type] ?? {}, (e) => raidRankOf(e, raidMetric), LISTED).filter(
		(e) => !!gamemasterPokemon[e.speciesId]
	);

	return (
		<article
			className='h-raid'
			data-hero={top.length > 0 ? '' : undefined}
			style={{ ['--tc' as string]: typeVar(type), ['--lg' as string]: typeVar(type) } as CSSProperties}
		>
			{/* the type's best attacker, big on a slanted panel at the end of the header (the list below names it) */}
			{top.length > 0 && (
				<span className='h-league-hero' aria-hidden='true'>
					<SpriteImg pokemon={gamemasterPokemon[top[0].speciesId]} loading='lazy' />
					{gamemasterPokemon[top[0].speciesId].isShadow && <ShadowMark />}
				</span>
			)}
			<header>
				<span className='h-raid-type'>
					<img src={`/images/types/${type}.png`} alt='' loading='lazy' />
				</span>
				<h3>
					<Link to={R.rankings('raid', type)} className='h-stretch'>
						{gameTypeDisplayTranslator(type, gl) || type}
					</Link>
				</h3>
				<span className='h-raid-metric'>{RAID_METRIC_LABEL[raidMetric]}</span>
			</header>
			<ol>
				{top.length === 0
					? [0, 1, 2].map((i) => (
							<li key={i}>
								<span className='h-skeleton h-skeleton--row-sm' aria-hidden='true' />
							</li>
						))
					: top.map((e, i) => (
							<li key={e.speciesId}>
								<Link to={R.pokemon(e.speciesId)} className='h-raid-link'>
									<i className='h-coin'>{i + 1}</i>
									<PokeAvatar pokemon={gamemasterPokemon[e.speciesId]} className='h-avatar--sm' />
									<span className='h-raid-name'>{cleanName(gamemasterPokemon[e.speciesId].speciesName)}</span>
									<b>{raidDPSFetchCompleted ? fmtRaidMetric(raidMetric === 'tdo' ? e.tdo : e.dps, raidMetric) : ''}</b>
								</Link>
							</li>
						))}
			</ol>
		</article>
	);
};

/**
 * On a narrow screen the cards give way to a picker: every attacking type as a tile, each one the way to that type's raid ranking.
 * It is the Rankings page's own type picker (`r-typepick`), as it is there.
 */
const RaidTypePicker = () => {
	const { t } = useTranslation(['home']);
	const { currentGameLanguage: gl } = useLanguage();
	return (
		<nav className='r-typepick' aria-label={t('home:raid.title')}>
			{RAID_TYPE_KEYS.map((type) => (
				<Link
					key={type}
					to={R.rankings('raid', type)}
					className='r-typepick-btn'
					style={{ ['--tc' as string]: typeVar(type) } as CSSProperties}
				>
					<img src={`/images/types/${type}.png`} alt='' width={32} height={32} loading='lazy' />
					<span>{gameTypeDisplayTranslator(type, gl) || type}</span>
				</Link>
			))}
		</nav>
	);
};

/** One small card per attacking type — its icon on the type's colour, and its best raid attackers — or, on a narrow screen, a type picker. */
export const RaidAttackers = () => {
	const { t } = useTranslation(['home']);
	const narrow = useMediaQuery(NARROW_SCREEN);
	return (
		<section className='h-section' aria-labelledby='h-raid'>
			<header className='h-sh'>
				<div>
					<h2 id='h-raid'>{t('home:raid.title')}</h2>
					<p>{narrow ? t('home:raid.pickSubtitle') : t('home:raid.subtitle')}</p>
				</div>
			</header>
			{narrow ? (
				<RaidTypePicker />
			) : (
				<div className='h-raids'>
					{RAID_TYPE_KEYS.map((type) => (
						<RaidTypeCard key={type} type={type} />
					))}
				</div>
			)}
		</section>
	);
};
