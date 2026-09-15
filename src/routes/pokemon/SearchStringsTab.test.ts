import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../../contexts/language-context';
import type { RankEntry } from '../../utils/pokemon-helper';
import { mockPokemon } from '../mass-delete-fixtures';
import { computeSearchString } from './SearchStringsTab';

// One minimal top-1 combination is enough — this file's own bucket/CP/level
// bookkeeping isn't what's under test here, only whether the unconditional
// Shadow-purify hundo guard gets appended alongside `!4*` in "except" mode.
const oneCombo: Array<RankEntry> = [
	{ IVs: { A: 0, D: 15, S: 15, star: 0 }, battle: { A: 1, D: 1, S: 1 }, L: 20, CP: 1200 },
];

describe('computeSearchString — Shadow-purify hundo guard (unconditional, "except" mode only)', () => {
	it('is appended right alongside !4* when trash (except) mode is on', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon', dex: 950 });
		const result = computeSearchString(pokemon, {
			top: 1,
			trash: true,
			topIVCombinations: oneCombo,
			gl: GameLanguage.en,
		});

		// Same reasoning as Mass Delete's own copy of this rule: a Shadow catch
		// with Attack/Defense/HP all already bucket 3-4 (raw 11-15) might
		// purify (+2/stat, capped 15) into an exact 15/15/15.
		expect(result).toContain('&!4*&0-2attack,0-2defense,0-2hp,!shadow');
	});

	it('is NOT appended outside "except" mode — that mode never emits the unconditional !4* either', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon2', dex: 951 });
		const result = computeSearchString(pokemon, {
			top: 1,
			trash: false,
			topIVCombinations: oneCombo,
			gl: GameLanguage.en,
		});

		expect(result).not.toContain('!shadow');
	});

	it('localizes to pt-BR alongside !4*', () => {
		const pokemon = mockPokemon({ speciesId: 'guardmon3', dex: 952 });
		const result = computeSearchString(pokemon, {
			top: 1,
			trash: true,
			topIVCombinations: oneCombo,
			gl: GameLanguage.ptbr,
		});

		expect(result).toContain('&!4*&0-2ataque,0-2defesa,0-2ps,!sombroso');
	});
});
