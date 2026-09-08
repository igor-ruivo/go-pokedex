import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';

import { R } from '../lib/nav';

const NAV = [
	{ to: R.pokedex, label: 'Pokédex', icon: '▦', end: true },
	{ to: R.rankings('great'), label: 'Rankings', icon: '🏆', end: false },
	{ to: R.calendar(), label: 'Calendar', icon: '🗓', end: false },
	{ to: R.tools, label: 'Tools', icon: '🛠', end: false },
];

const Shell = () => {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const [q, setQ] = useState(params.get('q') ?? '');

	// keep the box in sync when the url changes elsewhere (e.g. clearing filters)
	useEffect(() => {
		setQ(params.get('q') ?? '');
	}, [params]);

	useEffect(() => {
		const id = setTimeout(() => {
			const next = q.trim();
			const current = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
			if ((current.get('q') ?? '') === next) return;
			void navigate(next ? `${R.pokedex}?q=${encodeURIComponent(next)}` : R.pokedex, { replace: true });
		}, 220);
		return () => clearTimeout(id);
	}, [q, navigate]);

	return (
		<div className='rvmp'>
			<header className='r-appbar'>
				<Link to={R.pokedex} className='r-logo' aria-label='Home'>
					<span className='r-logo-ball' />
					<b>GO&nbsp;Pokédex</b>
				</Link>
				<div className='r-search'>
					<span aria-hidden>⌕</span>
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder='Search Pokémon…'
						aria-label='Search Pokémon'
						enterKeyHint='search'
					/>
				</div>
				<Link to={R.settings} className='r-icon-btn' aria-label='Settings'>
					⚙
				</Link>
			</header>

			<main className='r-main'>
				<Outlet />
			</main>

			<nav className='r-bottomnav'>
				{NAV.map((n) => (
					<NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
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
