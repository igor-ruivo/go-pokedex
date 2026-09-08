// Classifies every SCSS-defined class as component-private (used by exactly one
// .tsx) vs shared (2+) vs scss-only (0 — child/state selectors, dynamic).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const defined = readFileSync('snapshots/_analysis/scss_defined.txt', 'utf8').split('\n').filter(Boolean);
const tsxFiles = execSync('find src -name "*.tsx"').toString().trim().split('\n');
const src = Object.fromEntries(tsxFiles.map((f) => [f, readFileSync(f, 'utf8')]));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rows = [];
for (const c of defined) {
	if (c.startsWith('Mui') || c.startsWith('ReactVirtualized')) continue;
	const re = new RegExp(`(^|[^A-Za-z0-9_-])${esc(c)}([^A-Za-z0-9_-]|$)`);
	const hits = tsxFiles.filter((f) => re.test(src[f])).map((f) => f.split(/[\\/]/).pop());
	rows.push({ c, n: hits.length, files: hits });
}

const priv = rows.filter((r) => r.n === 1);
const shared = rows.filter((r) => r.n > 1);
const scssOnly = rows.filter((r) => r.n === 0);

console.log(`private (1 tsx): ${priv.length}   shared (2+ tsx): ${shared.length}   scss-only (0): ${scssOnly.length}`);
console.log('\n--- SHARED (used across components), by usage count ---');
console.log(shared.sort((a, b) => b.n - a.n).map((r) => `${r.c}(${r.n})`).join('  '));
console.log('\n--- SCSS-ONLY (child/state/dynamic selectors) ---');
console.log(scssOnly.map((r) => r.c).join('  '));

writeFileSync('snapshots/_analysis/shared_classes.txt', shared.map((r) => r.c).sort().join('\n') + '\n');
writeFileSync(
	'snapshots/_analysis/private_classes.tsv',
	priv.map((r) => `${r.c}\t${r.files[0]}`).sort().join('\n') + '\n'
);
writeFileSync('snapshots/_analysis/scssonly_classes.txt', scssOnly.map((r) => r.c).sort().join('\n') + '\n');
