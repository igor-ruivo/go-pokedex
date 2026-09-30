import type { IRankedPokemon } from '../DTOs/IRankedPokemon';

/**
 * PvPoke's six role scores, each 0–100 per ranked entry. Order is the order
 * they're laid out around the Combat tab's hexagon (clockwise from the top),
 * and the order they're listed in the help panel.
 */
export const COMBAT_METRICS = ['lead', 'switch', 'charger', 'closer', 'consistency', 'attacker'] as const;
export type CombatMetric = (typeof COMBAT_METRICS)[number];

export const isCombatMetric = (v: string): v is CombatMetric => (COMBAT_METRICS as ReadonlyArray<string>).includes(v);

export const combatValue = (entry: IRankedPokemon, metric: CombatMetric): number => entry[metric];

/**
 * Which metrics sit at the best / worst end of `values`. Ties share a bucket
 * (every axis on the max value is "best", every axis on the min is "worst"),
 * and a perfectly flat spread has neither — nothing to single out.
 */
export const bestWorst = <K extends string = CombatMetric>(
	values: Record<K, number>,
	axes: ReadonlyArray<K> = COMBAT_METRICS as unknown as ReadonlyArray<K>
): { best: Set<K>; worst: Set<K> } => {
	const nums = axes.map((m) => values[m]);
	const max = Math.max(...nums);
	const min = Math.min(...nums);
	if (max === min) return { best: new Set(), worst: new Set() };
	return {
		best: new Set(axes.filter((m) => values[m] === max)),
		worst: new Set(axes.filter((m) => values[m] === min)),
	};
};
