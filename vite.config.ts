import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// No config existed before this — every previous default (root, base '/',
// outDir 'dist', publicDir 'public', …) is kept as-is; this only adds the
// PWA plugin on top.
export default defineConfig({
	plugins: [
		VitePWA({
			// public/manifest.json (already linked from index.html) stays the
			// single source of truth for name/icons/colours — the plugin only
			// adds the service worker + its registration, not a second manifest.
			manifest: false,
			registerType: 'autoUpdate',
			// Runs during `vite build`, before scripts/prerender.mjs adds the
			// ~2,000 per-Pokémon/move HTML files to dist/ — so the precache
			// glob below only ever sees the SPA shell (index.html + hashed
			// JS/CSS/icons), never those, which is deliberate on two counts:
			// precaching thousands of individual pages would bloat the service
			// worker's install size for near-zero benefit (a visitor only ever
			// lands on one or two of them), and — more importantly — this site
			// cares about those pages staying live-fresh (PvP/raid rankings,
			// the calendar), which an offline cache would fight against. Only
			// the app shell itself is worth precaching.
			includeAssets: ['favicon.ico', 'logo.svg', 'logo192.png', 'logo512.png'],
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
				// Precached URLs get their own content hash from Vite already
				// (index-XXXX.js etc.), so a stale cache entry is never served
				// after a new deploy — `autoUpdate` activates the new service
				// worker (and its fresh precache) automatically, no user
				// interaction needed.
				cleanupOutdatedCaches: true,
			},
		}),
	],
});
