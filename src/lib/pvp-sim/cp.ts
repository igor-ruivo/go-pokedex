import { cpm } from '../../utils/pokemon-helper';
import type { SlotIvs } from '../team-analysis';

interface BaseStats {
	atk: number;
	def: number;
	hp: number;
}

/** The CP of a Pokémon with these base stats, IVs and level (1 to 50 or 51, in steps of 0.5) — the game's formula. */
export const cpAt = (base: BaseStats, ivs: SlotIvs, level: number): number => {
	const m = cpm[(level - 1) * 2];
	return Math.max(
		10,
		Math.floor(((base.atk + ivs[0]) * Math.sqrt(base.def + ivs[1]) * Math.sqrt(base.hp + ivs[2]) * m * m) / 10)
	);
};

/** The highest level (up to 50) at which these IVs stay within a league's CP cap. */
export const highestLevelWithinCap = (base: BaseStats, ivs: SlotIvs, cap: number): number => {
	for (let level = 50; level > 1; level -= 0.5) {
		if (cpAt(base, ivs, level) <= cap) return level;
	}
	return 1;
};
