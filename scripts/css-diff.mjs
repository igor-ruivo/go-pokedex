// Compares two snapshot dirs produced by css-snapshot.mjs. Matches elements by
// DOM position (not class), so class renames are invisible; only real
// computed-style or structural changes are reported.
//
//   node scripts/css-diff.mjs snapshots/baseline snapshots/after

import { readdir, readFile } from 'node:fs/promises';

const [A, B] = process.argv.slice(2);
if (!A || !B) {
	console.error('usage: node scripts/css-diff.mjs <baselineDir> <afterDir>');
	process.exit(1);
}

const load = async (dir) => {
	const out = {};
	for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
		out[f] = JSON.parse(await readFile(`${dir}/${f}`, 'utf8'));
	}
	return out;
};

const [a, b] = [await load(A), await load(B)];

let pagesClean = 0;
let pagesChanged = 0;
let pagesStructural = 0;
const report = [];

for (const file of Object.keys(a)) {
	if (!b[file]) {
		report.push(`\n### ${file}\n  MISSING in ${B}`);
		pagesStructural++;
		continue;
	}
	const byPath = (snap) => new Map(snap.elements.map((e) => [e.path, e]));
	const [ma, mb] = [byPath(a[file]), byPath(b[file])];

	const onlyA = [...ma.keys()].filter((p) => !mb.has(p));
	const onlyB = [...mb.keys()].filter((p) => !ma.has(p));

	const styleDiffs = [];
	for (const [path, ea] of ma) {
		const eb = mb.get(path);
		if (!eb) continue;
		const changed = [];
		for (const k of Object.keys(ea.styles)) {
			if (ea.styles[k] !== eb.styles[k]) {
				changed.push(`${k}: "${ea.styles[k]}" -> "${eb.styles[k]}"`);
			}
		}
		if (changed.length) styleDiffs.push({ path, tag: ea.tag, changed });
	}

	if (!onlyA.length && !onlyB.length && !styleDiffs.length) {
		pagesClean++;
		continue;
	}

	if (onlyA.length || onlyB.length) pagesStructural++;
	if (styleDiffs.length) pagesChanged++;

	const lines = [`\n### ${file}`];
	if (onlyA.length) lines.push(`  elements only in baseline (${onlyA.length}): ${onlyA.slice(0, 5).join(' | ')}${onlyA.length > 5 ? ' …' : ''}`);
	if (onlyB.length) lines.push(`  elements only in after (${onlyB.length}): ${onlyB.slice(0, 5).join(' | ')}${onlyB.length > 5 ? ' …' : ''}`);
	for (const d of styleDiffs.slice(0, 40)) {
		lines.push(`  [${d.tag}] ${d.path}`);
		for (const c of d.changed) lines.push(`      ${c}`);
	}
	if (styleDiffs.length > 40) lines.push(`  … and ${styleDiffs.length - 40} more changed elements`);
	report.push(lines.join('\n'));
}

console.log(`pages: ${pagesClean} clean, ${pagesChanged} with style diffs, ${pagesStructural} with structural diffs`);
console.log(report.join('\n') || '\nno differences.');
process.exit(pagesChanged || pagesStructural ? 1 : 0);
