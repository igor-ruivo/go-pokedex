// One-off (re-run whenever a source icon changes): pre-pads every local
// icon used as an og:image — except the league icons and the site logo,
// which already have their own margin designed in — into
// public/images/og/<same relative path>, via padImage() (see pad-image.mjs).
// The results are checked in like any other asset: scripts/prerender.mjs
// and usePageMeta.ts reference the padded /images/og/... path directly, no
// padding work happens at request or deploy time for these.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { padImage, recolorBackground } from './pad-image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

const TYPE_KEYS = [
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
	'normal',
	'poison',
	'psychic',
	'rock',
	'steel',
	'water',
];

// Plain string = padded straight through. `{ rel, recolor }` runs
// `recolorBackground` first — the spawns icon bakes its own dark navy
// rounded-square background into the artwork (unlike the flat badges, which
// just sit on real transparency), so it needs that background actually
// cleared to transparency too, not just framed by padImage's own (already
// transparent) canvas around it.
const SOURCES = [
	...TYPE_KEYS.map((t) => `images/types/${t}.png`),
	'images/raids/tier-5.png',
	'images/raids/mega.png',
	'images/nav/calendar.png',
	{ rel: 'images/nav/spawns.png', recolor: { from: { r: 18, g: 23, b: 34 } } }, // navy -> transparent
	'images/NPC/giovanni.webp',
	'images/eggs/10km.png',
];

const run = async () => {
	for (const source of SOURCES) {
		const { rel, recolor } = typeof source === 'string' ? { rel: source, recolor: undefined } : source;
		const srcPath = path.join(PUBLIC, rel);
		const outPath = path.join(PUBLIC, 'images', 'og', rel.replace(/^images\//, '').replace(/\.\w+$/, '.png'));
		let buf = await readFile(srcPath);
		if (recolor) buf = await recolorBackground(buf, recolor);
		const padded = await padImage(buf);
		await mkdir(path.dirname(outPath), { recursive: true });
		await writeFile(outPath, padded);
		console.log(`padded ${rel} -> ${path.relative(PUBLIC, outPath)}`);
	}
};

run();
