import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

// A hard reload restores whatever scroll position the tab had before reloading
// — usually well after this script runs, sometimes even after first paint. On
// a Pokémon's page that leaves a window where the collapsing top bar's initial
// visibility check runs against the *old* (not-yet-restored) scrollY, gets it
// right for that stale position, and then the browser's own restoration jumps
// the page again a moment later — reading as the bar flashing in and back out.
// Reload only (not back/forward, where restoring your place is expected):
// force the browser's own restoration off and start at the top instead, so
// there's nothing left to race.
const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (navEntry?.type === 'reload' && 'scrollRestoration' in window.history) {
	window.history.scrollRestoration = 'manual';
	window.scrollTo(0, 0);
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
