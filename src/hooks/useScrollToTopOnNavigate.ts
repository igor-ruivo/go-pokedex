import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * The "page family" a pathname belongs to, for scroll-reset purposes. Tabs
 * and filters that live in the URL but stay conceptually on the *same* page
 * don't count as a new page — a Pokémon's tabs (/pokemon/pikachu/moves),
 * Rankings' league/type (/rankings/raid/fire), and Calendar's tab
 * (/calendar/bosses) are all real path segments, but switching between them
 * shouldn't reset your scroll any more than switching a query param would.
 * A different Pokémon/move, or an entirely different section of the site,
 * genuinely is a new page and should start at the top.
 */
const pageFamily = (pathname: string): string => {
	if (pathname.startsWith('/pokemon/')) return pathname.split('/').slice(0, 3).join('/'); // /pokemon/:speciesId
	if (pathname.startsWith('/rankings')) return '/rankings'; // league/type are tab-like here
	if (pathname.startsWith('/calendar')) return '/calendar'; // ditto for the calendar's tab
	return pathname; // /moves, /move/:id, /types, /trash, /settings, … — each is its own page
};

/**
 * Scrolls to the top on navigating to a genuinely different page (see
 * `pageFamily` above) — the browser gives you this for free on a real
 * multi-page site, but an SPA route change never actually reloads the
 * document, so the viewport just stays wherever it was scrolled to
 * otherwise (landing on a fresh Pokémon page still scrolled halfway down
 * the Rankings grid you clicked it from).
 *
 * Deliberately does *not* fire on back/forward (`navigationType === 'POP'`)
 * — that's the one case where staying scrolled where you were (or rather,
 * wherever the browser's own native per-history-entry scroll memory puts
 * you) is exactly what's wanted, and it already works without any of our
 * own code getting involved (see index.tsx's own history notes elsewhere in
 * this app for why we otherwise stay hands-off from scroll restoration).
 */
export const useScrollToTopOnNavigate = () => {
	const { pathname } = useLocation();
	const navigationType = useNavigationType();
	const lastFamily = useRef<string | null>(null);

	useLayoutEffect(() => {
		const family = pageFamily(pathname);
		const changed = lastFamily.current !== null && lastFamily.current !== family;
		lastFamily.current = family;
		if (changed && String(navigationType) !== 'POP') {
			window.scrollTo(0, 0);
		}
	}, [pathname, navigationType]);
};
