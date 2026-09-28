// One-off helper: computes each league icon's dominant, identity-carrying
// color, for hardcoding into src/lib/league-visuals.ts. Not part of the
// build — run manually with `node scripts/extract-league-colors.mjs`.
import sharp from 'sharp';

const ROOT = 'public/images/leagues';
const SOLO_FILES = {
	'great': `${ROOT}/great.png`,
	'ultra': `${ROOT}/ultra.png`,
	'master': `${ROOT}/master.png`,
	'little-500': `${ROOT}/cups/GBL_littlecup.png`,
	'remix-1500': `${ROOT}/cups/GBL_littlecupremix.png`,
	'retro-1500': `${ROOT}/cups/GBL_retrocup.png`,
	'catch-1500': `${ROOT}/cups/catch_cup.png`,
	'fantasy-1500': `${ROOT}/cups/fantasy_cup_icon.png`,
	'willpower-1500': `${ROOT}/cups/willpower_cup_icon.png`,
	'colormega-1500': `${ROOT}/cups/color-mega.png`,
	'laic2027-1500': `${ROOT}/cups/laic.png`,
};
// These three share one template (medal shape, white background, gray metal
// ring, identical pink "MEGA" ribbon) — their only genuinely distinguishing
// color is each one's own base-league tint, which a plain per-file histogram
// can't find (the shared ribbon/metal/background buckets outnumber it in
// every one of them). Cross-referencing the three against each other and
// excluding whatever they have in common isolates that tint instead.
const MEGA_FILES = {
	'mega-1500': `${ROOT}/cups/great-league-mega-edition.png`,
	'mega-2500': `${ROOT}/cups/ultra-league-mega-edition.png`,
	'mega-10000': `${ROOT}/cups/master-league-mega-edition.png`,
};

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const rgbToHsl = (r, g, b) => {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	const l = (max + min) / 2;
	const d = max - min;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	if (d !== 0) {
		switch (max) {
			case r:
				h = ((g - b) / d) % 6;
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
		}
		h *= 60;
		if (h < 0) h += 360;
	}
	return [h, s, l];
};

const bucketsOf = async (path, minSat = 0.15) => {
	const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const buckets = new Map();
	for (let i = 0; i < data.length; i += info.channels) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];
		if (a < 128) continue;
		const [, s, l] = rgbToHsl(r, g, b);
		if (l > 0.85 || l < 0.15 || s < minSat) continue; // background/outline/gray
		const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
		const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
		bucket.count++;
		bucket.r += r;
		bucket.g += g;
		bucket.b += b;
		buckets.set(key, bucket);
	}
	return buckets;
};

const topOf = (buckets, exclude = new Set()) => {
	let best = null;
	for (const [key, bucket] of buckets) {
		if (exclude.has(key)) continue;
		if (!best || bucket.count > best.count) best = bucket;
	}
	return best && hex(Math.round(best.r / best.count), Math.round(best.g / best.count), Math.round(best.b / best.count));
};

for (const [id, path] of Object.entries(SOLO_FILES)) {
	try {
		console.log(id, '=>', topOf(await bucketsOf(path)));
	} catch (e) {
		console.log(id, '=> ERROR', e.message);
	}
}

const megaBuckets = {};
for (const [id, path] of Object.entries(MEGA_FILES)) megaBuckets[id] = await bucketsOf(path, 0.4);
// A key counts as "shared template chrome" once it shows up with a real
// presence (not just anti-aliasing overlap) in more than one of the three.
const sharedKeys = new Set();
const allKeys = new Set(Object.values(megaBuckets).flatMap((b) => [...b.keys()]));
for (const key of allKeys) {
	const presentIn = Object.values(megaBuckets).filter((b) => (b.get(key)?.count ?? 0) > 500).length;
	if (presentIn > 1) sharedKeys.add(key);
}
for (const [id, buckets] of Object.entries(megaBuckets)) {
	console.log(id, '=>', topOf(buckets, sharedKeys));
}
