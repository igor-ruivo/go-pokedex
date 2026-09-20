import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useTheme } from '../contexts/theme-context';
import { usePageMeta } from '../hooks/usePageMeta';
import { useScrollToTopOnNavigate } from '../hooks/useScrollToTopOnNavigate';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { R } from '../lib/nav';
import { InstallPrompt } from './InstallPrompt';
import { SearchBox } from './SearchBox';
import { SettingsMenu } from './SettingsMenu';

// A plain string renders as an emoji glyph; a `/`-rooted path renders as an
// <img> instead (see the `r-bn-icon` render below) — every item now uses a
// real icon image for a more professional look, no emoji left.
//
// `label`/`hint` are functions (not plain strings) returning a literal
// t('common:nav.<key>.label') call each — scripts/check-i18n-parity.mjs
// statically greps for quoted t() call literals, so a dynamic
// `t(\`common:nav.${key}.label\`)` template would silently escape the check.
// Keeping every call site's key literal and grep-visible is what makes the
// parity check an actual guarantee instead of a partial one.
const NAV: Array<{
	to: string;
	icon: string;
	label: (t: TFunction) => string;
	hint: (t: TFunction) => string;
	match: (p: string) => boolean;
}> = [
	{
		to: R.pokedex,
		icon: '/images/nav/pokedex.png',
		label: (t) => t('common:nav.pokedex.label'),
		hint: (t) => t('common:nav.pokedex.hint'),
		match: (p) => p === '/' || p.startsWith('/pokemon'),
	},
	{
		to: R.rankings('great'),
		icon: '/images/nav/rankings.webp',
		label: (t) => t('common:nav.rankings.label'),
		hint: (t) => t('common:nav.rankings.hint'),
		match: (p) => p.startsWith('/rankings'),
	},
	{
		to: R.calendar(),
		icon: '/images/nav/calendar.png',
		label: (t) => t('common:nav.calendar.label'),
		hint: (t) => t('common:nav.calendar.hint'),
		match: (p) => p.startsWith('/calendar'),
	},
	{
		to: R.moves,
		icon: '/images/nav/moves.png',
		label: (t) => t('common:nav.moves.label'),
		hint: (t) => t('common:nav.moves.hint'),
		match: (p) => p.startsWith('/move'),
	},
	{
		to: R.types,
		icon: '/images/types/psychic.png',
		label: (t) => t('common:nav.types.label'),
		hint: (t) => t('common:nav.types.hint'),
		match: (p) => p.startsWith('/types'),
	},
	{
		to: R.searchStrings(),
		icon: '/images/nav/search-strings.svg',
		label: (t) => t('common:nav.searches.label'),
		hint: (t) => t('common:nav.searches.hint'),
		match: (p) => p.startsWith('/search-strings') || p.startsWith('/trash'),
	},
];

const Shell = () => {
	const { t } = useTranslation(['common']);
	const { pathname } = useLocation();
	const { dataTheme } = useTheme();
	usePageMeta();
	useScrollToTopOnNavigate();
	const unseenEvents = useUnseenEventsCount();

	return (
		<div className='rvmp' data-theme={dataTheme}>
			<header className='r-appbar'>
				<Link to={R.pokedex} className='r-logo' aria-label={t('common:app.homeAriaLabel')}>
					<span className='r-logo-ball' />
					<b>{t('common:app.name')}</b>
				</Link>
				<SearchBox />
				<SettingsMenu />
			</header>

			<main className='r-main'>
				<Outlet />
			</main>

			<nav className='r-bottomnav'>
				{NAV.map((n) => {
					const label = n.label(t);
					const hint = n.hint(t);
					return (
						<NavLink
							key={n.to}
							to={n.to}
							className={n.match(pathname) ? 'is-active' : ''}
							title={hint}
							aria-label={
								n.to === R.calendar() && unseenEvents > 0
									? t('common:nav.calendarBadge', { label, count: unseenEvents })
									: undefined
							}
						>
							<span className='r-bn-icon' aria-hidden>
								{n.icon.startsWith('/') ? <img src={n.icon} alt='' /> : n.icon}
								{n.to === R.calendar() && unseenEvents > 0 && (
									<span className='r-bn-badge' aria-hidden='true'>
										{unseenEvents > 9 ? '9+' : unseenEvents}
									</span>
								)}
							</span>
							<span className='r-bn-label'>{label}</span>
						</NavLink>
					);
				})}
			</nav>

			<InstallPrompt />
		</div>
	);
};

export default Shell;
