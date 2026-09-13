import { findBadIvCarveOuts } from '../src/workers/compute.worker';
import { computeBestIVs } from '../src/utils/pokemon-helper';
import { ivBucket } from '../src/lib/search-string';

async function main() {
  const res = await fetch('https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json');
  const gm: Record<string, any> = await res.json();
  const carveOuts = findBadIvCarveOuts({ gamemasterPokemon: gm, caps: [1500, 2500] });
  const deviantSet = new Set(carveOuts.map((c) => c.speciesId));

  for (const id of ['frigibax', 'arctibax', 'baxcalibur']) {
    const p = gm[id];
    if (!p) { console.log(id, 'NOT FOUND'); continue; }
    const flat1500 = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 1500)).flat() as any[];
    const flat2500 = Object.values(computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 2500)).flat() as any[];
    const b = (e: any) => e ? `${ivBucket(e.IVs.A)}/${ivBucket(e.IVs.D)}/${ivBucket(e.IVs.S)}` : 'n/a';
    console.log(id, 'dex', p.dex, '| top@1500', b(flat1500[0]), flat1500[0]?.IVs, '| top@2500', b(flat2500[0]), flat2500[0]?.IVs);
    console.log('  own carveOuts entries:', carveOuts.filter(c => c.speciesId === id));
    console.log('  in deviantSet:', deviantSet.has(id));
  }

  // Reconstruct the OLD anchor + exclusion logic exactly and check what it
  // would produce for dex 995 (frigibax family).
  const GOOD_A = new Set([0, 1]);
  const GOOD_BULK = new Set([3, 4]);
  const complementOfBuckets = (s: Set<number>) => new Set([0,1,2,3,4].filter(x => !s.has(x)));
  const negA = Array.from(complementOfBuckets(GOOD_A));
  const negBulk = Array.from(complementOfBuckets(GOOD_BULK));
  console.log('\nOld anchor good region (bucket domain): attack in', Array.from(GOOD_A), 'defense/hp in', Array.from(GOOD_BULK));
  console.log('Old exclusion complement (what a deviant species is EXCLUDED from): attack NOT in', negA, ' -> allowed(non-excluded) attack', Array.from(GOOD_A), '(same as anchor, always)');

  // How many DISTINCT bucket combos fall inside the shared "good" rectangle?
  const combos: string[] = [];
  for (const a of GOOD_A) for (const d of GOOD_BULK) for (const s of GOOD_BULK) combos.push(`${a}/${d}/${s}`);
  console.log('\nAll bucket combos inside the shared good rectangle:', combos);
  console.log('Of those, how many are ACTUALLY frigibax-family-verified-optimal for GL (1500)?');
  const verifiedGL = new Set(['4/4/4', '0/3/3', '0/4/1']); // user's own figures (0/4/1 not in rectangle - hundo separate)
  console.log('rectangle combos that are verified for this family:', combos.filter(c => verifiedGL.has(c)));
  console.log('rectangle combos that are NOT verified but still inside the anchor region (false positives if this species were NOT excluded):', combos.filter(c => !verifiedGL.has(c)));
}
main();
