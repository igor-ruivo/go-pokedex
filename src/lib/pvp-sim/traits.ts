import { ALL_TYPES, getEffectiveness } from './damage';
import type { SimPokemon } from './pokemon';

/** The role scores of a species' PvPoke ranking entry that the trait heuristics look at. */
export interface TraitScores {
	switch: number;
	charger: number;
	consistency: number;
}

export interface Traits {
	pros: Array<string>;
	cons: Array<string>;
}

/**
 * PvPoke's `generateTraits`: the descriptive pros/cons ("Bulky", "Glass
 * Cannon", "Spammy"…) it prints on the rankings page. The Team Builder only
 * uses them to decide whether two threats are "the same kind of Pokémon" (see
 * `similarityScore`), so the descriptions are dropped and only names remain.
 */
export const generateTraits = (poke: SimPokemon, cp: number, scores: TraitScores | undefined): Traits => {
	const pros: Array<string> = [];
	const cons: Array<string> = [];
	const fast = poke.fastMove;
	const best = poke.bestChargedMove!;

	// Bulkiness
	const bulk = poke.stats.def * poke.stats.hp * poke.shadowDefMult;
	let bulkScale = [12500, 14000, 17000, 23000];
	if (cp === 500) bulkScale = [4000, 6000, 8000, 12000];
	else if (cp === 2500) bulkScale = [19000, 22000, 25000, 31000];
	else if (cp === 10000) bulkScale = [27000, 30000, 35000, 39000];

	let bulkRating = 0;
	if (bulk <= bulkScale[0]) {
		cons.push(Math.pow(poke.stats.atk * poke.shadowAtkMult, 2) > bulk ? 'Glass Cannon' : 'Glassy');
		bulkRating = -2;
	} else if (bulk <= bulkScale[1]) {
		cons.push('Less Bulky');
		bulkRating = -1;
	} else if (bulk >= bulkScale[3]) {
		pros.push('Extremely Bulky');
		bulkRating = 2;
	} else if (bulk >= bulkScale[2]) {
		pros.push('Bulky');
		bulkRating = 1;
	}

	// Charged Move activation speed (average over two cycles to account for overflow energy)
	const activationSpeed =
		Math.ceil((poke.fastestChargedMove.energy * 2) / fast.energyGain) * fast.cooldown * (1 / 1000);
	if (activationSpeed <= 12) pros.push('Spammy');
	else if (activationSpeed >= 19) cons.push('Slow');

	// Fast Move duration
	if (fast.cooldown === 500) pros.push('Agile');
	else if (fast.cooldown >= 2000) cons.push('Clumsy');

	// Charged Move coverage
	let averagePower = 0;
	let totalResistingTypes = 0;
	let totalSuperEffectiveTypes = 0;

	let targetDef = 120;
	if (cp === 500) targetDef = 75;
	else if (cp === 2500) targetDef = 150;
	else if (cp === 10000) targetDef = 170;

	for (const type of ALL_TYPES) {
		let powerVsType = 0;
		let bestEffectiveness = 0;

		for (const move of poke.chargedMoves) {
			const effectiveness = getEffectiveness(move.type, [type, 'none']);
			let effectivePower = move.power * move.stab * poke.shadowAtkMult * effectiveness * (poke.stats.atk / targetDef);
			const speed = Math.ceil(move.energy / fast.energyGain) * (fast.cooldown / 500);
			effectivePower = effectivePower * (30 / speed);

			if (effectivePower > powerVsType) powerVsType = effectivePower;
			if (effectiveness > bestEffectiveness) bestEffectiveness = effectiveness;
		}

		averagePower += powerVsType;
		if (bestEffectiveness < 1) totalResistingTypes++;
		else if (bestEffectiveness > 1) totalSuperEffectiveTypes++;
	}

	averagePower /= ALL_TYPES.length;

	let inflexible = false;
	if (totalResistingTypes === 0 && totalSuperEffectiveTypes >= 5 && averagePower >= 200) {
		pros.push('Flexible');
	} else if (totalResistingTypes >= 2 && averagePower <= 240 && poke.speciesId !== 'mew') {
		cons.push('Inflexible');
		inflexible = true;
	}

	if (
		(poke.chargedMoves.length < 2 ||
			(poke.chargedMoves.length === 2 && poke.chargedMoves[0].type === poke.chargedMoves[1].type)) &&
		!inflexible
	) {
		cons.push('Inflexible');
	}

	// Switch and safety scores
	if (scores && (scores.switch >= 90 || scores.charger >= 90) && fast.energyGain / fast.cooldown >= 3 / 500) {
		pros.push('Dynamic');
	}

	// Fast Move pressure
	const effectiveDPT =
		(fast.power * fast.stab * poke.shadowAtkMult * (poke.stats.atk / targetDef)) / (fast.cooldown / 500);
	if (effectiveDPT >= 4) pros.push('Fast Move Pressure');
	else if (effectiveDPT <= 2) cons.push('Low Fast Move Pressure');

	// Charged Move / shield pressure
	let effectivePower = best.power * best.stab * poke.shadowAtkMult * (poke.stats.atk / targetDef);
	const bestSpeed = Math.ceil(best.energy / fast.energyGain) * (fast.cooldown / 500);
	effectivePower = effectivePower * (30 / bestSpeed);

	if (effectivePower >= 210 || poke.speciesId === 'aegislash_shield') pros.push('Shield Pressure');
	else if (effectivePower <= 150) cons.push('Low Shield Pressure');

	// Defensive typing
	let totalResistances = 0;
	let totalWeaknesses = 0;
	let doubleWeaknesses = 0;

	for (const type of Object.keys(poke.typeEffectiveness)) {
		const eff = poke.typeEffectiveness[type];
		if (eff < 0.9) {
			totalResistances++;
		} else if (eff > 1.1) {
			totalWeaknesses++;
			if (eff > 2) doubleWeaknesses++;
		}
	}

	if (totalResistances >= 6 && totalWeaknesses < totalResistances && bulkRating >= 0) pros.push('Defensive');
	else if (totalWeaknesses >= 5 && totalWeaknesses > totalResistances) cons.push('Vulnerable');

	if (doubleWeaknesses > 0) cons.push('Volatile');

	// Specific move archetypes
	if (
		poke.hasMove('OCTAZOOKA') ||
		poke.hasMove('LEAF_TORNADO') ||
		poke.hasMove('MIRROR_SHOT') ||
		poke.hasMove('MUDDY_WATER') ||
		poke.hasMove('TRI_ATTACK')
	) {
		cons.push('Chaotic');
	}

	if (poke.hasMove('POWER_UP_PUNCH') || poke.hasMove('FLAME_CHARGE') || poke.hasMove('FELL_STINGER')) {
		pros.push('Momentum');
	}

	const hasSelfDebuffingMove = poke.chargedMoves.some((m) => m.selfDebuffing);

	if (
		poke.hasMove('BUBBLE_BEAM') ||
		poke.hasMove('ICY_WIND') ||
		poke.hasMove('LUNGE') ||
		poke.hasMove('SAND_TOMB') ||
		poke.hasMove('ACID_SPRAY') ||
		hasSelfDebuffingMove ||
		poke.formChange
	) {
		// Only energy-driven Pokémon get this trait
		if (fast.energyGain / fast.cooldown >= 3 / 500) cons.push('Technical');
	}

	// Consistency
	if (scores && scores.consistency <= 75) cons.push('Inconsistent');

	return { pros, cons };
};

/**
 * PvPoke's `calculateSimilarity`, as the Team Builder calls it (ranking not
 * factored in): how alike two Pokémon are by shared types, moves and traits.
 * `-1` means the same species (Shadow included). A score of 1000+ is what the
 * Team Builder treats as "the same threat twice".
 *
 * `traits` is what upstream passes as the *reference* traits. Upstream passes
 * the candidate's own cached traits when it has any — so from the second
 * comparison on, a candidate is partly compared against itself. That
 * quirk is preserved by letting the caller pass what it wants here.
 */
export const similarityScore = (
	self: SimPokemon,
	candidate: SimPokemon,
	candidateTraits: Traits,
	traits: Traits
): number => {
	let score = 0;

	if (candidate.speciesId.replace('_shadow', '') === self.speciesId.replace('_shadow', '')) return -1;

	for (const type of candidate.types) {
		if (self.types.includes(type) && type !== 'none') score += 400;
	}

	if (candidate.fastMove.moveId === self.fastMove.moveId) score += 350;

	for (const move of candidate.chargedMoves) {
		for (const own of self.chargedMoves) {
			if (move.moveId === own.moveId) score += 200;
		}
	}

	for (const pro of candidateTraits.pros) {
		for (const ref of traits.pros) {
			if (pro === ref) {
				score += 100;
				if (pro === 'Bulky') score += 150;
				if (pro === 'Extremely Bulky') score += 350;
			}
			if (pro === 'Bulky' && ref === 'Extremely Bulky') score += 25;
			if (pro === 'Extremely Bulky' && ref === 'Bulky') score += 25;
		}
	}

	for (const con of candidateTraits.cons) {
		for (const ref of traits.cons) {
			if (con === ref) score += 50;
			if (con === 'Less Bulky' && ref === 'Glass Cannon') score += 25;
			if (con === 'Glass Cannon' && ref === 'Less Bulky') score += 25;
		}
	}

	return score;
};
