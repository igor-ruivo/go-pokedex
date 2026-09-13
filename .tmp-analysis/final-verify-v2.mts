import {
	calculateCP,
	computeBestIVs,
	fetchReachablePokemonIncludingSelf,
	levelToLevelIndex,
} from '../src/utils/pokemon-helper';
import type { IGamemasterPokemon } from '../src/DTOs/IGamemasterPokemon';

const GAMEMASTER_URL =
	'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const CAPS = [1500, 2500] as const;
const LEVEL_50_INDEX = levelToLevelIndex(50);
const CP_THRESHOLD_RATIO = 0.9;

const bucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));
const matchesDefault = (ivs: { A: number; D: number; S: number }) => {
	const a = bucket(ivs.A), d = bucket(ivs.D), s = bucket(ivs.S);
	return a <= 1 && d >= 3 && s >= 3;
};
// Master's broad "11+ everywhere" rule is gone — only an EXACT hundo counts
// (already unconditionally protected by `!4*` regardless of league), nothing
// short of it gets a free pass anymore.
const isExactHundo = (ivs: { A: number; D: number; S: number }) =>
	bucket(ivs.A) === 4 && bucket(ivs.D) === 4 && bucket(ivs.S) === 4;
const isProtectedByBlanket = (ivs: { A: number; D: number; S: number }) => matchesDefault(ivs) || isExactHundo(ivs);

const getRanges = (array: Array<number>): Array<string> => {
	if (array.length === 0) return [];
	const sorted = [...array].sort((a, b) => a - b);
	const result: Array<string> = [];
	let start = sorted[0];
	let end = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		if (current === end + 1) {
			end = current;
		} else {
			result.push(start === end ? `${start}` : `${start}-${end}`);
			start = end = current;
		}
	}
	result.push(start === end ? `${start}` : `${start}-${end}`);
	return result;
};
const groupAttr = (input: Set<number>, lang: string): string => {
	const output = Array.from(input);
	output.sort((a, b) => a - b);
	const ranges = getRanges(output);
	if (ranges.length < 1) return '';
	let checkStr = ranges.join(',') + lang;
	const splitStr = checkStr.split(',');
	if (splitStr.length > 1) {
		for (let i = 0; i < splitStr.length; i++) {
			if (!splitStr[i].includes(lang)) splitStr[i] = splitStr[i] + lang;
		}
		checkStr = splitStr.join(',');
	}
	return ',' + checkStr;
};
const complementOf = (b: number) => new Set([0, 1, 2, 3, 4].filter((x) => x !== b));

type PokemonForm = { dexNumber: number; types: Array<string>; isShadow: boolean; p: IGamemasterPokemon };
type UniqueTypes = Record<number, Set<string>>;
const buildUniqueTypes = (pokemonForms: Array<PokemonForm>): UniqueTypes => {
	const typeOccurrences: Record<number, Record<string, number>> = {};
	pokemonForms.forEach(({ dexNumber, types }) => {
		if (!typeOccurrences[dexNumber]) typeOccurrences[dexNumber] = {};
		types.forEach((type) => {
			typeOccurrences[dexNumber][type] = (typeOccurrences[dexNumber][type] || 0) + 1;
		});
	});
	const uniqueTypes: UniqueTypes = {};
	for (const dex in typeOccurrences) {
		const dexNumber = parseInt(dex);
		uniqueTypes[dexNumber] = new Set<string>();
		for (const type in typeOccurrences[dexNumber]) {
			if (typeOccurrences[dexNumber][type] === 1) uniqueTypes[dexNumber].add(type);
		}
	}
	return uniqueTypes;
};
const generatePokemonId = (
	dexNumber: number,
	types: Array<string>,
	uniqueTypes: UniqueTypes,
	formSiblings: Array<PokemonForm>,
	form: PokemonForm
) => {
	if (formSiblings.length === 1) return `${dexNumber}`;
	let identifier = `${dexNumber}`;
	const uniqueTypesForDex = uniqueTypes[dexNumber] || new Set<string>();
	const siblingTypesToNegate = new Set<string>();
	const uniqueType = types.find((type) => uniqueTypesForDex.has(type));
	if (uniqueType) {
		identifier += `,${uniqueType}`;
	} else {
		types.forEach((type) => {
			if (formSiblings.some((t) => !t.types.includes(type))) identifier += `,${type}`;
		});
		formSiblings.forEach((sibling) => {
			if (sibling !== form) {
				sibling.types.forEach((siblingType) => {
					if (!types.includes(siblingType) && sibling.types.some((t) => types.includes(t))) {
						siblingTypesToNegate.add(siblingType);
					}
				});
			}
		});
		siblingTypesToNegate.forEach((type) => {
			identifier += `,!${type}`;
		});
	}
	return identifier;
};

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter(
		(p) => !p.aliasId && !p.isMega && !p.isShadow && !p.isLegendary && !p.isMythical && !p.isBeast
	);
	const domainFilter = (r: IGamemasterPokemon) =>
		!r.aliasId && !r.isMega && !r.isShadow && !r.isLegendary && !r.isMythical && !r.isBeast;

	const allPokemonForms: Array<PokemonForm> = Object.values(gamemaster)
		.filter((e) => !e.isMega && !e.aliasId && !e.isShadow)
		.map((e) => ({ dexNumber: e.dex, types: e.types.map((f) => f.toString().toLocaleLowerCase()), isShadow: false, p: e }));
	const uniqueTypes = buildUniqueTypes(allPokemonForms);
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});
	const idFor = (p: IGamemasterPokemon) =>
		baseIds[`${p.dex},${p.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];

	const bestCache = new Map<string, { A: number; D: number; S: number } | null>();
	const getBest = (r: IGamemasterPokemon, cap: number) => {
		const key = `${r.speciesId}|${cap}`;
		if (bestCache.has(key)) return bestCache.get(key)!;
		const maxCP = calculateCP(r.baseStats.atk, 15, r.baseStats.def, 15, r.baseStats.hp, 15, LEVEL_50_INDEX);
		if (maxCP < CP_THRESHOLD_RATIO * cap) { bestCache.set(key, null); return null; }
		const best = Object.values(computeBestIVs(r.baseStats.atk, r.baseStats.def, r.baseStats.hp, cap)).flat()[0];
		bestCache.set(key, best.IVs);
		return best.IVs;
	};

	// Collect ALL distinct unprotected patterns across the WHOLE reachable
	// family, per species per cap — bucket matching is species-independent
	// (raw IVs never change through evolution), so a later stage being
	// blanket-protected does NOT excuse an earlier stage's own distinct
	// unprotected pattern.
	const carveOuts: Array<{ p: IGamemasterPokemon; cap: number; pattern: { A: number; D: number; S: number } }> = [];
	const perSpeciesCapCount: Record<string, number> = {};

	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));
		for (const cap of CAPS) {
			const distinctPatterns = new Map<string, { A: number; D: number; S: number }>();
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) continue;
				const k = `${bucket(best.A)}-${bucket(best.D)}-${bucket(best.S)}`;
				if (!distinctPatterns.has(k)) distinctPatterns.set(k, best);
			}
			perSpeciesCapCount[`${p.speciesId}|${cap}`] = distinctPatterns.size;
			for (const pattern of distinctPatterns.values()) carveOuts.push({ p, cap, pattern });
		}
	}

	// summary stats
	const need1500 = new Set(carveOuts.filter((c) => c.cap === 1500).map((c) => c.p.speciesId));
	const need2500 = new Set(carveOuts.filter((c) => c.cap === 2500).map((c) => c.p.speciesId));
	const union = new Set([...need1500, ...need2500]);
	const needNothing = candidates.filter((p) => !union.has(p.speciesId));
	const multiPattern = Object.entries(perSpeciesCapCount).filter(([, n]) => n > 1);

	console.log(`=== FINAL VERIFIED NUMBERS ===`);
	console.log(`Total candidates (non-alias/mega/shadow/legendary/mythical/UB): ${candidates.length}`);
	console.log(`Need ZERO carve-out at all (blanket-protected both caps, every reachable stage): ${needNothing.length}`);
	console.log(`Need at least one carve-out: ${union.size}`);
	console.log(`  - for 1500 CP: ${need1500.size} species`);
	console.log(`  - for 2500 CP: ${need2500.size} species`);
	console.log(`  - for both caps: ${[...need1500].filter((s) => need2500.has(s)).length} species`);
	console.log(`(species,cap) pairs needing >1 distinct pattern: ${multiPattern.length}`);
	for (const [key, n] of multiPattern) console.log(`  ${key}: ${n} distinct patterns`);
	console.log(`Total carve-out clauses (species,cap,pattern triples): ${carveOuts.length}`);

	// ---- build the final string ----
	const A = 'attack', D = 'defense', S = 'hp', CP = 'cp';
	// Master's blanket clause is gone — only the shared Great/Ultra default
	// clause remains as the primary selection criterion (no leading `&`,
	// matching Tab 1's own convention of always starting with a bare positive
	// term). Exact hundos are still covered, just via `!4*` at the tail.
	let result = `2-4${A},0-2${D},0-2${S}`;

	const seenClauses = new Set<string>();
	let skipped = 0;
	for (const { p, pattern } of carveOuts) {
		const baseId = idFor(p);
		if (!baseId) { skipped++; continue; }
		const negatedIdentity = baseId.split(',').map((f) => (f.startsWith('!') ? f.substring(1) : `!${f}`)).join(',');
		const negA = groupAttr(complementOf(bucket(pattern.A)), A);
		const negD = groupAttr(complementOf(bucket(pattern.D)), D);
		const negS = groupAttr(complementOf(bucket(pattern.S)), S);
		const clause = `&${negatedIdentity}${negA}${negD}${negS}`;
		if (!seenClauses.has(clause)) {
			result += clause;
			seenClauses.add(clause);
		}
	}
	result += `&!4*&!#&!${CP}2500-&!favorite&!mega&!legendary&!mythical&!ultra beasts`;

	if (skipped > 0) console.log(`WARNING: ${skipped} carve-outs skipped (no baseId found)`);
	console.log(`Unique clauses after string-level dedup: ${seenClauses.size}`);
	console.log(`FINAL STRING LENGTH: ${result.length} characters`);
	console.log(`\n--- FULL STRING ---\n`);
	console.log(result);
};
main().catch((e) => { console.error(e); process.exit(1); });
