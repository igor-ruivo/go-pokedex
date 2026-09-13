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
const patKey = (ivs: { A: number; D: number; S: number }) => `A${bucket(ivs.A)}D${bucket(ivs.D)}S${bucket(ivs.S)}`;

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

	type OldEntry = { pattern: { A: number; D: number; S: number } } | null; // null = "no carve-out" (old logic)
	type NewEntry = Array<{ via: string; pattern: { A: number; D: number; S: number } }>;

	const oldResult = new Map<string, OldEntry>();
	const newResult = new Map<string, NewEntry>();

	for (const p of candidates) {
		const reachable = Array.from(fetchReachablePokemonIncludingSelf(p, gamemaster, domainFilter));
		for (const cap of CAPS) {
			const mapKey = `${p.speciesId}|${cap}`;

			// OLD (buggy) logic: stop at first stage that's EITHER protected (done, no
			// carve-out) OR record the first unprotected pattern seen, keep going only
			// to look for a protecting stage.
			let oldProtected = false;
			let oldPattern: { A: number; D: number; S: number } | null = null;
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) { oldProtected = true; break; }
				if (!oldPattern) oldPattern = best;
			}
			oldResult.set(mapKey, oldProtected ? null : oldPattern ? { pattern: oldPattern } : null);

			// NEW (corrected) logic: collect every distinct unprotected pattern from
			// every reachable stage, regardless of whether some other stage is protected.
			const distinct = new Map<string, { via: string; pattern: { A: number; D: number; S: number } }>();
			for (const r of reachable) {
				const best = getBest(r, cap);
				if (!best) continue;
				if (isProtectedByBlanket(best)) continue;
				const k = patKey(best);
				if (!distinct.has(k)) distinct.set(k, { via: r.speciesId, pattern: best });
			}
			newResult.set(mapKey, [...distinct.values()]);
		}
	}

	// Find every (species,cap) where NEW has a carve-out the OLD logic said wasn't needed.
	const newlyAdded: Array<{ speciesId: string; cap: number; entries: NewEntry }> = [];
	for (const [key, newEntries] of newResult) {
		if (newEntries.length === 0) continue;
		const old = oldResult.get(key);
		const [speciesId, capStr] = key.split('|');
		const cap = Number(capStr);
		if (old === null) {
			// old said "no carve-out needed" entirely -> every new entry here is newly added
			newlyAdded.push({ speciesId, cap, entries: newEntries });
		} else {
			// old had exactly one pattern; any NEW pattern not matching it is newly added
			const oldKey = patKey(old.pattern);
			const extra = newEntries.filter((e) => patKey(e.pattern) !== oldKey);
			if (extra.length > 0) newlyAdded.push({ speciesId, cap, entries: extra });
		}
	}

	console.log(`(species,cap) entries with at least one newly-added carve-out clause: ${newlyAdded.length}`);
	console.log(`Total newly-added individual clauses: ${newlyAdded.reduce((sum, e) => sum + e.entries.length, 0)}`);
	console.log(`\n-- first 30 examples --`);
	for (const e of newlyAdded.slice(0, 30)) {
		for (const entry of e.entries) {
			console.log(
				`  ${e.speciesId} @ ${e.cap}: NEW carve-out via ${entry.via} (A${entry.pattern.A} D${entry.pattern.D} S${entry.pattern.S}) — old logic missed this because a LATER/OTHER reachable stage was already blanket-protected`
			);
		}
	}
};
main().catch((e) => { console.error(e); process.exit(1); });
