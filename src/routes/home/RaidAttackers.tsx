import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useLanguage } from '../../contexts/language-context';
import { useRaidMetric } from '../../contexts/raid-metric-context';
import { cleanName } from '../../lib/format';
import { topAttackers } from '../../lib/home';
import { R } from '../../lib/nav';
import { fmtRaidMetric, RAID_METRIC_LABEL, raidRankOf } from '../../lib/raid-metric';
import { RAID_TYPE_KEYS, typeVar } from '../../lib/types';
import { usePokemon } from '../../queries/pokemon';
import { useRaidRanker } from '../../queries/raid-ranker';
import { gameTypeDisplayTranslator } from '../../utils/GameTranslator';
import { PokeAvatar } from './PokeAvatar';

/** One small card per attacking type — its icon on the type's colour, and the three best raid attackers of it. */
export const RaidAttackers = () => {
	const { t } = useTranslation(['home']);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { raidMetric } = useRaidMetric();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();

	return (
		<section className='h-section' aria-labelledby='h-raid'>
			<header className='h-sh'>
				<div>
					<h2 id='h-raid'>{t('home:raid.title')}</h2>
					<p>{t('home:raid.subtitle')}</p>
				</div>
			</header>
			<div className='h-raids'>
				{RAID_TYPE_KEYS.map((type) => {
					const top = topAttackers(raidDPS[type] ?? {}, (e) => raidRankOf(e, raidMetric), 3).filter(
						(e) => !!gamemasterPokemon[e.speciesId]
					);
					return (
						<article key={type} className='h-raid' style={{ ['--tc' as string]: typeVar(type) } as CSSProperties}>
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
													<b>
														{raidDPSFetchCompleted
															? fmtRaidMetric(raidMetric === 'tdo' ? e.tdo : e.dps, raidMetric)
															: ''}
													</b>
												</Link>
											</li>
										))}
							</ol>
						</article>
					);
				})}
			</div>
		</section>
	);
};
