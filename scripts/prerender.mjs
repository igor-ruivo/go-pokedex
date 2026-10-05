// Prerenders every Pokémon and move page to real static HTML at deploy time
// (see package.json's `deploy` script — this deliberately does NOT run as
// part of `build`, which CI uses on every push/PR: it's slow (a few minutes)
// and depends on fetching external data, neither of which CI should pay for).
//
// `--static-only` (the `deploy:lite` script) renders only the fixed pages (home, rankings, teams, calendar…) and the
// sitemap, and leaves every /pokemon/<id> and /move/<id> page alone — those are ~1,900 of the ~1,930 pages and nearly
// all of the time.
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

import { padImage } from './pad-image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://go-pokedex.com';
const PORT = 4321;
const STATIC_ONLY = process.argv.includes('--static-only');

// Must match src/utils/Configs.ts — duplicated here because this script runs
// under plain Node (no Vite/TS transform), not imported from the app itself.
const GAMEMASTER_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const MOVES_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/moves.json';
const PVP_URLS = [
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/great-league-pvp.json',
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/ultra-league-pvp.json',
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/master-league-pvp.json',
];
const dpsUrl = (type) =>
	`https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/${type}-raid-dps-rank.json`;

// Pages rendered at once. Each page runs the whole app (it processes the full game master), so this is CPU-bound
// and more tabs is *slower*, not faster: measured on 154 pages, 2 → 104s, 3 → 74s, 4 → 69s, 6 → 75s, 8 → 84s, 12 → 122s.
// 4 is the default; PRERENDER_CONCURRENCY overrides it (worth re-measuring on a machine with a different CPU).
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY) || 4;
// A page that times out or hits a transient error is tried again this many times before it is reported as failed.
const RETRIES = 2;

const STATIC_PAGES = [
	{
		path: '/',
		title: 'GO Pokédex',
		description:
			'Live Pokémon GO events and raids, PvP and raid rankings, a team builder that knows your collection, and search strings to clean your storage.',
	},
	{
		path: '/rankings/pokedex',
		title: 'Pokédex — GO Pokédex',
		description:
			'A complete Pokémon GO Pokédex — search and analyse Pokémon IVs, stats, PvP rankings and raid counters.',
	},
	{
		path: '/about',
		title: 'About and Credits — GO Pokédex',
		description:
			'What GO Pokédex is, who it is built on, what it stores about you, and the unofficial-fan-project disclaimer.',
	},
	{
		path: '/rankings/great',
		title: 'Great League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Great League (1500 CP), with counters and matchups.',
		image: `${SITE}/images/leagues/great.png`,
	},
	{
		path: '/rankings/ultra',
		title: 'Ultra League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Ultra League (2500 CP), with counters and matchups.',
		image: `${SITE}/images/leagues/ultra.png`,
	},
	{
		path: '/rankings/master',
		title: 'Master League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Master League, with counters and matchups.',
		image: `${SITE}/images/leagues/master.png`,
	},
	{
		path: '/rankings/raid',
		title: 'Best Raid Attackers — GO Pokédex',
		description: 'Top Pokémon GO raid attackers ranked by DPS, TDO and eDPS, per type.',
		image: `${SITE}/images/og/raids/tier-5.png`,
	},
	{
		path: '/teams',
		title: 'PvP Team Builder — GO Pokédex',
		description:
			'Rate a team of 3 for Pokémon GO Great, Ultra and Master League: threat score, type coverage, bulk, and the best lead, switch and closer order.',
		image: `${SITE}/images/leagues/great.png`,
	},
	{
		path: '/teams/top',
		title: 'Best PvP Teams — GO Pokédex',
		description:
			'The best 3-Pokémon teams for Pokémon GO Great, Ultra and Master League, ranked with their best movesets and top IVs.',
		image: `${SITE}/images/leagues/master.png`,
	},
	{
		path: '/teams/favorites',
		title: 'Favorite PvP Teams — GO Pokédex',
		description: 'Your saved Pokémon GO PvP teams, rated for Great, Ultra and Master League.',
		image: `${SITE}/images/leagues/great.png`,
	},
	{
		path: '/teams/collection',
		title: 'My Pokémon Collection — GO Pokédex',
		description:
			'Save Pokémon builds by league, customize their moves and IVs, and compare teams made from your collection.',
		image: `${SITE}/images/leagues/great.png`,
	},
	{
		path: '/moves',
		title: 'Moves — GO Pokédex',
		description: 'Every fast and charged move in Pokémon GO, with PvE and PvP stats.',
	},
	{
		path: '/types',
		title: 'Type Chart — GO Pokédex',
		description: 'The full Pokémon GO type-effectiveness chart.',
		image: `${SITE}/images/og/types/psychic.png`,
	},
	{
		path: '/calendar/events',
		title: 'Events Calendar — GO Pokédex',
		description: 'Current and upcoming Pokémon GO events, raid bosses, spawns and eggs.',
		image: `${SITE}/images/og/nav/calendar.png`,
	},
	{
		path: '/calendar/bosses',
		title: 'Current Raid Bosses — GO Pokédex',
		description: 'The current Pokémon GO raid boss lineup, by tier.',
		image: `${SITE}/images/og/raids/mega.png`,
	},
	{
		path: '/calendar/max',
		title: 'Current Max Battles — GO Pokédex',
		description: 'The Dynamax and Gigantamax Pokémon in Pokémon GO Max Battles right now, by tier.',
		image: `${SITE}/images/og/nav/calendar.png`,
	},
	{
		path: '/calendar/spawns',
		title: 'Current Spawns — GO Pokédex',
		description: 'What’s currently spawning in the wild in Pokémon GO.',
		image: `${SITE}/images/og/nav/spawns.png`,
	},
	{
		path: '/calendar/rockets',
		title: 'Team GO Rocket Lineups — GO Pokédex',
		description: 'Current Team GO Rocket grunt, leader and boss Pokémon lineups.',
		image: `${SITE}/images/og/NPC/giovanni.png`,
	},
	{
		path: '/calendar/eggs',
		title: 'Egg Chart — GO Pokédex',
		description: 'The current Pokémon GO egg-hatch chart, by distance.',
		image: `${SITE}/images/og/eggs/10km.png`,
	},
	{
		path: '/search-strings/non-meta-relevant',
		title: 'Mass Delete Non-Meta Pokémon — GO Pokédex',
		description:
			'Generate a Pokémon GO search-bar query that finds every catch that isn’t competitively relevant anywhere — ' +
			'not in Great, Ultra, or Master League, and not in raids — so you can clear them out in one pass.',
		image: `${SITE}/images/og/nav/search-strings.png`,
	},
	{
		path: '/search-strings/non-perfect-ivs',
		title: 'Mass Delete Non-Perfect IV Pokémon — GO Pokédex',
		description:
			'Generate a Pokémon GO search-bar query that finds every catch that isn’t a perfect (100%) IV Pokémon, ' +
			'regardless of whether the species itself is currently good or bad in the meta.',
		image: `${SITE}/images/og/nav/search-strings.png`,
	},
	{
		path: '/search-strings/tradeable',
		title: 'Find Pokémon Worth Trading — GO Pokédex',
		description:
			'Generate a Pokémon GO search-bar query for catches worth trading away — meta-relevant for Master League or ' +
			'raids, with IVs that still have room to improve.',
		image: `${SITE}/images/og/nav/search-strings.png`,
	},
];

// Must match src/lib/types.ts's RAID_TYPE_KEYS — duplicated for the same
// reason as GAMEMASTER_URL above (this script can't import a .ts file
// directly). Normal is excluded: it's the only type with zero
// super-effective matchups against anything, so there's no
// /rankings/raid/normal page, and dex-server doesn't generate a
// normal-raid-dps-rank.json to prerender structured data from.
const RAID_TYPE_KEYS = [
	'bug',
	'dark',
	'dragon',
	'electric',
	'fairy',
	'fighting',
	'fire',
	'flying',
	'ghost',
	'grass',
	'ground',
	'ice',
	'poison',
	'psychic',
	'rock',
	'steel',
	'water',
];

// One real, shareable/crawlable URL per raid type (e.g. /rankings/raid/fire)
// — "best fire type attackers" is a real search, and a query param alone
// (`?type=fire`) can't be prerendered as a distinct page on a static host:
// GitHub Pages only looks at the URL *path* to pick a file, so every
// `?type=` variant of `/rankings/raid` would resolve to the exact same file
// and silently overwrite each other. See Rankings.tsx for how the path
// segment and the `?type=` query param coexist without fighting.
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
for (const t of RAID_TYPE_KEYS) {
	STATIC_PAGES.push({
		path: `/rankings/raid/${t}`,
		title: `Best ${capitalize(t)} Raid Attackers — GO Pokédex`,
		description: `Top ${capitalize(t)}-type Pokémon GO raid attackers ranked by DPS, TDO and eDPS.`,
		image: `${SITE}/images/og/types/${t}.png`,
	});
}

// Selectors that appear once a static page has its real content on screen. The first match wins; a page with no entry (or
// whose data legitimately comes back empty) is saved after the wait times out, which is only a delay, never a failure.
const READY_SELECTORS = [
	[/^\/$/, '.h-faces .h-avatar, .h-leagues .h-top-link, .h-raids .h-raid-link'],
	[/^\/about$/, '.h-prose h2'],
	[/^\/rankings\/raid\/\w+$/, '.r-rank-row, .r-ctr-row'],
	[/^\/rankings\/raid$/, '.r-rank-head'],
	[/^\/rankings\//, '.r-rank-row, .r-pc'],
	[/^\/teams\/top$/, '.r-tm-board-card'],
	[/^\/teams\/collection$/, '.r-tm-collection-count, .r-tm-empty, .r-tm-card'],
	[/^\/teams\/favorites$/, '.r-tm-board-card, .r-tm-empty'],
	[/^\/teams$/, '.r-tm-card'],
	[/^\/moves$/, '.r-move-row, .r-mv, main li'],
	[/^\/types$/, '.r-eff-t, .r-tc-cell'],
	[/^\/calendar\//, '.r-event, .r-mini, .r-rocket-tier, .r-egglist, .r-muted'],
	[/^\/search-strings\//, '.r-md-mode-seg, .r-md-compute, button'],
];
const readySelector = (routePath) => READY_SELECTORS.find(([re]) => re.test(routePath))?.[1];

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
// The generic logo (a square icon) isn't really "large image" material the
// way a Pokémon/move's own sprite is — `summary` suits it better than
// `summary_large_image`, which some clients render as a big banner crop.
const LOGO_IMAGE = `${SITE}/logo512.png`;

// ---- structured data (schema.org / JSON-LD) --------------------------------
// A `<script type="application/ld+json">` block describing the page in a
// vocabulary search engines understand, alongside (not instead of) the
// title/meta tags above. It doesn't move rankings on its own, but it's how
// Google knows to render a breadcrumb trail instead of a raw URL under a
// result, and it's what a `WebSite` + `SearchAction` entry needs to be
// eligible for a sitelinks search box. Only baked into the prerendered HTML
// (not mirrored client-side in usePageMeta.ts) — this is exclusively for
// crawlers reading the static response, unlike the title/OG tags which also
// matter for what a real visitor's tab shows after client-side navigation.
const BREADCRUMB_BASE = { '@type': 'ListItem', 'position': 1, 'name': 'GO Pokédex', 'item': SITE };
const breadcrumbList = (crumbs) => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	'itemListElement': [
		BREADCRUMB_BASE,
		...crumbs.map((c, i) => ({ '@type': 'ListItem', 'position': i + 2, 'name': c.name, 'item': `${SITE}${c.path}` })),
	],
});
const websiteSchema = () => ({
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	'name': 'GO Pokédex',
	'url': SITE,
	'potentialAction': {
		'@type': 'SearchAction',
		'target': { '@type': 'EntryPoint', 'urlTemplate': `${SITE}/?q={search_term_string}` },
		'query-input': 'required name=search_term_string',
	},
});
/** Top-10 `ItemList` for a ranking page — `entries` is speciesId, already
 *  ranked (as every rank feed this script fetches already comes sorted). */
const rankingItemList = (name, entries, gamemaster) => ({
	'@context': 'https://schema.org',
	'@type': 'ItemList',
	name,
	'itemListElement': entries
		.filter((e) => gamemaster[e.speciesId] && !gamemaster[e.speciesId].aliasId)
		.slice(0, 10)
		.map((e, i) => ({
			'@type': 'ListItem',
			'position': i + 1,
			'name': gamemaster[e.speciesId].speciesName,
			'url': `${SITE}/pokemon/${e.speciesId}`,
		})),
});

const applyMeta = (page, { url, title, description, image, jsonLd }) =>
	page.evaluate(
		({ url, title, description, image, isCustomImage, jsonLd }) => {
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
			upsert('meta[name="twitter:card"]', {
				name: 'twitter:card',
				content: isCustomImage ? 'summary_large_image' : 'summary',
			});
			upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
			upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
			upsert('meta[property="og:image"]', { property: 'og:image', content: image });
			upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
			document.querySelectorAll('script[data-ld]').forEach((el) => el.remove());
			for (const graph of jsonLd ?? []) {
				const script = document.createElement('script');
				script.type = 'application/ld+json';
				script.dataset.ld = 'true';
				script.textContent = JSON.stringify(graph);
				document.head.appendChild(script);
			}
		},
		{ url, title, description, image: image || LOGO_IMAGE, isCustomImage: Boolean(image), jsonLd: jsonLd ?? [] }
	);

/** Takes the render's own theme out of the markup (the <html> one and the app root's), so the page is not dark for a light visitor until its scripts run. */
const withoutTheme = (html) =>
	html
		.replace(/(<html\b[^>]*?)\sdata-theme="[^"]*"/, '$1')
		.replace(/(<html\b[^>]*?)\sstyle="color-scheme:[^"]*"/, '$1')
		.replace(/(<div class="rvmp"[^>]*?)\sdata-theme="[^"]*"/, '$1');

const savePage = async (routePath, rawHtml) => {
	const html = withoutTheme(rawHtml);
	const dir = path.join(DIST, routePath === '/' ? '' : routePath);
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'index.html'), html, 'utf8');
};

/** A unit of work with a name, so a failure can say *which* page it was. */
const task = (label, run) => ({ label, run });

/**
 * Runs `tasks` with at most `limit` in flight at once. A task that throws is retried up to RETRIES more times;
 * every failed attempt is logged with the page's name, the attempt number and the error, and what finally
 * happened (recovered, or gave up) is returned so the run can end with a full account instead of a bare count.
 */
const runPool = async (tasks, limit) => {
	let i = 0;
	const failed = [];
	const recovered = [];
	const workers = Array.from({ length: limit }, async () => {
		while (i < tasks.length) {
			const { label, run } = tasks[i++];
			let lastError;
			for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
				try {
					await run();
					lastError = undefined;
					if (attempt > 1) {
						recovered.push({ label, attempts: attempt });
						console.log(`  ✓ ${label} — worked on attempt ${attempt}`);
					}
					break;
				} catch (err) {
					lastError = err;
					const firstLine = String(err.message ?? err).split('\n')[0];
					console.error(`  ✗ ${label} — attempt ${attempt}/${RETRIES + 1}: ${firstLine}`);
				}
			}
			if (lastError) failed.push({ label, message: String(lastError.message ?? lastError).split('\n')[0] });
		}
	});
	await Promise.all(workers);
	return { failed, recovered };
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

	// Precomputed rank feeds for the ranking pages' `ItemList` structured
	// data — already sorted by rank, so no need to replicate the app's own
	// (much heavier, worker-based) ranking computation here.
	console.log('Fetching ranking data for structured data…');
	const [greatPvp, ultraPvp, masterPvp, ...raidDpsByType] = await Promise.all([
		...PVP_URLS.map((u) => fetch(u).then((r) => r.json())),
		...RAID_TYPE_KEYS.map((t) => fetch(dpsUrl(t)).then((r) => r.json())),
	]);
	const pvpTop10 = [greatPvp, ultraPvp, masterPvp].map((list) => Object.values(list).sort((a, b) => a.rank - b.rank));
	const raidTop10ByType = Object.fromEntries(
		RAID_TYPE_KEYS.map((t, i) => [t, Object.values(raidDpsByType[i]).sort((a, b) => a.rank - b.rank)])
	);

	// For a quick local smoke test without paying the full ~1,900-page cost:
	// `PRERENDER_LIMIT=20 pnpm run prerender`.
	const limit = process.env.PRERENDER_LIMIT ? Number(process.env.PRERENDER_LIMIT) : undefined;
	const pokemonList = Object.values(gamemaster)
		.filter((p) => !p.aliasId)
		.slice(0, limit);
	// Hidden Power is one page (the app lists its 16 typed moves as the one generic move, see `withGenericHiddenPower`): the typed
	// ids have no page of their own, so they are not prerendered — the generic one is.
	const isHiddenPowerVariant = (id) => /^HIDDEN_POWER_[A-Z]+$/.test(id);
	const variants = Object.values(moves).filter((m) => isHiddenPowerVariant(m.moveId));
	const moveList = [
		...Object.values(moves).filter((m) => !isHiddenPowerVariant(m.moveId)),
		...(variants.length > 0
			? [
					{
						...variants[0],
						moveId: 'HIDDEN_POWER',
						type: 'normal',
						moveName: variants[0].groupName ?? variants[0].moveName,
					},
				]
			: []),
	].slice(0, limit);
	console.log(`${pokemonList.length} Pokémon, ${moveList.length} moves.`);

	const server = await startServer();
	const browser = await chromium.launch();
	// One shared context (not a fresh `browser.newPage()` per task — that
	// creates a brand-new incognito-style context each time, so nothing
	// carries over): the query-persister cache and HTTP cache actually help
	// across ~1,900 loads of the *same* multi-MB game-master/moves JSON this
	// way, instead of every single page re-fetching them from scratch.
	const context = await browser.newContext();
	// The snapshot only needs the markup, never the pixels: every image request is answered at once with a 1×1
	// transparent PNG (not aborted — an aborted image would fire the app's onError fallbacks and change the HTML).
	// It removes thousands of sprite downloads, which is most of what each page used to wait for.
	const PIXEL = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
		'base64'
	);
	if (process.env.PRERENDER_STUB_IMAGES !== '0')
		await context.route('**/*', (route) =>
			route.request().resourceType() === 'image'
				? route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
				: route.continue()
		);
	const startedAt = Date.now();

	let done = 0;
	const total = STATIC_PAGES.length + (STATIC_ONLY ? 0 : pokemonList.length + moveList.length);
	const report = () => {
		done++;
		if (done % 100 === 0 || done === total) {
			const elapsed = (Date.now() - startedAt) / 1000;
			const remaining = (elapsed / done) * (total - done);
			console.log(`  ${done}/${total} — ${elapsed.toFixed(0)}s elapsed, about ${remaining.toFixed(0)}s left`);
		}
	};
	/** A fresh tab for one page, always closed again — also when the page throws. */
	const withPage = async (fn) => {
		const page = await context.newPage();
		try {
			return await fn(page);
		} finally {
			await page.close().catch(() => {});
		}
	};

	// Home is its own page now; the Pokédex lives at /rankings/pokedex. Moves does have its own real
	// `/moves` page, so that gets a real 3-level trail.
	const stripSuffix = (title) => title.replace(/ — GO Pokédex$/, '');
	const jsonLdForStaticPage = (routePath, title) => {
		if (routePath === '/') return [websiteSchema()];
		const graphs = [breadcrumbList([{ name: stripSuffix(title), path: routePath }])];
		const leagueIdx = { '/rankings/great': 0, '/rankings/ultra': 1, '/rankings/master': 2 }[routePath];
		if (leagueIdx !== undefined) graphs.push(rankingItemList(stripSuffix(title), pvpTop10[leagueIdx], gamemaster));
		const raidType = /^\/rankings\/raid\/(\w+)$/.exec(routePath)?.[1];
		if (raidType) graphs.push(rankingItemList(stripSuffix(title), raidTop10ByType[raidType], gamemaster));
		return graphs;
	};

	const staticTasks = STATIC_PAGES.map(({ path: routePath, title, description, image }) =>
		task(routePath, () =>
			withPage(async (page) => {
				await page.goto(`http://localhost:${PORT}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
				const ready = readySelector(routePath);
				if (ready) await page.waitForSelector(ready, { timeout: 15000 }).catch(() => undefined);
				await applyMeta(page, {
					url: `${SITE}${routePath}`,
					title,
					description,
					image,
					jsonLd: jsonLdForStaticPage(routePath, title),
				});
				const html = await page.content();
				await savePage(routePath, html);
			}).then(report)
		)
	);

	// Pokémon sprites come from an external per-species URL (pokemon.imageUrl,
	// hosted off dex-server's own data) — unlike the local icons above, there's
	// no fixed set of these to pre-pad once by hand, so each one is fetched
	// and padded here, at prerender time, and saved alongside the page's own
	// static HTML under dist/images/og/pokemon/<speciesId>.png.
	const pokemonOgImage = async (p) => {
		if (!p.imageUrl) return undefined;
		const res = await fetch(p.imageUrl);
		if (!res.ok) return p.imageUrl; // fall back to the unpadded sprite rather than drop the image entirely
		const padded = await padImage(Buffer.from(await res.arrayBuffer()));
		const outDir = path.join(DIST, 'images', 'og', 'pokemon');
		await mkdir(outDir, { recursive: true });
		await writeFile(path.join(outDir, `${p.speciesId}.png`), padded);
		return `${SITE}/images/og/pokemon/${p.speciesId}.png`;
	};

	const pokemonTasks = pokemonList.map((p) => {
		const routePath = `/pokemon/${p.speciesId}`;
		return task(routePath, () =>
			withPage(async (page) => {
				// The share image is fetched while the page loads; failing to get it only costs the image.
				const imagePromise = pokemonOgImage(p).catch(() => undefined);
				await page.goto(`http://localhost:${PORT}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
				await page.waitForFunction(() => (document.querySelector('h1.r-name')?.textContent ?? '').trim().length > 0, {
					timeout: 15000,
				});
				const types = (p.types ?? []).join('/');
				await applyMeta(page, {
					url: `${SITE}${routePath}`,
					title: `${p.speciesName} — GO Pokédex`,
					description: `${p.speciesName}${types ? ` (${types})` : ''} in Pokémon GO — IVs, best moveset, PvP rankings and raid counters.`,
					image: await imagePromise,
					jsonLd: [breadcrumbList([{ name: p.speciesName, path: routePath }])],
				});
				const html = await page.content();
				await savePage(routePath, html);
			}).then(report)
		);
	});

	const moveTasks = moveList.map((m) => {
		const routePath = `/move/${encodeURIComponent(m.moveId)}`;
		return task(routePath, () =>
			withPage(async (page) => {
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
					image: m.type ? `${SITE}/images/og/types/${m.type}.png` : undefined,
					jsonLd: [
						breadcrumbList([
							{ name: 'Moves', path: '/moves' },
							{ name, path: routePath },
						]),
					],
				});
				const html = await page.content();
				await savePage(routePath, html);
			}).then(report)
		);
	});

	console.log(`Prerendering with ${CONCURRENCY} pages at once (up to ${RETRIES} retries each)…`);
	console.log('Prerendering static pages…');
	const staticResult = await runPool(staticTasks, CONCURRENCY);
	const none = { failed: [], recovered: [] };
	if (STATIC_ONLY) console.log('--static-only: skipping the Pokémon and move pages.');
	else console.log('Prerendering Pokémon pages…');
	const pokemonResult = STATIC_ONLY ? none : await runPool(pokemonTasks, CONCURRENCY);
	if (!STATIC_ONLY) console.log('Prerendering move pages…');
	const moveResult = STATIC_ONLY ? none : await runPool(moveTasks, CONCURRENCY);

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

	const failed = [staticResult, pokemonResult, moveResult].flatMap((r) => r.failed);
	const recovered = [staticResult, pokemonResult, moveResult].flatMap((r) => r.recovered);
	console.log(
		`\nPrerender finished in ${((Date.now() - startedAt) / 1000).toFixed(0)}s: ${done} of ${total} pages rendered.`
	);
	if (recovered.length > 0) {
		console.log(`${recovered.length} page(s) failed at first but succeeded on a retry:`);
		for (const { label, attempts } of recovered) console.log(`  ✓ ${label} (attempt ${attempts})`);
	}
	if (failed.length > 0) {
		console.error(
			`${failed.length} page(s) still failed after ${RETRIES + 1} attempts (left as the plain SPA shell — still functional, just not pre-rendered):`
		);
		for (const { label, message } of failed) console.error(`  ✗ ${label} — ${message}`);
		if (process.env.PRERENDER_STRICT) process.exitCode = 1;
	} else {
		console.log('Every page prerendered.');
	}
	console.log('Done.');
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
