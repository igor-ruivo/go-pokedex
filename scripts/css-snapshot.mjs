// Captures per-element computed styles for every page/theme (+ a few interaction
// states) so a CSS refactor incl. class renames can be verified by comparing
// styles *by DOM position* rather than class names.
//
//   node scripts/css-snapshot.mjs <outDir> [baseUrl]

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
	const gm = await (await fetch(GAME_MASTER)).json();
	const all = Object.values(gm).filter((p) => !p.aliasId);
	return {
		normal: all.find((p) => !p.isShadow && !p.isMega)?.speciesId ?? 'bulbasaur',
		shadow: all.find((p) => p.isShadow)?.speciesId ?? 'bulbasaur_shadow',
		// a fully-evolved, widely-ranked mon exercises more branches (ranks, counters, unranked panels…)
		strong:
			all.find((p) => /venusaur|charizard|blastoise|dragonite|tyranitar/.test(p.speciesId) && !p.isShadow && !p.isMega)
				?.speciesId ?? 'venusaur',
	};
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'root';

const CAPTURE = (props) => {
	const path = (el) => {
		const parts = [];
		let node = el;
		while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
			const parent = node.parentElement;
			if (!parent) break;
			const tag = node.tagName.toLowerCase();
			const sibs = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
			parts.unshift(`${tag}:nth-of-type(${sibs.indexOf(node) + 1})`);
			node = parent;
		}
		return parts.join('>') || 'html';
	};
	// Walk <html> down: covers <body> (theme classes live there), portals, MUI poppers.
	const els = [document.documentElement, ...document.querySelectorAll('*')];
	const uniq = Array.from(new Set(els));
	return uniq.map((el) => {
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
};

async function snap(context, { name, route, theme, setup }) {
	const page = await context.newPage();
	await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
	await page.addInitScript((t) => {
		try {
			localStorage.setItem('0', t === 'dark' ? '1' : '0');
		} catch {
			/* private mode */
		}
	}, theme);
	await page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'domcontentloaded' });
	await page.waitForSelector('#root *', { timeout: 20000 }).catch(() => {});
	await page.waitForTimeout(3500);
	await page.evaluate(() => document.fonts?.ready).catch(() => {});
	if (setup) {
		await setup(page).catch((e) => console.warn(`    setup "${name}" failed: ${e.message}`));
		await page.waitForTimeout(700);
	}
	const elements = await page.evaluate(CAPTURE, PROPS);
	await page.close();
	return { name, route, theme, count: elements.length, elements };
}

(async () => {
	const { normal, shadow, strong } = await pickSpecies();
	console.log(`species: normal=${normal} shadow=${shadow} strong=${strong}`);

	const pages = [
		'/', '/great', '/ultra', '/master', '/raid',
		`/pokemon/${normal}/info`, `/pokemon/${normal}/moves`, `/pokemon/${normal}/counters`,
		`/pokemon/${normal}/tables`, `/pokemon/${normal}/strings`,
		`/pokemon/${shadow}/info`,
		`/pokemon/${strong}/info`, `/pokemon/${strong}/counters`,
		'/calendar/events', '/calendar/bosses', '/calendar/spawns', '/calendar/rockets', '/calendar/eggs',
		'/trash-pokemon',
	];

	const scenarios = [
		...pages.map((route) => ({ name: slug(route), route })),
		{
			name: 'menu_open',
			route: '/',
			setup: async (p) => p.click('.navbar-menu'),
		},
		{
			name: 'search_open',
			route: '/',
			setup: async (p) => {
				await p.click('.navbar-section input, .navbar-section .MuiAutocomplete-root input');
				await p.keyboard.type('char');
			},
		},
		{
			name: 'scrolled',
			route: '/',
			setup: async (p) => {
				await p.evaluate(() => window.scrollTo(0, 1400));
				await p.mouse.wheel(0, 200);
			},
		},
	];

	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch();
	for (const theme of ['light', 'dark']) {
		const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
		for (const sc of scenarios) {
			const s = await snap(context, { ...sc, theme });
			const file = `${OUT_DIR}/${theme}__${s.name}.json`;
			await writeFile(file, JSON.stringify(s, null, '\t'));
			console.log(`  ${theme.padEnd(5)} ${s.name.padEnd(34)} ${s.count} el -> ${file}`);
		}
		await context.close();
	}
	await browser.close();
	console.log('done.');
})();
