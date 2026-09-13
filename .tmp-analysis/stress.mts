import { findBadIvCarveOuts } from '../src/workers/compute.worker';
import { computePerfectIvString, computeBadIvString, DEFAULT_PROTECTION } from '../src/routes/MassDelete';
import { GameLanguage } from '../src/contexts/language-context';
import { computeBestIVs } from '../src/utils/pokemon-helper';

const ivBucket = (iv: number) => (iv === 15 ? 4 : Math.ceil(iv / 5));

async function main() {
  const res = await fetch('https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json');
  const gm: Record<string, any> = await res.json();
  const carveOuts = findBadIvCarveOuts({ gamemasterPokemon: gm, caps: [1500, 2500] });
  const deviantSet = new Set(carveOuts.map((c) => c.speciesId));

  console.log('=== Basic stats ===');
  console.log('total species in gm:', Object.keys(gm).length);
  console.log('total carveOuts entries:', carveOuts.length, 'distinct deviant species:', deviantSet.size);

  const perfectStr = computePerfectIvString(gm, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());
  console.log('perfect string length:', perfectStr.length);

  console.log('\n=== Determinism (3 runs) ===');
  for (let i = 0; i < 3; i++) {
    const r = computePerfectIvString(gm, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, new Set());
    console.log(i, r.length, r === perfectStr);
  }

  console.log('\n=== Structural parse: every clause after the anchor matches an expected shape ===');
  const clauses = perfectStr.split('&').slice(1); // drop the anchor
  const tailKeywords = new Set(['!favorite', '!#']);
  let deviantClauseCount = 0, whitelistClauseCount = 0, badShape: string[] = [];
  for (const c of clauses) {
    if (tailKeywords.has(c)) continue;
    if (c.endsWith(',2-4attack,0-2defense,0-2hp')) { deviantClauseCount++; continue; }
    // bare identity clause like "!123" or "!555,!grass" (whitelist, none expected here since whitelist empty)
    badShape.push(c);
  }
  console.log('deviant-shaped clauses:', deviantClauseCount, '(expect == distinct deviant species with no category interference, i.e. all 264)');
  console.log('unexpected-shape clauses:', badShape.length, badShape.slice(0, 10));

  console.log('\n=== Manual hand-check: registeel ===');
  const reg = gm['registeel'];
  const flat1500 = Object.values(computeBestIVs(reg.baseStats.atk, reg.baseStats.def, reg.baseStats.hp, 1500)).flat() as any[];
  const flat2500 = Object.values(computeBestIVs(reg.baseStats.atk, reg.baseStats.def, reg.baseStats.hp, 2500)).flat() as any[];
  console.log('registeel top@1500', flat1500[0]?.IVs, 'top@2500', flat2500[0]?.IVs);
  console.log('registeel is deviant (per algorithm):', deviantSet.has('registeel'));
  console.log('registeel clause present:', perfectStr.includes(`!${reg.dex},2-4attack,0-2defense,0-2hp`));

  console.log('\n=== Manual hand-check: shuckle (expected non-deviant) ===');
  const shuck = gm['shuckle'];
  const flatS1500 = Object.values(computeBestIVs(shuck.baseStats.atk, shuck.baseStats.def, shuck.baseStats.hp, 1500)).flat() as any[];
  const flatS2500 = Object.values(computeBestIVs(shuck.baseStats.atk, shuck.baseStats.def, shuck.baseStats.hp, 2500)).flat() as any[];
  console.log('shuckle top@1500', flatS1500[0]?.IVs, 'top@2500', flatS2500[0]?.IVs);
  console.log('shuckle deviant:', deviantSet.has('shuckle'));
  console.log('shuckle mentioned anywhere:', perfectStr.includes(String(shuck.dex) + ','));

  console.log('\n=== Shared-dex form: zamazenta_hero / zamazenta_crowned_shield (dex 889) ===');
  console.log('zamazenta_hero deviant:', deviantSet.has('zamazenta_hero'));
  console.log('zamazenta_crowned_shield deviant:', deviantSet.has('zamazenta_crowned_shield'));
  const clauses889 = perfectStr.match(/&!889[^&]*/g);
  console.log('889 clauses:', clauses889);

  console.log('\n=== Alolan Raichu / regular Raichu (dex 26) ===');
  console.log('raichu deviant:', deviantSet.has('raichu'), 'raichu_alolan deviant:', deviantSet.has('raichu_alolan'));
  const clauses26 = perfectStr.match(/&!26[^&]*/g);
  console.log('26 clauses:', clauses26);

  console.log('\n=== Favorite/Tagged toggles ===');
  const bothOff = computePerfectIvString(gm, carveOuts, GameLanguage.en, { favorite: false, tagged: false }, new Set());
  const bothOn = computePerfectIvString(gm, carveOuts, GameLanguage.en, { favorite: true, tagged: true }, new Set());
  console.log('bothOff has favorite/tagged kw:', bothOff.includes('!favorite'), bothOff.includes('!#'));
  console.log('bothOn has favorite/tagged kw:', bothOn.includes('!favorite'), bothOn.includes('!#'));
  console.log('bothOff === body without tail:', bothOff === perfectStr.replace('&!favorite','').replace('&!#',''));

  console.log('\n=== Whitelist a real deviant + a real non-deviant ===');
  const wl = new Set(['registeel', 'shuckle']);
  const withWl = computePerfectIvString(gm, carveOuts, GameLanguage.en, DEFAULT_PROTECTION, wl);
  console.log('registeel bucket-clause present (should be false, replaced by bare):', withWl.includes(`!${reg.dex},2-4attack,0-2defense,0-2hp`));
  console.log('registeel bare clause present:', withWl.includes(`!${reg.dex}&`) || withWl.endsWith(`!${reg.dex}`));
  console.log('shuckle bare clause present (non-deviant species CAN still be individually excluded via whitelist):', withWl.includes(`!${shuck.dex}&`) || withWl.endsWith(`!${shuck.dex}`));

  console.log('\n=== Empty gamemaster edge case ===');
  try {
    const empty = computePerfectIvString({}, [], GameLanguage.en, DEFAULT_PROTECTION, new Set());
    console.log('empty gm result:', empty);
  } catch (e) {
    console.log('CRASHED on empty gamemaster:', e);
  }

  console.log('\n=== pt-BR full run ===');
  const ptbr = computePerfectIvString(gm, carveOuts, GameLanguage.ptbr, DEFAULT_PROTECTION, new Set());
  console.log('ptbr head', ptbr.slice(0, 50));
  console.log('ptbr tail', ptbr.slice(-30));
  console.log('ptbr contains stray english "attack" (should be none, translated to ataque via A/D/S already localized at construction, only type words get pt-br pass):', ptbr.includes('attack'));
}
main();
