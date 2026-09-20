// Exhaustive gap report for src/utils/GameTranslator.ts — the in-game
// search-string keyword translations (NOT the website-UI i18n layer; see
// scripts/check-i18n-parity.mjs for that one).
//
// Unlike the website UI, this data can't just be filled in on demand — every
// value has to be sourced from Niantic's own help site per locale, and for
// several languages that source genuinely doesn't show a literal example for
// every keyword. So this script's job isn't "fail the build until it's
// 100%" (see GameTranslator.ts's own header for why there's no runtime
// fallback instead) — it's "make every gap visible and countable," run on
// demand rather than wired into `lint`.
//
// Parses the source as text rather than importing it: GameTranslator.ts pulls
// in language-context.tsx, which pulls in src/i18n/index.ts's
// `import.meta.glob` — a Vite-only construct plain Node can't execute, same
// reason check-i18n-parity.mjs parses rather than imports.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TRANSLATOR_FILE = path.join(ROOT, 'src', 'utils', 'GameTranslator.ts');
const LANG_CONTEXT_FILE = path.join(ROOT, 'src', 'contexts', 'language-context.tsx');

const translatorSrc = readFileSync(TRANSLATOR_FILE, 'utf8');
const langContextSrc = readFileSync(LANG_CONTEXT_FILE, 'utf8');

// -- every GameLanguage member, in declaration order --
const enumBlockMatch = /export enum GameLanguage \{([\s\S]*?)\n\}/.exec(langContextSrc);
if (!enumBlockMatch) {
	console.error('Could not find `export enum GameLanguage { ... }` in language-context.tsx');
	process.exit(1);
}
const allLanguages = [...enumBlockMatch[1].matchAll(/^\s*(\w+)\s*=/gm)].map((m) => m[1]);

// -- which const holds which GameTranslatorKeys member's Map, from the
// `translations` registry itself, so no naming-convention guessing needed --
const registryBlockMatch =
	/const translations = new Map<GameTranslatorKeys, Map<GameLanguage, string>>\(\[([\s\S]*?)\n\]\);/.exec(
		translatorSrc
	);
if (!registryBlockMatch) {
	console.error('Could not find the `translations` registry in GameTranslator.ts');
	process.exit(1);
}
const keyToVar = [...registryBlockMatch[1].matchAll(/\[GameTranslatorKeys\.(\w+),\s*(\w+)\]/g)].map((m) => ({
	key: m[1],
	varName: m[2],
}));

// -- languages present in each const's own Map literal --
const gaps = [];
for (const { key, varName } of keyToVar) {
	const mapBlockMatch = new RegExp(`const ${varName} = new Map<GameLanguage, string>\\(\\[([\\s\\S]*?)\\n\\]\\);`).exec(
		translatorSrc
	);
	if (!mapBlockMatch) {
		console.error(`Could not find the Map literal for "${varName}" (key ${key})`);
		process.exit(1);
	}
	const present = new Set([...mapBlockMatch[1].matchAll(/GameLanguage\.(\w+)/g)].map((m) => m[1]));
	const missing = allLanguages.filter((l) => !present.has(l));
	if (missing.length > 0) gaps.push({ key, missing });
}

if (gaps.length === 0) {
	console.log(`No gaps — every GameTranslatorKeys entry has a confirmed value for all ${allLanguages.length} locales.`);
	process.exit(0);
}

const totalCells = keyToVar.length * allLanguages.length;
const totalGaps = gaps.reduce((sum, g) => sum + g.missing.length, 0);
console.log(`GameTranslator.ts coverage — ${totalCells - totalGaps}/${totalCells} confirmed, ${totalGaps} gap(s):\n`);
for (const { key, missing } of gaps) {
	console.log(`  ${key}: missing ${missing.join(', ')}`);
}
console.log(
	'\nEach gap above has no confirmed literal search-bar keyword for that locale (not guessed, not English-substituted —'
);
console.log(
	"see GameTranslator.ts's file header). Filling one in means finding it as an actual typed example on Niantic's own"
);
console.log('help page for that locale, not inferring it from a description.');
process.exit(1);
