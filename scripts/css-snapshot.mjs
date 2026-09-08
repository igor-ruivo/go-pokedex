// Captures per-element computed styles for every page/theme so a CSS refactor
// (including class renames) can be verified by comparing *styles by DOM position*
// rather than class names.
//
//   node scripts/css-snapshot.mjs <outDir> [baseUrl]
//
// Example:
//   node scripts/css-snapshot.mjs snapshots/baseline
//   node scripts/css-snapshot.mjs snapshots/after

import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const OUT_DIR = process.argv[2];
const BASE_URL = (process.argv[3] ?? 'http://localhost:3999').replace(/\/$/, '');
if (!OUT_DIR) {
	console.error('usage: node scripts/css-snapshot.mjs <outDir> [baseUrl]');
	process.exit(1);
}

const GAME_MASTER =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';

// The subset of computed-style properties that actually describe layout/appearance.
// Keeps snapshots readable and free of derived-value noise.
const PROPS = [
	'position', 'display', 'visibility', 'opacity', 'z-index', 'float', 'clear',
	'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
	'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
	'top', 'right', 'bottom', 'left',
	'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
	'justify-content', 'align-items', 'align-content', 'align-self', 'order', 'gap',
	'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
	'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
	'text-align', 'text-transform', 'text-decoration-line', 'white-space', 'text-overflow',
	'color', 'background-color', 'background-image', 'background-size', 'background-position',
	'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
	'border-style', 'border-top-color', 'border-radius',
	'box-shadow', 'outline-width', 'outline-style',
	'transform', 'transform-origin', 'transition-property', 'transition-duration',
	'overflow-x', 'overflow-y', 'object-fit', 'cursor', 'pointer-events',
	'aspect-ratio', 'inset', 'filter', 'backdrop-filter',
];

async function pickSpecies() {
	const res = await fetch(GAME_MASTER);
	const gm = await res.json();
	const all = Object.values(gm).filter((p) => !p.aliasId);
	const normal = all.find((p) => !p.isShadow && !p.isMega);
	const shadow = all.find((p) => p.isShadow);
	return { normal: normal?.speciesId ?? 'bulbasaur', shadow: shadow?.speciesId ?? 'bulbasaur_shadow' };
}

const slug = (route) => route.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'root';

async function snapshotPage(context, route, theme) {
	const page = await context.newPage();
	await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
	// ConfigKeys.DefaultTheme === 0 -> localStorage key "0"; ThemeOptions Light=0 Dark=1.
	await page.addInitScript((t) => {
		try {
			localStorage.setItem('0', t === 'dark' ? '1' : '0');
		} catch {
			/* private mode */
		}
	}, theme);

	await page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'domcontentloaded' });
	await page.waitForSelector('#root *', { timeout: 20000 }).catch(() => {});
	// Let React render + the data queries settle.
	await page.waitForTimeout(3500);
	await page.evaluate(() => document.fonts?.ready).catch(() => {});

	const data = await page.evaluate((props) => {
		const path = (el) => {
			const parts = [];
			let node = el;
			while (node && node.nodeType === 1 && node.id !== 'root') {
				const parent = node.parentElement;
				if (!parent) break;
				const tag = node.tagName.toLowerCase();
				const sibs = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
				const idx = sibs.indexOf(node) + 1;
				parts.unshift(`${tag}:nth-of-type(${idx})`);
				node = parent;
			}
			return parts.join('>');
		};

		const root = document.getElementById('root');
		const els = root ? Array.from(root.querySelectorAll('*')) : [];
		return els.map((el) => {
			const cs = getComputedStyle(el);
			const styles = {};
			for (const p of props) styles[p] = cs.getPropertyValue(p).trim();
			return {
				path: path(el),
				tag: el.tagName.toLowerCase(),
				classes: (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).sort(),
				textLen: (el.textContent || '').trim().length,
				childCount: el.children.length,
				styles,
			};
		});
	}, PROPS);

	await page.close();
	return { route, theme, count: data.length, elements: data };
}

(async () => {
	const { normal, shadow } = await pickSpecies();
	console.log(`species: normal=${normal} shadow=${shadow}`);

	const routes = [
		'/',
		'/great',
		'/ultra',
		'/master',
		'/raid',
		`/pokemon/${normal}/info`,
		`/pokemon/${normal}/moves`,
		`/pokemon/${normal}/counters`,
		`/pokemon/${normal}/tables`,
		`/pokemon/${normal}/strings`,
		`/pokemon/${shadow}/info`,
		'/calendar/events',
		'/calendar/bosses',
		'/calendar/spawns',
		'/calendar/rockets',
		'/calendar/eggs',
		'/trash-pokemon',
	];

	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch();

	for (const theme of ['light', 'dark']) {
		const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
		for (const route of routes) {
			const snap = await snapshotPage(context, route, theme);
			const file = `${OUT_DIR}/${theme}__${slug(route)}.json`;
			await writeFile(file, JSON.stringify(snap, null, '\t'));
			console.log(`  ${theme.padEnd(5)} ${route.padEnd(32)} ${snap.count} elements -> ${file}`);
		}
		await context.close();
	}

	await browser.close();
	console.log('done.');
})();
