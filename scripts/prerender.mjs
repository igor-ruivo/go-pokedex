// Prerenders every Pokémon and move page to real static HTML at deploy time
// (see package.json's `deploy` script — this deliberately does NOT run as
// part of `build`, which CI uses on every push/PR: it's slow (a few minutes)
// and depends on fetching external data, neither of which CI should pay for).
//
// Why this exists at all: the site is a client-rendered SPA. Without this,
// every one of ~1,900 Pokémon/move URLs serves the exact same empty shell
// (same <title>, same description, no content) until a crawler's own JS
// engine executes React and fetches the data — which Googlebot *can* do, but
// slowly and unreliably at this scale, and which Discord/Reddit/Twitter's
// link-preview bots don't do at all. This script visits every one of those
// URLs in a real (headless) browser after `vite build`, lets the app render
// for real, corrects the page's <title>/meta/Open-Graph tags to match that
// specific Pokémon or move, and saves the resulting HTML as a real file at
// e.g. dist/pokemon/pikachu/index.html — so the very first response for that
// URL already has real content and correct metadata, no JS execution or
// render queue required. The client bundle still loads and takes over
// exactly as before (see index.tsx: `createRoot`, not `hydrateRoot` — this
// is a static snapshot for first paint/crawlers, not true SSR/hydration).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://go-pokedex.com';
const PORT = 4321;

// Must match src/utils/Configs.ts — duplicated here because this script runs
// under plain Node (no Vite/TS transform), not imported from the app itself.
const GAMEMASTER_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const MOVES_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/moves.json';

const CONCURRENCY = 8;

const STATIC_PAGES = [
	{
		path: '/',
		title: 'GO Pokédex',
		description:
			'A complete Pokémon GO Pokédex — search and analyse Pokémon IVs, stats, PvP rankings and raid counters.',
	},
	{
		path: '/rankings/great',
		title: 'Great League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Great League (1500 CP), with counters and matchups.',
	},
	{
		path: '/rankings/ultra',
		title: 'Ultra League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Ultra League (2500 CP), with counters and matchups.',
	},
	{
		path: '/rankings/master',
		title: 'Master League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Master League, with counters and matchups.',
	},
	{
		path: '/rankings/raid',
		title: 'Best Raid Attackers — GO Pokédex',
		description: 'Top Pokémon GO raid attackers ranked by DPS, TDO and eDPS, per type.',
	},
	{
		path: '/moves',
		title: 'Moves — GO Pokédex',
		description: 'Every fast and charged move in Pokémon GO, with PvE and PvP stats.',
	},
	{ path: '/types', title: 'Type Chart — GO Pokédex', description: 'The full Pokémon GO type-effectiveness chart.' },
	{
		path: '/calendar/events',
		title: 'Events Calendar — GO Pokédex',
		description: 'Current and upcoming Pokémon GO events, raid bosses, spawns and eggs.',
	},
];

// -- tiny static file server, mirroring GitHub Pages (exact file, else 404.html) --
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
};
const startServer = () =>
	new Promise((resolve) => {
		const server = createServer((req, res) => {
			const urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
			const filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
			readFile(filePath)
				.then((data) => {
					res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
					res.end(data);
				})
				// SPA fallback for the render pass itself — the *real* 404.html
				// redirect trick is what GitHub Pages uses in production; here we
				// just need any client-side route to load index.html directly.
				.catch(() =>
					readFile(path.join(DIST, 'index.html')).then((data) => {
						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.end(data);
					})
				);
		});
		server.listen(PORT, () => resolve(server));
	});

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Rewrites <title>/meta/canonical/Open-Graph tags in the page's own <head>
 *  to match this specific Pokémon or move, then returns the full HTML. */
const applyMeta = (page, { url, title, description, image }) =>
	page.evaluate(
		({ url, title, description, image }) => {
			document.title = title;
			const upsert = (selector, attrs) => {
				let el = document.querySelector(selector);
				if (!el) {
					el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
					document.head.appendChild(el);
				}
				for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
			};
			upsert('meta[name="description"]', { name: 'description', content: description });
			upsert('link[rel="canonical"]', { rel: 'canonical', href: url });
			upsert('meta[property="og:title"]', { property: 'og:title', content: title });
			upsert('meta[property="og:description"]', { property: 'og:description', content: description });
			upsert('meta[property="og:url"]', { property: 'og:url', content: url });
			upsert('meta[property="og:type"]', { property: 'og:type', content: 'website' });
			upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary' : 'summary_large_image' });
			upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
			upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
			if (image) {
				upsert('meta[property="og:image"]', { property: 'og:image', content: image });
				upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
			}
		},
		{ url, title, description, image }
	);

const savePage = async (routePath, html) => {
	const dir = path.join(DIST, routePath === '/' ? '' : routePath);
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'index.html'), html, 'utf8');
};

/** Runs `tasks` (each an async fn) with at most `limit` in flight at once. */
const runPool = async (tasks, limit) => {
	let i = 0;
	let failed = 0;
	const workers = Array.from({ length: limit }, async () => {
		while (i < tasks.length) {
			const idx = i++;
			try {
				await tasks[idx]();
			} catch (err) {
				failed++;
				console.error(`  ✗ ${err.message}`);
			}
		}
	});
	await Promise.all(workers);
	return failed;
};

const main = async () => {
	if (!existsSync(DIST)) {
		console.error('dist/ not found — run `pnpm run build` first.');
		process.exit(1);
	}

	console.log('Fetching game-master + moves data…');
	const [gamemaster, moves] = await Promise.all([
		fetch(GAMEMASTER_URL).then((r) => r.json()),
		fetch(MOVES_URL).then((r) => r.json()),
	]);

	// For a quick local smoke test without paying the full ~1,900-page cost:
	// `PRERENDER_LIMIT=20 pnpm run prerender`.
	const limit = process.env.PRERENDER_LIMIT ? Number(process.env.PRERENDER_LIMIT) : undefined;
	const pokemonList = Object.values(gamemaster)
		.filter((p) => !p.aliasId)
		.slice(0, limit);
	const moveList = Object.values(moves).slice(0, limit);
	console.log(`${pokemonList.length} Pokémon, ${moveList.length} moves.`);

	const server = await startServer();
	const browser = await chromium.launch();
	// One shared context (not a fresh `browser.newPage()` per task — that
	// creates a brand-new incognito-style context each time, so nothing
	// carries over): the query-persister cache and HTTP cache actually help
	// across ~1,900 loads of the *same* multi-MB game-master/moves JSON this
	// way, instead of every single page re-fetching them from scratch.
	const context = await browser.newContext();

	let done = 0;
	const total = STATIC_PAGES.length + pokemonList.length + moveList.length;
	const report = () => {
		done++;
		if (done % 100 === 0 || done === total) console.log(`  ${done}/${total}`);
	};

	const staticTasks = STATIC_PAGES.map(({ path: routePath, title, description }) => async () => {
		const page = await context.newPage();
		await page.goto(`http://localhost:${PORT}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
		await applyMeta(page, { url: `${SITE}${routePath}`, title, description });
		const html = await page.content();
		await page.close();
		await savePage(routePath, html);
		report();
	});

	const pokemonTasks = pokemonList.map((p) => async () => {
		const routePath = `/pokemon/${p.speciesId}`;
		const page = await context.newPage();
		await page.goto(`http://localhost:${PORT}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
		await page.waitForFunction(() => (document.querySelector('h1.r-name')?.textContent ?? '').trim().length > 0, {
			timeout: 15000,
		});
		const types = (p.types ?? []).join('/');
		await applyMeta(page, {
			url: `${SITE}${routePath}`,
			title: `${p.speciesName} — GO Pokédex`,
			description: `${p.speciesName}${types ? ` (${types})` : ''} in Pokémon GO — IVs, best moveset, PvP rankings and raid counters.`,
			image: p.imageUrl || undefined,
		});
		const html = await page.content();
		await page.close();
		await savePage(routePath, html);
		report();
	});

	const moveTasks = moveList.map((m) => async () => {
		const routePath = `/move/${encodeURIComponent(m.moveId)}`;
		const page = await context.newPage();
		await page.goto(`http://localhost:${PORT}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
		await page.waitForFunction(() => (document.querySelector('h1.r-name')?.textContent ?? '').trim().length > 0, {
			timeout: 15000,
		});
		const name = m.moveName?.en ?? m.moveId;
		const typeLabel = m.type ? m.type[0].toUpperCase() + m.type.slice(1) : '';
		await applyMeta(page, {
			url: `${SITE}${routePath}`,
			title: `${name} — GO Pokédex`,
			description: `${name} (${typeLabel}${m.isFast ? ' · Fast move' : ' · Charged move'}) — Pokémon GO move stats: damage, energy, DPS and best Pokémon that learn it.`,
		});
		const html = await page.content();
		await page.close();
		await savePage(routePath, html);
		report();
	});

	console.log('Prerendering static pages…');
	await runPool(staticTasks, CONCURRENCY);
	console.log('Prerendering Pokémon pages…');
	const pokemonFailed = await runPool(pokemonTasks, CONCURRENCY);
	console.log('Prerendering move pages…');
	const moveFailed = await runPool(moveTasks, CONCURRENCY);

	await browser.close();
	server.close();

	// -- sitemap.xml --
	const urls = [
		...STATIC_PAGES.map((s) => s.path),
		...pokemonList.map((p) => `/pokemon/${p.speciesId}`),
		...moveList.map((m) => `/move/${encodeURIComponent(m.moveId)}`),
	];
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
		.map((u) => `\t<url><loc>${escapeHtml(SITE + u)}</loc></url>`)
		.join('\n')}\n</urlset>\n`;
	await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');
	console.log(`sitemap.xml written with ${urls.length} URLs.`);

	const failed = pokemonFailed + moveFailed;
	if (failed > 0) {
		console.error(
			`${failed} page(s) failed to prerender (left as the plain SPA shell — still functional, just not pre-rendered).`
		);
	}
	console.log('Done.');
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
