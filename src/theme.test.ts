import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const theme = stripComments(read('theme.css'));
const lightStart = theme.indexOf(".rvmp[data-theme='light'] {");
const dark = theme.slice(0, lightStart);
const light = theme.slice(lightStart);

const declared = (css: string) => new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

/** Tokens that are derived from other tokens, so the light theme gets them for free. */
const SAME_IN_BOTH = new Set(['--glow']);

describe('theme.css — the one place colours live', () => {
	it('has a dark block and a light block', () => {
		expect(lightStart).toBeGreaterThan(0);
		expect(declared(dark).size).toBeGreaterThan(50);
	});

	it('gives every colour of the dark theme its light counterpart', () => {
		const missing = [...declared(dark)].filter((name) => !declared(light).has(name) && !SAME_IN_BOTH.has(name));
		expect(missing).toEqual([]);
	});

	it('does not invent a colour only the light theme has', () => {
		const extra = [...declared(light)].filter((name) => !declared(dark).has(name));
		expect(extra).toEqual([]);
	});
});

describe('the rest of the stylesheets', () => {
	/**
	 * Colours that are allowed to stay literal because they are artwork with one fixed look in both themes: the logo's
	 * red, text laid over a photograph (and the scrim that makes it readable), and the glass on top of that photograph.
	 */
	const FIXED_ART = [
		/#ff5b5b/, // the logo's red (hero glow, equator line)
		/rgb\(5 8 14 \/ [0-9.]+\)/, // the scrim at the bottom of an event photograph
		/rgb\(255 255 255 \/ 0\.(?:1[68]|28)\)/, // frosted pill and glass plates on a photograph
		/rgb\(10 14 22 \/ 0\.5\)/, // the dark glass behind an icon on a photograph
		/rgb\(244 247 251 \/ 0\.78\)/, // light text on a photograph
		/#f4f7fb/, // light text on a photograph
		/#fff\b/, // the white end of a colour-mix
		/#b91c1c/, // the darker red end of a badge's colour-mix
		/var\(--[a-z-]+, #[0-9a-f]{3,8}\)/, // a fallback value inside var()
		/#a855f7/, // fallback of a var()
	];

	const literals = (file: string) => {
		const css = stripComments(read(file));
		const found: Array<string> = [];
		for (const line of css.split('\n')) {
			let rest = line;
			for (const allowed of FIXED_ART) rest = rest.replace(new RegExp(allowed.source, 'g'), '');
			for (const m of rest.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g)) {
				// the shadow colour is a token's channel list, not a literal
				if (m[0].includes('var(')) continue;
				found.push(`${file}: ${line.trim()}`);
			}
		}
		return found;
	};

	for (const file of ['components.css', 'teams.css', 'home.css', 'menu.css', 'rvmp.css']) {
		it(`${file} uses no colour of its own`, () => {
			expect(literals(file)).toEqual([]);
		});
	}
});
