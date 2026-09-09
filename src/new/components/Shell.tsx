import { useLayoutEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { R } from '../lib/nav';
import { SearchBox } from './SearchBox';
import { SettingsMenu } from './SettingsMenu';

const NAV: Array<{ to: string; label: string; icon: string; match: (p: string) => boolean }> = [
	{ to: R.pokedex, label: 'Pokédex', icon: '▦', match: (p) => p === '/new' || p.startsWith('/new/pokemon') },
	{ to: R.rankings('great'), label: 'Rankings', icon: '🏆', match: (p) => p.startsWith('/new/rankings') },
	{ to: R.calendar(), label: 'Calendar', icon: '🗓', match: (p) => p.startsWith('/new/calendar') },
	{ to: R.moves, label: 'Moves', icon: '⚡', match: (p) => p.startsWith('/new/move') },
	{ to: R.types, label: 'Types', icon: '🛡', match: (p) => p.startsWith('/new/types') },
	{ to: R.trash, label: 'Delete', icon: '🗑', match: (p) => p.startsWith('/new/trash') },
];

const Shell = () => {
	const { pathname } = useLocation();

	// Every route is a fresh view — jump to the top on navigation. Keyed on the
	// path only, so the grid's live `?q=` filtering doesn't yank the scroll.
	useLayoutEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname]);

	return (
		<div className='rvmp'>
			<header className='r-appbar'>
				<Link to={R.pokedex} className='r-logo' aria-label='Home'>
					<span className='r-logo-ball' />
					<b>GO&nbsp;Pokédex</b>
				</Link>
				<SearchBox />
				<SettingsMenu />
			</header>

			<main className='r-main'>
				<Outlet />
			</main>

			<nav className='r-bottomnav'>
				{NAV.map((n) => (
					<NavLink key={n.to} to={n.to} className={n.match(pathname) ? 'is-active' : ''}>
						<span className='r-bn-icon' aria-hidden>
							{n.icon}
						</span>
						<span className='r-bn-label'>{n.label}</span>
					</NavLink>
				))}
			</nav>
		</div>
	);
};

export default Shell;
