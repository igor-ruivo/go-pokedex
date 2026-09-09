import { computeMoveEffectiveness } from '../utils/pokemon-helper';
import { TYPE_LABEL } from './types';

const ALL_TYPES = Object.keys(TYPE_LABEL);

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
