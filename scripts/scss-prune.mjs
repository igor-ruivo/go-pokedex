// Removes SCSS rule blocks whose selector can never match, given a list of
// "dead" class names (never rendered on any captured page, never referenced in
// any .tsx). Uses a real SCSS parser (postcss-scss).
//
//   node scripts/scss-prune.mjs snapshots/_analysis/high_conf_dead.txt [--dry]
//
// A rule is dropped when EVERY comma-separated selector contains a dead class.
// Partially-dead selector lists are trimmed to their live selectors.
// At-rules (@media, @include, ...) are kept; empty @media/@supports are removed.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import scss from 'postcss-scss';

const [deadFile, ...flags] = process.argv.slice(2);
const DRY = flags.includes('--dry');
if (!deadFile) {
	console.error('usage: node scripts/scss-prune.mjs <deadClassListFile> [--dry]');
	process.exit(1);
}
const dead = new Set(
	readFileSync(deadFile, 'utf8')
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)
);

const selectorHasDeadClass = (selector) => {
	const re = /\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g;
	let m;
	while ((m = re.exec(selector))) {
		if (dead.has(m[1])) return true;
	}
	return false;
};

let removedRules = 0;
let trimmedRules = 0;

const prune = (root) => {
	root.walkRules((rule) => {
		// Skip selectors that are actually declarations inside @each/@for maps etc.
		if (!rule.selector) return;
		const parts = rule.selectors;
		const live = parts.filter((s) => !selectorHasDeadClass(s));
		if (live.length === 0) {
			rule.remove();
			removedRules++;
		} else if (live.length !== parts.length) {
			rule.selectors = live;
			trimmedRules++;
		}
	});
	// Drop now-empty @media / @supports / plain nesting wrappers.
	let changed = true;
	while (changed) {
		changed = false;
		root.walkAtRules(/^(media|supports|container)$/, (at) => {
			if (at.nodes && at.nodes.length === 0) {
				at.remove();
				changed = true;
			}
		});
		root.walkRules((rule) => {
			if (rule.nodes && rule.nodes.length === 0 && rule.selector) {
				rule.remove();
				changed = true;
			}
		});
	}
};

const dir = 'src';
let touched = 0;
const walk = (d) => {
	for (const name of readdirSync(d, { withFileTypes: true })) {
		const p = join(d, name.name);
		if (name.isDirectory()) walk(p);
		else if (name.name.endsWith('.scss')) {
			const before = readFileSync(p, 'utf8');
			const root = scss.parse(before, { from: p });
			const r0 = removedRules;
			const t0 = trimmedRules;
			prune(root);
			const after = root.toString();
			if (after !== before) {
				if (!DRY) writeFileSync(p, after);
				touched++;
				console.log(
					`${DRY ? '[dry] ' : ''}${p}: -${removedRules - r0} rules, ~${trimmedRules - t0} trimmed  (${before.length} -> ${after.length} b)`
				);
			}
		}
	}
};
walk(dir);
console.log(`\n${touched} files ${DRY ? 'would change' : 'changed'}; ${removedRules} rules removed, ${trimmedRules} selector-lists trimmed.`);
