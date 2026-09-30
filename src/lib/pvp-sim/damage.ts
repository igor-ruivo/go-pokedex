import { computeMoveEffectiveness } from '../../utils/pokemon-helper';
import { TYPE_KEYS } from '../types';
import type { SimMove } from './types';

/** PvPoke's PvP damage constants (single-precision game values, hence the long decimals). Type effectiveness comes from the app's shared type chart instead. */
export const DamageMultiplier = {
	BONUS: 1.2999999523162841796875,
	STAB: 1.2000000476837158203125,
	SHADOW_ATK: 1.2,
	SHADOW_DEF: 0.83333331,
} as const;

/** Every attacking/defending type, alphabetical — the order PvPoke iterates them in. */
export const ALL_TYPES = TYPE_KEYS;

const effectivenessCache = new Map<string, number>();

/**
 * Final effectiveness multiplier of an attack type against one or two
 * defending types (`'none'` marks a missing second type). Delegates to the
 * app's single type chart; results are memoised since the chart is rebuilt on
 * every call.
 */
export const getEffectiveness = (moveType: string, targetTypes: ReadonlyArray<string>): number => {
	const [first, second] = targetTypes.map((t) => t.toLowerCase());
	const key = `${moveType.toLowerCase()}|${first}|${second ?? ''}`;
	let value = effectivenessCache.get(key);
	if (value === undefined) {
		value = computeMoveEffectiveness(moveType.toLowerCase(), first, second && second !== 'none' ? second : undefined);
		effectivenessCache.set(key, value);
	}
	return value;
};

/** The slice of a Pokémon the damage formula reads. */
export interface DamageParticipant {
	activeFormId: string;
	stats: { hp: number };
	typeEffectiveness: Record<string, number>;
	getEffectiveStat: (index: 0 | 1) => number;
	getFormStats: (formId: string) => { atk: number };
}

/** PvPoke's `DamageCalculator.damage` — the simulate-mode path (a Charged Move always lands at full charge). */
export const calculateDamage = (attacker: DamageParticipant, defender: DamageParticipant, move: SimMove): number => {
	const effectiveness = defender.typeEffectiveness[move.type];
	let attackStat = attacker.getEffectiveStat(0);
	const defenseStat = defender.getEffectiveStat(1);

	// Aegislash's Shield form throws Charged Moves with its Blade form's Attack.
	if (attacker.activeFormId === 'aegislash_shield' && move.category === 'charged') {
		attackStat = attacker.getFormStats('aegislash_blade').atk;
	}

	if (move.damageMethod === 'percentMaxHP') {
		return Math.floor((move.power / 100) * defender.stats.hp) + 1;
	}

	return (
		Math.floor(move.power * move.stab * (attackStat / defenseStat) * effectiveness * 0.5 * DamageMultiplier.BONUS) + 1
	);
};
