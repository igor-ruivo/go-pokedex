// Moves *top-level, single-class* rules for the given classes out of component
// .scss files into a destination partial, preserving component-import order.
// Nested / compound / media-wrapped rules are left in place.
//
//   node scripts/scss-extract.mjs <classListFile> <destPartialPath> [--dry]

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import scss from 'postcss-scss';

const [listFile, dest, ...flags] = process.argv.slice(2);
const DRY = flags.includes('--dry');
if (!listFile || !dest) {
	console.error('usage: node scripts/scss-extract.mjs <classListFile> <destPartial> [--dry]');
	process.exit(1);
}
const want = new Set(readFileSync(listFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));

// Component .scss load order ~ the order their .tsx are first imported. Good enough:
// walk deterministically and treat that as the concat order.
const files = [];
const walk = (d) => {
	for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
		const p = join(d, e.name);
		if (e.isDirectory()) walk(p);
		else if (e.name.endsWith('.scss') && !p.includes('styles')) files.push(p);
	}
};
walk('src');

const extracted = [];
let removed = 0;

for (const f of files) {
	const css = readFileSync(f, 'utf8');
	const root = scss.parse(css, { from: f });
	let changed = false;
	root.walkRules((rule) => {
		if (rule.parent?.type !== 'root') return; // top-level only
		const sel = rule.selector.trim();
		const m = sel.match(/^\.(-?[A-Za-z_][A-Za-z0-9_-]*)$/); // exactly one class, nothing else
		if (!m || !want.has(m[1])) return;
		extracted.push({ cls: m[1], from: f.replace(/\\/g, '/'), text: rule.toString() });
		rule.remove();
		removed++;
		changed = true;
	});
	if (changed && !DRY) {
		let out = root.toString().replace(/\n{3,}/g, '\n\n').trimStart();
		if (out.trim() === '') out = '';
		writeFileSync(f, out ? out + '\n' : out);
	}
}

const header = `// ${dest.split('/').pop().replace(/^_|\.scss$/g, '')} — extracted shared rules (see scripts/scss-extract.mjs).\n// Loaded before component styles via src/index.scss.\n\n`;
const body = extracted.map((e) => `/* from ${e.from} */\n${e.text}`).join('\n\n') + '\n';

console.log(`${DRY ? '[dry] ' : ''}extracted ${extracted.length} rules (${new Set(extracted.map((e) => e.cls)).size} classes) from ${new Set(extracted.map((e) => e.from)).size} files -> ${dest}`);
if (!DRY) {
	const prev = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
	writeFileSync(dest, prev ? prev + '\n' + body : header + body);
}
