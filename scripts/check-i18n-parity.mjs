// Build-time gate for the website-UI translation layer (src/i18n/ — NOT the
// separate in-game/GameLanguage data translations). Two things fail the
// build:
//   1. A locale's JSON resources don't have exactly the same key set as the
//      others, for every namespace — no locale may be missing a key another
//      has, and none may have a stray extra one.
//   2. Something in src/ calls t('ns:key.path') for a key that doesn't exist
//      in the reference locale (en) — a typo or an added call with no
//      matching resource entry.
//
// This is what "no hidden fallback" means in practice: i18next's own
// fallbackLng would quietly render English for a missing pt-BR key at
// runtime and nobody would notice. This script is what turns that into a
// build failure instead, so parity is enforced before merge, not discovered
// by a user.
//
// Convention this relies on: every t() call in the app uses a fully
// qualified 'namespace:key.path' string literal (not the useTranslation()
// default-namespace shorthand) — see any migrated component for the pattern.
// That's what makes a static regex scan sufficient here, no real i18next
// runtime or AST parse required.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const SRC_DIR = path.join(ROOT, 'src');
const REFERENCE_LOCALE = 'en';

const walk = (dir, filterExt) => {
	const out = [];
	for (const entry of readdirSync(dir)) {
		if (entry === 'node_modules' || entry === 'dist') continue;
		const full = path.join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) out.push(...walk(full, filterExt));
		else if (filterExt.some((ext) => entry.endsWith(ext))) out.push(full);
	}
	return out;
};

/** { 'nav.calendarBadge_one': '...', 'app.name': '...' } from a nested object. */
const flatten = (obj, prefix = '') => {
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
		else out[key] = v;
	}
	return out;
};

const hasKeyOrPluralGroup = (keySet, key) => keySet.has(key) || [...keySet].some((k) => k.startsWith(`${key}_`));

// -- load every locale's namespaces --
const locales = readdirSync(LOCALES_DIR).filter((e) => statSync(path.join(LOCALES_DIR, e)).isDirectory());
if (!locales.includes(REFERENCE_LOCALE)) {
	console.error(`Reference locale "${REFERENCE_LOCALE}" not found under ${LOCALES_DIR}`);
	process.exit(1);
}

/** localeData[locale][namespace] = flattened key -> value map */
const localeData = {};
for (const locale of locales) {
	const dir = path.join(LOCALES_DIR, locale);
	localeData[locale] = {};
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		const ns = file.replace(/\.json$/, '');
		const parsed = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
		localeData[locale][ns] = flatten(parsed);
	}
}

let errors = [];

// -- 1. cross-locale parity, per namespace --
const referenceNamespaces = Object.keys(localeData[REFERENCE_LOCALE]);
for (const locale of locales) {
	if (locale === REFERENCE_LOCALE) continue;
	const localeNamespaces = Object.keys(localeData[locale]);

	for (const ns of referenceNamespaces) {
		if (!localeNamespaces.includes(ns)) {
			errors.push(`[${locale}] missing entire namespace "${ns}" (present in ${REFERENCE_LOCALE})`);
			continue;
		}
		const refKeys = new Set(Object.keys(localeData[REFERENCE_LOCALE][ns]));
		const localeKeys = new Set(Object.keys(localeData[locale][ns]));
		for (const k of refKeys) if (!localeKeys.has(k)) errors.push(`[${locale}] missing key "${ns}:${k}"`);
		for (const k of localeKeys)
			if (!refKeys.has(k)) errors.push(`[${locale}] extra key "${ns}:${k}" (not in ${REFERENCE_LOCALE})`);
	}
	for (const ns of localeNamespaces) {
		if (!referenceNamespaces.includes(ns))
			errors.push(`[${locale}] extra namespace "${ns}" (not in ${REFERENCE_LOCALE})`);
	}
}

// -- 2. every t('ns:key') / i18nKey="ns:key" call in source resolves against
// the reference locale --
const CALL_PATTERN = /\bt\(\s*(['"])([a-zA-Z0-9_-]+:[a-zA-Z0-9_.]+)\1/g;
const TRANS_PATTERN = /\bi18nKey=(['"])([a-zA-Z0-9_-]+:[a-zA-Z0-9_.]+)\1/g;
// A `t(` call whose first argument is a template literal (backtick) can't be
// statically resolved by CALL_PATTERN above — e.g. t(`common:nav.${key}.label`)
// silently escapes the check while looking checked. Treat any such call as an
// error: convert the call site to a literal per-branch t('ns:key') instead
// (see src/components/Shell.tsx's NAV array for the pattern), so every key
// this app ships stays grep-visible and this script's guarantee holds for
// real. This is what "no hidden fallback" (see project history) means for a
// dynamic key, not just a missing one.
const DYNAMIC_CALL_PATTERN = /\bt\(\s*`[^`]*\$\{/g;
const sourceFiles = walk(SRC_DIR, ['.ts', '.tsx']).filter((f) => !f.endsWith('.d.ts'));

for (const file of sourceFiles) {
	const content = readFileSync(file, 'utf8');
	const relPath = path.relative(ROOT, file);
	const lineOf = (index) => content.slice(0, index).split('\n').length;

	for (const match of content.matchAll(DYNAMIC_CALL_PATTERN)) {
		errors.push(
			`${relPath}:${lineOf(match.index)} uses a dynamic template-literal t() call — not statically verifiable, use a literal 'ns:key' per branch instead`
		);
	}

	for (const pattern of [CALL_PATTERN, TRANS_PATTERN]) {
		for (const match of content.matchAll(pattern)) {
			const [, , nsKey] = match;
			const [ns, ...keyParts] = nsKey.split(':');
			const key = keyParts.join(':');
			const ns_map = localeData[REFERENCE_LOCALE][ns];
			const line = lineOf(match.index);
			if (!ns_map) {
				errors.push(`${relPath}:${line} references unknown namespace "${ns}" in '${nsKey}'`);
				continue;
			}
			if (!hasKeyOrPluralGroup(new Set(Object.keys(ns_map)), key)) {
				errors.push(
					`${relPath}:${line} references missing key "${nsKey}" (no such key in ${REFERENCE_LOCALE}/${ns}.json)`
				);
			}
		}
	}
}

if (errors.length > 0) {
	console.error(`i18n parity check failed — ${errors.length} issue(s):\n`);
	for (const e of errors) console.error(`  ✗ ${e}`);
	console.error(
		'\nEvery locale must carry the exact same keys, and every t() call must resolve. See scripts/check-i18n-parity.mjs.'
	);
	process.exit(1);
}

const totalKeys = Object.values(localeData[REFERENCE_LOCALE]).reduce((sum, ns) => sum + Object.keys(ns).length, 0);
console.log(
	`i18n parity OK — ${locales.length} locale(s), ${referenceNamespaces.length} namespace(s), ${totalKeys} key(s) each.`
);
