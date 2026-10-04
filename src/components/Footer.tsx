import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { R } from '../lib/nav';
import { BrandMark } from './BrandMark';

const ISSUES_URL = 'https://github.com/igor-ruivo/go-pokedex/issues';

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
				</div>
				<nav className='h-footer-cols' aria-label={t('home:footer.explore')}>
					<div>
						<h4>{t('home:footer.explore')}</h4>
						<ul>
							<li>
								<Link to={R.rankings('great')}>{t('pokemonDetail:tabs.ranks')}</Link>
							</li>
							<li>
								<Link to={R.teams}>{t('common:nav.teams.label')}</Link>
							</li>
							<li>
								<Link to={R.calendar('events')}>{t('common:nav.calendar.label')}</Link>
							</li>
							<li>
								<Link to={R.pokedex}>Pokédex</Link>
							</li>
						</ul>
					</div>
					<div>
						<h4>{t('home:footer.tools')}</h4>
						<ul>
							<li>
								<Link to={R.searchStrings()}>{t('common:nav.searches.label')}</Link>
							</li>
							<li>
								<Link to={R.moves}>{t('common:nav.moves.label')}</Link>
							</li>
							<li>
								<Link to={R.types}>{t('common:nav.types.label')}</Link>
							</li>
							<li>
								<Link to={R.teamsCollection}>{t('teams:page.collectionTab')}</Link>
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
								<a href={ISSUES_URL} target='_blank' rel='noopener noreferrer'>
									{t('home:footer.issues')} <span aria-hidden='true'>↗</span>
								</a>
							</li>
						</ul>
					</div>
				</nav>
			</div>
			<p className='h-footer-legal'>{t('home:footer.disclaimer')}</p>
		</footer>
	);
};
