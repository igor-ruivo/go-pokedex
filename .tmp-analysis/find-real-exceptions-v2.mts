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

const main = async () => {
	const gamemaster = (await (await fetch(GAMEMASTER_URL)).json()) as Record<string, IGamemasterPokemon>;
	const candidates = Object.values(gamemaster).filter(
		(p) => !p.aliasId && !p.isMega && !p.isShadow && !p.isLegendary && !p.isMythical && !p.isBeast
	);
	const domainFilter = (r: IGamemasterPokemon) =>
		!r.aliasId && !r.isMega && !r.isShadow && !r.isLegendary && !r.isMythical && !r.isBeast;

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

	type Row = { speciesId: string; dex: number; speciesName: string; via: string; pattern: string };
	const needsCarveOut: Record<number, Array<Row>> = { 1500: [], 2500: [] };
	let bothFine = 0, oneOnly = 0, neitherFine = 0;

	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));

		for (const cap of CAPS) {
			let protectedAtCap = false;
			let carveOutStage: IGamemasterPokemon | null = null;
			let carveOutPattern: { A: number; D: number; S: number } | null = null;

			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue; // doesn't reach 90% of this cap at this stage — irrelevant here
				if (isProtectedByBlanket(best)) {
					protectedAtCap = true;
					break;
				}
				if (!carveOutStage) {
					carveOutStage = r;
					carveOutPattern = best;
				}
			}

			if (!protectedAtCap && carveOutPattern) {
				needsCarveOut[cap].push({
					speciesId: p.speciesId,
					dex: p.dex,
					speciesName: p.speciesName,
					via: carveOutStage!.speciesId,
					pattern: `A${carveOutPattern.A}D${carveOutPattern.D}S${carveOutPattern.S}`,
				});
			}
		}
	}

	const need1500 = new Set(needsCarveOut[1500].map((e) => e.speciesId));
	const need2500 = new Set(needsCarveOut[2500].map((e) => e.speciesId));
	for (const p of candidates) {
		const in1500 = need1500.has(p.speciesId);
		const in2500 = need2500.has(p.speciesId);
		if (!in1500 && !in2500) bothFine++;
		else if (in1500 && in2500) neitherFine++;
		else oneOnly++;
	}

	console.log(`${candidates.length} candidates total`);
	console.log(`${bothFine} need no carve-out at all (blanket-protected for both caps)`);
	console.log(`${oneOnly} need a carve-out for exactly one cap`);
	console.log(`${neitherFine} need a carve-out for BOTH caps`);
	console.log(`\n1500 CP: ${needsCarveOut[1500].length} species need a carve-out`);
	console.log(`2500 CP: ${needsCarveOut[2500].length} species need a carve-out`);
	const union = new Set([...need1500, ...need2500]);
	console.log(`UNION (species needing at least one carve-out): ${union.size}`);

	for (const cap of CAPS) {
		needsCarveOut[cap].sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
		console.log(`\n=== ${cap} carve-outs ===`);
		for (const e of needsCarveOut[cap]) {
			console.log(`  #${e.dex}\t${e.speciesId}\t(${e.speciesName})  via ${e.via}: ${e.pattern}`);
		}
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
