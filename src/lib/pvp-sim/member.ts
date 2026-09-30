import type { SimPokemon } from './pokemon';

/** How one team member is built at the league's CP cap, and what that makes of its stats. */
export interface MemberStats {
	speciesId: string;
	level: number;
	ivs: [number, number, number];
	cp: number;
	atk: number;
	def: number;
	hp: number;
	/** atk × def × hp / 1000, raw (no Shadow multiplier) — comparable to PvPoke's stat-product ranks. */
	statProduct: number;
	/** Effective Defense × HP (a Shadow's −16.7% Defense included), what PvPoke's bulk grade uses. */
	bulk: number;
	/** PvPoke's 0–100 moveset consistency. */
	consistency: number;
}

export const memberStats = (poke: SimPokemon): MemberStats => {
	poke.reset();
	return {
		speciesId: poke.speciesId,
		level: poke.level,
		ivs: [poke.ivs.atk, poke.ivs.def, poke.ivs.hp],
		cp: poke.cp,
		atk: poke.stats.atk,
		def: poke.stats.def,
		hp: poke.stats.hp,
		statProduct: (poke.stats.atk * poke.stats.def * poke.stats.hp) / 1000,
		bulk: poke.getEffectiveStat(1) * poke.stats.hp,
		consistency: poke.calculateConsistency(),
	};
};
