import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { copyrightYears } from '../lib/home';
import { R } from '../lib/nav';
import { socialLinks } from '../lib/social';
import { BrandMark } from './BrandMark';
import { SocialLinks } from './SocialLinks';

// feedback, bug reports and ideas go to the Discord server
const FEEDBACK_URL = socialLinks().find((l) => l.id === 'discord')?.url;

/** The site footer: where to go, who made it, who to thank, and the "unofficial" notice. */
export const Footer = () => {
	const { t } = useTranslation(['home', 'common', 'teams', 'calendar', 'pokemonDetail']);
	return (
		<footer className='h-footer'>
			<div className='h-footer-inner'>
				<div className='h-footer-brand'>
					<Link to={R.home} className='r-logo' aria-label={t('common:app.homeAriaLabel')}>
						<BrandMark className='r-logo-mark' />
						<b>Pokédex</b>
					</Link>
					<p>{t('home:footer.tagline')}</p>
					<SocialLinks />
				</div>
				<nav className='h-footer-cols' aria-label={t('home:footer.explore')}>
					<div>
						<h4>{t('home:footer.explore')}</h4>
						<ul>
							<li>
								<Link to={R.pokedex}>Pokédex</Link>
							</li>
							<li>
								<Link to={R.rankings('great')}>{t('home:hero.ctaPvp')}</Link>
							</li>
							<li>
								<Link to={R.rankings('raid')}>{t('home:footer.raidRanks')}</Link>
							</li>
							<li>
								<Link to={R.teams}>{t('home:hero.ctaTeams')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h4>{t('common:nav.calendar.label')}</h4>
						<ul>
							<li>
								<Link to={R.calendar('events')}>{t('calendar:tabs.events')}</Link>
							</li>
							<li>
								<Link to={R.calendar('spawns')}>{t('calendar:tabs.spawns')}</Link>
							</li>
							<li>
								<Link to={R.calendar('bosses')}>{t('calendar:tabs.bosses')}</Link>
							</li>
							<li>
								<Link to={R.calendar('rockets')}>{t('calendar:tabs.rockets')}</Link>
							</li>
							<li>
								<Link to={R.calendar('eggs')}>{t('calendar:tabs.eggs')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h4>{t('home:footer.tools')}</h4>
						<ul>
							<li>
								<Link to={R.teamsCollection}>{t('teams:page.collectionTab')}</Link>
							</li>
							<li>
								<Link to={R.moves}>{t('common:nav.moves.label')}</Link>
							</li>
							<li>
								<Link to={R.types}>{t('common:nav.types.label')}</Link>
							</li>
							<li>
								<Link to={R.searchStrings()}>{t('common:nav.searches.label')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h4>{t('home:footer.project')}</h4>
						<ul>
							<li>
								<Link to={R.about}>{t('home:footer.about')}</Link>
							</li>
							<li>
								<Link to={`${R.about}#privacy`}>{t('home:footer.privacy')}</Link>
							</li>
							<li>
								<a href={FEEDBACK_URL} target='_blank' rel='noopener noreferrer'>
									{t('home:footer.issues')} <span aria-hidden='true'>↗</span>
								</a>
							</li>
						</ul>
					</div>
				</nav>
			</div>
			<div className='h-footer-legal'>
				<p>{t('home:footer.disclaimer')}</p>
				<p className='h-footer-rights'>
					© {copyrightYears()} GO Pokédex. {t('home:footer.rights')}
				</p>
			</div>
		</footer>
	);
};
