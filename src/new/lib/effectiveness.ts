import { computeMoveEffectiveness } from '../../utils/pokemon-helper';
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

export const multBadge = (mult: number): string | null => {
	if (mult > 1) return mult > 2 ? '2×' : null;
	if (mult < 0.3) return '3×';
	if (mult < 0.5) return '2×';
	return null;
};
