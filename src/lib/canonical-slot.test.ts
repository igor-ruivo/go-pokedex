import { describe, expect, it } from 'vitest';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { TeamBuilderData } from '../DTOs/ITeamBuilder';
import { canonicalSlot } from './canonical-slot';
import { highestLevelWithinCap } from './pvp-sim/cp';
import { slotIdentityKey } from './team-analysis';

const baseStats = { atk: 200, def: 200, hp: 200 };
const data = {
	builder: { ivs: { azumarill: { great: [20, 1, 15, 14] } } } as unknown as TeamBuilderData,
	gamemaster: { azumarill: { baseStats } } as unknown as Record<string, IGamemasterPokemon>,
};
const moveset = ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'];
const capLevel = highestLevelWithinCap(baseStats, [1, 15, 14], 1500);

describe('canonicalSlot', () => {
	it('leaves out IVs that are the league’s best spread', () => {
		expect(canonicalSlot({ speciesId: 'azumarill', moveset, ivs: [1, 15, 14] }, 'great', data)).toEqual({
			speciesId: 'azumarill',
			moveset,
		});
	});

	it('keeps IVs that differ from the best spread', () => {
		expect(canonicalSlot({ speciesId: 'azumarill', moveset, ivs: [0, 15, 15] }, 'great', data).ivs).toEqual([
			0, 15, 15,
		]);
	});

	it('leaves out a level the CP cap gives these IVs anyway, and keeps any other', () => {
		expect(canonicalSlot({ speciesId: 'azumarill', moveset, level: capLevel }, 'great', data).level).toBeUndefined();
		expect(canonicalSlot({ speciesId: 'azumarill', moveset, level: capLevel - 1 }, 'great', data).level).toBe(
			capLevel - 1
		);
	});

	it('keeps the Best Buddy and Super Max Mega statuses, which are not defaults', () => {
		const slot = canonicalSlot(
			{ speciesId: 'azumarill', moveset, level: 51, buddy: true, superMega: true },
			'great',
			data
		);
		expect(slot).toMatchObject({ level: 51, buddy: true, superMega: true });
	});

	it('makes a Best Buddy that came back to the defaults the same Pokémon as a plain one', () => {
		const buddy = canonicalSlot(
			{ speciesId: 'azumarill', moveset, ivs: [1, 15, 14], level: capLevel, buddy: true },
			'great',
			data
		);
		const plain = canonicalSlot({ speciesId: 'azumarill', moveset }, 'great', data);
		expect(slotIdentityKey(buddy)).toBe(slotIdentityKey(plain));
	});

	it('treats a species it has no data for as it is', () => {
		expect(canonicalSlot({ speciesId: 'medicham', moveset, level: 30 }, 'great', data)).toEqual({
			speciesId: 'medicham',
			moveset,
			level: 30,
		});
	});
});
