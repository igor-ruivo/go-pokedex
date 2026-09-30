import type { TeamBuilderMove } from '../../DTOs/ITeamBuilder';
import type { SimMove } from './types';

/**
 * PvPoke's `GameMaster.getMoveById`: builds a fresh, mutable move instance
 * from the raw move table, including the derived "does this move buff or
 * debuff whom" flags the decision AI keys off.
 */
export const createMove = (moveId: string, table: Record<string, TeamBuilderMove>): SimMove => {
	const raw = table[moveId];
	if (!raw) throw new Error(`Unknown PvP move: ${moveId}`);

	const move: SimMove = {
		moveId,
		category: raw.category ?? (raw.energyGain > 0 ? 'fast' : 'charged'),
		abbreviation: raw.abbreviation,
		type: raw.type,
		power: raw.power,
		energy: raw.energy,
		energyGain: raw.energyGain,
		damageMethod: raw.damageMethod === 'percentMaxHP' ? 'percentMaxHP' : 'default',
		cooldown: raw.cooldown,
		turns: raw.turns,
		selfDebuffing: false,
		selfBuffing: false,
		selfAttackDebuffing: false,
		selfDefenseDebuffing: false,
		tags: raw.tags ?? [],
		stab: 1,
		damage: 0,
		dps: 0,
		dpe: 0,
		eps: 0,
		deps: 0,
	};

	if (raw.buffs) {
		const chance = raw.buffApplyChance ?? 1;
		move.buffs = [raw.buffs[0], raw.buffs[1]];
		move.buffApplyChance = chance;
		move.buffTarget = raw.buffTarget;
		if (raw.buffTarget === 'both') {
			move.buffsSelf = raw.buffsSelf;
			move.buffsOpponent = raw.buffsOpponent;
		}

		// Moves that reliably weaken their own user (Superpower, Close Combat…).
		if (
			move.buffTarget === 'self' &&
			chance >= 0.5 &&
			moveId !== 'DRAGON_ASCENT' &&
			(move.buffs[0] < 0 || move.buffs[1] < 0)
		) {
			move.selfDebuffing = true;
			if (move.buffs[0] < 0) move.selfAttackDebuffing = true;
			if (move.buffs[1] < 0) move.selfDefenseDebuffing = true;
		}

		// Moves that reliably improve the user's (or hurt the opponent's) stats.
		if (
			chance === 1 &&
			(move.buffTarget === 'opponent' ||
				(move.buffTarget === 'self' && (move.buffs[0] > 0 || move.buffs[1] > 0)) ||
				(move.buffTarget === 'both' && !!move.buffsSelf && (move.buffsSelf[0] > 0 || move.buffsSelf[1] > 0)))
		) {
			move.selfBuffing = true;
		}
	}

	return move;
};
