import type { BestIvs, FormChange, TeamBuilderMove } from '../../DTOs/ITeamBuilder';

/**
 * A faithful TypeScript port of the parts of PvPoke's (MIT-licensed) battle
 * simulator that its Team Builder page runs: the 1v1 battle loop, the move
 * decision AI (`ActionLogic`), damage/type maths and the team-ranker's threat
 * scoring. Everything user-interface- or emulator-related is left out.
 *
 * The behaviour is intentionally *identical* to upstream, quirks included —
 * a threat score is only comparable with PvPoke's own if the simulation is.
 * Where upstream code is dead or can never change a result (comparing fields
 * that don't exist, say), the port drops it and says so in a comment.
 */

/** Everything the simulator needs to know about one species, resolved for one league. */
export interface SimSpecies {
	speciesId: string;
	speciesName: string;
	dex: number;
	/** Lowercase, always two entries — the second is `'none'` for a single-typed species. */
	types: [string, string];
	baseStats: { atk: number; def: number; hp: number };
	tags: ReadonlyArray<string>;
	/** The species' rank-1 IV spread for this league, when the cap admits one. */
	bestIvs: BestIvs | undefined;
	formChange?: FormChange | undefined;
	originalFormId?: string | undefined;
	nativeStatBuffs?: [number, number] | undefined;
}

export interface SimContext {
	/** League CP cap: 1500, 2500 or 10000. */
	cp: number;
	levelCap: number;
	moves: Record<string, TeamBuilderMove>;
	speciesById: (speciesId: string) => SimSpecies | undefined;
}

export type BuffTarget = 'self' | 'opponent' | 'both' | 'form';

/** A move instance — mutable, one per Pokémon per move, like upstream's `getMoveById` objects. */
export interface SimMove {
	moveId: string;
	category: 'fast' | 'charged';
	abbreviation: string;
	type: string;
	power: number;
	energy: number;
	energyGain: number;
	damageMethod: 'default' | 'percentMaxHP';
	cooldown: number;
	turns: number;
	selfDebuffing: boolean;
	selfBuffing: boolean;
	selfAttackDebuffing: boolean;
	selfDefenseDebuffing: boolean;
	tags: ReadonlyArray<string>;
	buffs?: [number, number] | undefined;
	buffApplyChance?: number | undefined;
	/** `'form'` stands in for upstream's Aegislash hack of pointing `buffTarget` at the Pokémon itself — it matches nothing. */
	buffTarget?: BuffTarget | undefined;
	buffsSelf?: [number, number] | undefined;
	buffsOpponent?: [number, number] | undefined;
	buffApplyMeter?: number | undefined;
	stab: number;
	damage: number;
	dps: number;
	dpe: number;
	eps: number;
	deps: number;
}

export const hasMoveTag = (move: SimMove, tag: string): boolean => move.tags.includes(tag);

export type ActionType = 'fast' | 'charged' | 'wait' | 'switch';

export interface BattleAction {
	type: ActionType;
	actor: number;
	turn: number;
	/** Charged-move slot (a number), or a move id for a scripted move such as Gulp Missile. */
	value: number | string;
	settings: { priority: number; shielded: boolean; buffs: boolean };
	valid: boolean;
	processed: boolean;
}

export const createAction = (
	type: ActionType,
	actor: number,
	turn: number,
	value: number | string,
	priority: number
): BattleAction => ({
	type,
	actor,
	turn,
	value,
	settings: { priority, shielded: false, buffs: false },
	valid: false,
	processed: false,
});
