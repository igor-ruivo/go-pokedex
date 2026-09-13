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
const matchesMaster = (ivs: { A: number; D: number; S: number }) => {
	const a = bucket(ivs.A), d = bucket(ivs.D), s = bucket(ivs.S);
	return a >= 3 && d >= 3 && s >= 3;
};
const isProtectedByBlanket = (ivs: { A: number; D: number; S: number }) => matchesDefault(ivs) || matchesMaster(ivs);

// ---- verbatim from computeSearchString/MassDelete's getRanges+groupAttr ----
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

// ---- verbatim from MassDelete's generatePokemonId/buildUniqueTypes ----
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

	// ---- disambiguation setup (dex+type only — shadow doesn't matter here) ----
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

	// ---- find carve-outs (same corrected per-cap-independent logic) ----
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

	const carveOuts: Array<{ p: IGamemasterPokemon; cap: number; pattern: { A: number; D: number; S: number } }> = [];
	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));
		for (const cap of CAPS) {
			let protectedAtCap = false;
			let pattern: { A: number; D: number; S: number } | null = null;
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) { protectedAtCap = true; break; }
				if (!pattern) pattern = best;
			}
			if (!protectedAtCap && pattern) carveOuts.push({ p, cap, pattern });
		}
	}

	// ---- assemble the string ----
	const A = 'attack', D = 'defense', S = 'hp', CP = 'cp';
	let result = '';

	// Master: keep only 11+ across the board -> delete-clause = NOT that
	result += `&0-2${A},0-2${D},0-2${S}`;
	// Great/Ultra shared default: keep only 0-5atk/11-15def/11-15hp -> delete-clause = NOT that
	result += `&2-4${A},0-2${D},0-2${S}`;

	// per-species-per-cap carve-outs
	const seenClauses = new Set<string>();
	for (const { p, pattern } of carveOuts) {
		const baseId = idFor(p);
		if (!baseId) {
			console.warn(`no baseId for ${p.speciesId}`);
			continue;
		}
		const negatedIdentity = baseId
			.split(',')
			.map((f) => (f.startsWith('!') ? f.substring(1) : `!${f}`))
			.join(',');
		const negA = groupAttr(complementOf(bucket(pattern.A)), A);
		const negD = groupAttr(complementOf(bucket(pattern.D)), D);
		const negS = groupAttr(complementOf(bucket(pattern.S)), S);
		const clause = `&${negatedIdentity}${negA}${negD}${negS}`;
		if (!seenClauses.has(clause)) {
			result += clause;
			seenClauses.add(clause);
		}
	}

	// global constants (protect hundos, tagged, high-CP, favorites, mega, legendary/mythical/UB)
	result += `&!4*&!#&!${CP}2500-&!favorite&!mega&!legendary&!mythical&!ultra beasts`;

	console.log(`Carve-out clauses generated: ${carveOuts.length} (${seenClauses.size} unique after dedup)`);
	console.log(`Total string length: ${result.length} characters`);
	console.log(`\n--- FULL STRING ---\n`);
	console.log(result);
};
main().catch((e) => { console.error(e); process.exit(1); });
