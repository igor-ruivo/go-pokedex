import { computeMoveEffectiveness } from '../utils/pokemon-helper';
import { TYPE_KEYS } from './types';

const ALL_TYPES = TYPE_KEYS;

export interface EffEntry {
	type: string;
	mult: number;
}

/** Buckets every attacking type by how it fares against a defender's type(s). */
export const typeMatchups = (defenderTypes: Array<string>): { weak: Array<EffEntry>; resist: Array<EffEntry> } => {
	const [t1, t2] = defenderTypes.map((t) => t.toLowerCase());
	const weak: Array<EffEntry> = [];
	const resist: Array<EffEntry> = [];
	for (const atk of ALL_TYPES) {
		const mult = Math.round(computeMoveEffectiveness(atk, t1, t2) * 1e6) / 1e6;
		if (mult > 1) weak.push({ type: atk, mult });
		else if (mult < 1) resist.push({ type: atk, mult });
	}
	weak.sort((a, b) => b.mult - a.mult);
	resist.sort((a, b) => a.mult - b.mult);
	return { weak, resist };
};

/** "1.60×" style label for a matchup multiplier. */
export const fmtMult = (mult: number): string => `${mult.toFixed(2)}×`;

/** A stacked matchup — both types push the same way (×2.56 up, or ×0.39 / ×0.24 down). */
export const isDoubleMult = (mult: number): boolean => mult > 2 || mult < 0.45;

/** Which of the chart's four colour bands a multiplier falls in: super effective, neutral, resisted, or (double-)resisted "immune". */
export const matchupTier = (m: number): 'se' | 'nn' | 'nve' | 'imm' => {
	if (m > 1.1) return 'se';
	if (m > 0.9) return 'nn';
	if (m > 0.5) return 'nve';
	return 'imm';
};

/** Compact chart-cell text for a multiplier — blank for neutral, "1.6" / "0.63" otherwise. */
export const matchupCellText = (m: number): string => (matchupTier(m) === 'nn' ? '' : m.toFixed(m < 1 ? 2 : 1));
