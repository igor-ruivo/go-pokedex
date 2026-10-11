import './index.css';

import { type PropsWithChildren, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { hydrateStorage } from './utils/hydrate-storage';

// The page's saved markup (scripts/prerender.mjs) is for crawlers: index.html keeps it hidden (`data-booting`) until the
// app's own render is in the DOM — a layout effect runs before that first paint.
const Revealed = ({ children }: PropsWithChildren) => {
	useLayoutEffect(() => {
		document.documentElement.removeAttribute('data-booting');
	}, []);
	return children;
};

const boot = async () => {
	// Settings, the saved collection and favorite teams live in IndexedDB but are read synchronously all over the app (and by
	// i18n, as soon as it is imported), so they are loaded first — which is why neither i18n nor the app is imported statically.
	await hydrateStorage();
	// Must initialize before App renders — components call useTranslation() at
	// mount, and scripts/prerender.mjs needs real text in the first paint.
	await import('./i18n');
	const { default: App } = await import('./App');
	createRoot(document.getElementById('root')!).render(
		<Revealed>
			<App />
		</Revealed>
	);
};

void boot();
