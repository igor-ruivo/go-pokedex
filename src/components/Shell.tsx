import { useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';
import { usePageMeta } from '../hooks/usePageMeta';
import { useScrollToTopOnNavigate } from '../hooks/useScrollToTopOnNavigate';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { R } from '../lib/nav';
import { NAV } from '../lib/nav-items';
import { detectPlatform } from '../lib/platform';
import { useGameTranslationsData } from '../utils/game-translations-store';
import { AppMenu } from './AppMenu';
import { BrandMark } from './BrandMark';
import { Footer } from './Footer';
import { InstallPrompt } from './InstallPrompt';
import { TeamBuilderIcon } from './NavIcons';
import { SearchBox } from './SearchBox';

const Shell = () => {
	const { t } = useTranslation(['common', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const { pathname } = useLocation();
	const { dataTheme } = useTheme();
	// the bottom bar follows the guidelines of the device it is on (see `data-platform` in components.css)
	const platform = useMemo(() => detectPlatform(), []);
	// The real size of the two bars, for everything that sticks under the top one or stays clear of the bottom one: they differ by device (the
	// notch and the home indicator, the platform's own bar) and by turning the phone, so no component assumes a number of its own.
	const rootRef = useRef<HTMLDivElement>(null);
	const appbarRef = useRef<HTMLElement>(null);
	const navRef = useRef<HTMLElement>(null);
	useLayoutEffect(() => {
		const root = rootRef.current;
		const appbar = appbarRef.current;
		const nav = navRef.current;
		if (!root || !appbar || !nav) return;
		const measure = () => {
			// the top bar's bottom edge, and how far the bottom bar's top edge is from the bottom of the screen (its own height, its gap from
			// the edge and the home indicator)
			root.style.setProperty('--appbar-h', `${Math.round(appbar.getBoundingClientRect().height)}px`);
			root.style.setProperty('--bottomnav-reach', `${Math.round(window.innerHeight - nav.getBoundingClientRect().top)}px`);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(appbar);
		observer.observe(nav);
		window.addEventListener('resize', measure);
		window.addEventListener('orientationchange', measure);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', measure);
			window.removeEventListener('orientationchange', measure);
		};
	}, [platform]);
	usePageMeta();
	useScrollToTopOnNavigate();
	const unseenEvents = useUnseenEventsCount();
	// Kicks off the one-time game-translations fetch and re-renders this whole
	// subtree (every route, via <Outlet/> below) once it resolves — see
	// `useGameTranslationsData`'s own doc comment for why this lives here and
	// not per-component.
	useGameTranslationsData();

	return (
		<div className='rvmp' data-theme={dataTheme} data-platform={platform} ref={rootRef}>
			<header className='r-appbar' ref={appbarRef}>
				<Link to={R.home} className='r-logo' aria-label={t('common:app.homeAriaLabel')}>
					<BrandMark className='r-logo-mark' />
					<b>Pokédex</b>
				</Link>
				<SearchBox />
				<AppMenu />
			</header>

			<main className='r-main'>
				<Outlet />
			</main>

			<Footer />

			<nav className='r-bottomnav' aria-label={t('common:nav.mainAriaLabel')} ref={navRef}>
				{NAV.map((n) => {
					const label = n.label(t);
					const shortLabel = n.shortLabel?.(t) ?? label;
					const hint = n.hint(t, gl);
					return (
						<NavLink
							key={n.to}
							to={n.to}
							className={[n.match(pathname) ? 'is-active' : '', n.wideOnly ? 'r-bn-wide' : ''].filter(Boolean).join(' ')}
							title={hint}
							aria-label={
								n.to === R.calendar() && unseenEvents > 0
									? t('common:nav.calendarBadge', { label, count: unseenEvents })
									: undefined
							}
						>
							<span className='r-bn-icon' aria-hidden>
								{n.to === R.teams ? <TeamBuilderIcon /> : n.icon.startsWith('/') ? <img src={n.icon} alt='' /> : n.icon}
								{n.to === R.calendar() && unseenEvents > 0 && (
									<span className='r-bn-badge' aria-hidden='true'>
										{unseenEvents > 9 ? '9+' : unseenEvents}
									</span>
								)}
							</span>
							<span className='r-bn-label'>
								<i className='r-bn-label-short'>{shortLabel}</i>
								<i className='r-bn-label-full'>{label}</i>
							</span>
						</NavLink>
					);
				})}
			</nav>

			<InstallPrompt />
		</div>
	);
};

export default Shell;
