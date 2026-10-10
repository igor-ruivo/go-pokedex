import './index.css';
// Must initialize before App renders — components call useTranslation() at
// mount, and scripts/prerender.mjs needs real text in the first paint.
import './i18n';

import { type PropsWithChildren, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

// The page's saved markup (scripts/prerender.mjs) is for crawlers: index.html keeps it hidden (`data-booting`) until the
// app's own render is in the DOM — a layout effect runs before that first paint.
const Revealed = ({ children }: PropsWithChildren) => {
	useLayoutEffect(() => {
		document.documentElement.removeAttribute('data-booting');
	}, []);
	return children;
};

const root = createRoot(document.getElementById('root')!);
root.render(
	<Revealed>
		<App />
	</Revealed>
);
