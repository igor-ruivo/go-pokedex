// For each class in a list, show every SCSS rule (file + selector + normalized
// body) that targets it, and flag whether the definitions agree.
//
//   node scripts/scss-where.mjs snapshots/_analysis/shared_classes.txt
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import scss from 'postcss-scss';

const list = readFileSync(process.argv[2], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const want = new Set(list);

const files = [];
const walk = (d) => {
	for (const e of readdirSync(d, { withFileTypes: true })) {
		const p = join(d, e.name);
		if (e.isDirectory()) walk(p);
		else if (e.name.endsWith('.scss')) files.push(p);
	}
};
walk('src');

const norm = (rule) => {
	const decls = [];
	rule.each((n) => {
		if (n.type === 'decl') decls.push(`${n.prop}:${n.value.replace(/\s+/g, ' ').trim()}`);
		else if (n.type === 'rule') decls.push(`${n.selector.replace(/\s+/g, ' ')}{…}`);
		else if (n.type === 'atrule') decls.push(`@${n.name} ${n.params}{…}`);
	});
	return decls.sort().join('; ');
};

const byClass = new Map();
for (const f of files) {
	const root = scss.parse(readFileSync(f, 'utf8'), { from: f });
	root.walkRules((rule) => {
		if (!rule.selector) return;
		for (const sel of rule.selectors) {
			const m = sel.match(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g) || [];
			for (const raw of m) {
				const c = raw.slice(1);
				if (!want.has(c)) continue;
				if (!byClass.has(c)) byClass.set(c, []);
				byClass.get(c).push({ f: f.replace(/\\/g, '/'), sel: sel.trim(), body: norm(rule), atparent: rule.parent?.type === 'atrule' ? `@${rule.parent.name} ${rule.parent.params}` : '' });
			}
		}
	});
}

let multi = 0;
let conflicting = 0;
for (const c of list) {
	const defs = byClass.get(c) || [];
	const filesSet = new Set(defs.map((d) => d.f));
	if (filesSet.size <= 1) continue;
	multi++;
	// "clean dedupe" = every def has the exact same selector + body + at-parent
	const sigs = new Set(defs.map((d) => `${d.atparent}|${d.sel}|${d.body}`));
	const clean = sigs.size === 1;
	if (!clean) conflicting++;
	console.log(`\n${c}  [${filesSet.size} files]  ${clean ? 'IDENTICAL' : 'DIFFERS'}`);
	for (const d of defs) console.log(`  ${d.f}  ${d.atparent ? d.atparent + '  ' : ''}${d.sel} { ${d.body} }`);
}
console.log(`\n${multi} classes defined in >1 file; ${conflicting} with differing definitions.`);
