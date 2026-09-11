import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { R } from '../lib/nav';
import { SearchBox } from './SearchBox';
import { SettingsMenu } from './SettingsMenu';

const NAV: Array<{ to: string; label: string; icon: string; hint: string; match: (p: string) => boolean }> = [
	{
		to: R.pokedex,
		label: 'Pokédex',
		icon: '▦',
		hint: 'Browse every Pokémon',
		match: (p) => p === '/' || p.startsWith('/pokemon'),
	},
	{
		to: R.rankings('great'),
		label: 'Rankings',
		icon: '🏆',
		hint: 'Best attackers per league and raid type',
		match: (p) => p.startsWith('/rankings'),
	},
	{
		to: R.calendar(),
		label: 'Calendar',
		icon: '🗓',
		hint: 'Events, raids, spawns and eggs',
		match: (p) => p.startsWith('/calendar'),
	},
	{ to: R.moves, label: 'Moves', icon: '⚡', hint: 'Every fast and charged move', match: (p) => p.startsWith('/move') },
	{ to: R.types, label: 'Types', icon: '🛡', hint: 'Type effectiveness chart', match: (p) => p.startsWith('/types') },
	{
		to: R.trash,
		label: 'Delete',
		icon: '🗑',
		hint: 'Mass-appraise trash candidates',
		match: (p) => p.startsWith('/trash'),
	},
];

const Shell = () => {
	const { pathname } = useLocation();

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
					<NavLink key={n.to} to={n.to} className={n.match(pathname) ? 'is-active' : ''} title={n.hint}>
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
