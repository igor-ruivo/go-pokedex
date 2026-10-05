import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

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
import { type FaceOptions, faceStep, useFaceLayout } from './face-layout';
import { PokeAvatar } from './PokeAvatar';

/** The width below which a type is one line: its badge and name, then as many of its best attackers as fit as overlapping faces. */
const NARROW_SCREEN = '(max-width: 700px)';
/** Wider than that, a type lists its three best attackers with their names and figures. */
const LISTED = 3;
/** The most faces a type ever shows in its line. */
const MAX_FACES = 8;
/** Smaller faces than the rest of the page's, so that a line stays slim; they shrink a little to fit more. */
const RAID_FACES: FaceOptions = {
	maxSize: 42,
	targets: [
		{ cells: 6, minSize: 30 },
		{ cells: 5, minSize: 32 },
		{ cells: 4, minSize: 34 },
		{ cells: 3, minSize: 34 },
	],
};

/** One small card for an attacking type: its icon on the type's colour, and its best raid attackers. */
const RaidTypeCard = ({ type }: { type: string }) => {
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { raidMetric } = useRaidMetric();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const narrow = useMediaQuery(NARROW_SCREEN);
	const [ref, layout] = useFaceLayout<HTMLOListElement>(RAID_FACES);

	const ranked = topAttackers(raidDPS[type] ?? {}, (e) => raidRankOf(e, raidMetric), MAX_FACES).filter(
		(e) => !!gamemasterPokemon[e.speciesId]
	);
	// a line shows as many as fit its room (no "+N"), a list shows three
	const top = narrow ? ranked.slice(0, layout.count) : ranked.slice(0, LISTED);
	const step = faceStep(layout, top.length);

	return (
		<article className='h-raid' style={{ ['--tc' as string]: typeVar(type) } as CSSProperties}>
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
			<ol ref={ref} style={{ ['--face' as string]: `${layout.size}px`, ['--face-step' as string]: `${step}px` }}>
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

/** One small card per attacking type — its icon on the type's colour, and its best raid attackers. */
export const RaidAttackers = () => {
	const { t } = useTranslation(['home']);
	return (
		<section className='h-section' aria-labelledby='h-raid'>
			<header className='h-sh'>
				<div>
					<h2 id='h-raid'>{t('home:raid.title')}</h2>
					<p>{t('home:raid.subtitle')}</p>
				</div>
			</header>
			<div className='h-raids'>
				{RAID_TYPE_KEYS.map((type) => (
					<RaidTypeCard key={type} type={type} />
				))}
			</div>
		</section>
	);
};
