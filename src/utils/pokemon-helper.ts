import type { GameLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { PokemonForms } from '../DTOs/PokemonForms';
import type { DPSEntry } from '../queries/raid-ranker';

/**
 * Computes the effective damage of a move, assuming the target pokemon has 200 defense with 15 defense IV.
 * @param baseAtk - The attacker pokémon's base attack.
 * @param moveDamage - The raw move damage.
 * @param stab - A boolean field indicating whether the move has STAB bonus for the pokémon or not.
 * @param effectiveness - The effectiveness scalar used. Depends on the target.
 * @returns
 */

export enum Effectiveness {
	DoubleResistance = 0.390625,
	Resistance = 0.625,
	Normal = 1,
	Effective = 1.6,
	DoubleEffective = 2.56,
}

export const isNormalPokemonAndHasShadowVersion = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
) => {
	if (pokemon.isShadow) {
		return false;
	}

	return Object.values(gamemasterPokemon).some(
		(p) =>
			p.speciesId !== pokemon.speciesId &&
			!p.aliasId &&
			p.dex === pokemon.dex &&
			p.isShadow &&
			p.types.length === pokemon.types.length &&
			p.types.every((t) => pokemon.types.includes(t))
	);
};

const normalizedMoveName = (moveName: string) =>
	moveName
		.split('_')
		.map((p) => p.substring(0, 1).toLocaleUpperCase() + p.substring(1).toLocaleLowerCase())
		.join(' ');

export const translateMoveFromMoveId = (
	moveId: string,
	moves: Record<string, IGameMasterMove>,
	gameLanguage: GameLanguage
) => {
	const typedMove = moves[moveId];
	if (!typedMove) {
		console.error("Couldn't find PokemonCounters " + moveId);
		return normalizedMoveName(moveId);
	}

	return typedMove.moveName[gameLanguage];
};

export const shortName = (name: string): string => {
	const match = /\(([^()]*)\)/.exec(name); // extract content inside parentheses
	let prefix = '';
	let suffix = '';

	if (match) {
		const content = match[1].trim();

		if (content.startsWith('Mega')) {
			prefix = 'M.';

			// Check if it ends with X or Y
			const parts = content.split(' ');
			if (parts.length === 2 && (parts[1] === 'X' || parts[1] === 'Y')) {
				suffix = parts[1];
			}
		}

		if (content.startsWith('Primal')) {
			prefix = 'P.';
		}
	}

	const baseName = name.replace(/\([^()]*\)/g, '').trim();
	return [prefix, baseName, suffix].filter(Boolean).join(' ');
};

export const getForm = (name: string) => {
	name = name.replaceAll('(Shadow)', '');
	name = name.replaceAll('Shadow', '');

	if (name.length - 1 > name.replaceAll('(', '').length) {
		console.error(`Multiple forms for ${name} detected.`);
	}

	const firstParenthesisIdx = name.indexOf('(');
	if (firstParenthesisIdx === -1) {
		return '';
	}

	const form = name.substring(firstParenthesisIdx + 1, name.indexOf(')'));
	if (form === 'Jr') {
		return '';
	}

	if (
		form &&
		!Object.values(PokemonForms)
			.map((f) => f.toLocaleLowerCase())
			.includes(form.toLocaleLowerCase())
	) {
		console.log('Missing form for raid detection:' + form);
		console.log(`pokemon id: ${name}`);
	}
	return form;
};

const accumulatedStardustCosts = [
	0, 200, 400, 600, 800, 1200, 1600, 2000, 2400, 3000, 3600, 4200, 4800, 5600, 6400, 7200, 8000, 9000, 10000, 11000,
	12000, 13300, 14600, 15900, 17200, 18800, 20400, 22000, 23600, 25500, 27400, 29300, 31200, 33400, 35600, 37800, 40000,
	42500, 45000, 47500, 50000, 53000, 56000, 59000, 62000, 65500, 69000, 72500, 76000, 80000, 84000, 88000, 92000, 96500,
	101000, 105500, 110000, 115000, 120000, 125000, 130000, 136000, 142000, 146000, 154000, 161000, 168000, 175000,
	182000, 190000, 198000, 206000, 214000, 223000, 232000, 241000, 250000, 260000, 270000, 280000, 290000, 301000,
	312000, 323000, 334000, 346000, 358000, 370000, 382000, 395000, 408000, 421000, 434000, 448000, 462000, 476000,
	490000, 505000, 520000, 520000, 520000,
];
const accumulatedCandyCosts = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42,
	44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 60, 69, 72, 75, 78, 81, 84, 87, 90, 94, 98, 102, 106, 110, 114, 118, 122, 126,
	130, 136, 142, 148, 154, 162, 170, 178, 186, 196, 206, 216, 226, 238, 250, 262, 274, 289, 304, 304, 304, 304, 304,
	304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304,
];
const shadowAccumulatedCandyCosts = [
	0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70,
	73, 76, 79, 82, 85, 88, 91, 94, 97, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 145, 150, 155, 160, 165,
	170, 175, 180, 185, 190, 198, 206, 214, 222, 232, 242, 252, 262, 274, 286, 298, 310, 325, 340, 355, 370, 388, 406,
	406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406, 406,
];
const accumulatedXLCandyCosts = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 10, 20, 30, 40, 52, 64, 76, 88, 103, 118, 133, 148, 165, 182, 199, 216, 236, 256, 276, 296, 296, 296,
];
const shadowAccumulatedXLCandyCosts = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 12, 24, 36, 48, 63, 78, 93, 108, 126, 144, 162, 180, 201, 222, 243, 264, 288, 312, 336, 360, 360, 360,
];

type NeededResources = {
	stardust: number;
	candies: number;
	candiesXL: number;
};

export const levelToLevelIndex = (level: number) => (level - 1) * 2;

/**
 * The level ceiling the app evaluates to. In-game a Pokémon can reach 51 (Best
 * Buddy) or beyond (Super Mega L4), but those are edge cases we deliberately
 * ignore so every ranking, CP and trash string is expressed against level 50.
 */
export const MAX_LEVEL = 50;
/** {@link MAX_LEVEL} as a half-level CPM index. */
export const MAX_LEVEL_INDEX = levelToLevelIndex(MAX_LEVEL);

export const needsXLCandy = (pokemon: IGamemasterPokemon, cpThreshold: number) => {
	if (!cpThreshold) {
		return false;
	}

	const cp = calculateCP(
		pokemon.baseStats.atk,
		15,
		pokemon.baseStats.def,
		15,
		pokemon.baseStats.hp,
		15,
		levelToLevelIndex(41)
	);
	return cp < cpThreshold + 150;
};

export const computeNeededResources: (
	currentLevel: number,
	targetLevel: number,
	isShadow: boolean
) => NeededResources = (currentLevel: number, targetLevel: number, isShadow: boolean) => {
	const neededStardust =
		(accumulatedStardustCosts[levelToLevelIndex(targetLevel)] -
			accumulatedStardustCosts[levelToLevelIndex(currentLevel)]) *
		(isShadow ? 1.2 : 1);
	const neededCandies = isShadow
		? shadowAccumulatedCandyCosts[levelToLevelIndex(targetLevel)] -
			shadowAccumulatedCandyCosts[levelToLevelIndex(currentLevel)]
		: accumulatedCandyCosts[levelToLevelIndex(targetLevel)] - accumulatedCandyCosts[levelToLevelIndex(currentLevel)];
	const neededXLCandies = isShadow
		? shadowAccumulatedXLCandyCosts[levelToLevelIndex(targetLevel)] -
			shadowAccumulatedXLCandyCosts[levelToLevelIndex(currentLevel)]
		: accumulatedXLCandyCosts[levelToLevelIndex(targetLevel)] -
			accumulatedXLCandyCosts[levelToLevelIndex(currentLevel)];

	return {
		stardust: neededStardust,
		candies: neededCandies,
		candiesXL: neededXLCandies,
	};
};

export const computeMoveEffectiveness = (ownMoveType: string, targetType1: string, targetType2?: string) => {
	const matrix: Record<string, Array<number>> = {};
	matrix.normal = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.DoubleResistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.fighting = [
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.DoubleResistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
	];

	matrix.flying = [
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.poison = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.DoubleResistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
	];

	matrix.ground = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.DoubleResistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.rock = [
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.bug = [
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
	];

	matrix.ghost = [
		Effectiveness.DoubleResistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
	];

	matrix.steel = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
	];

	matrix.fire = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.water = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.grass = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.electric = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.DoubleResistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.psychic = [
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.DoubleResistance,
		Effectiveness.Normal,
	];

	matrix.ice = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
	];

	matrix.dragon = [
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.DoubleResistance,
	];

	matrix.dark = [
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
	];

	matrix.fairy = [
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Resistance,
		Effectiveness.Resistance,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Normal,
		Effectiveness.Effective,
		Effectiveness.Effective,
		Effectiveness.Normal,
	];

	const targetType1Index = Object.keys(matrix).indexOf(targetType1);
	const targetType2Index = targetType2 ? Object.keys(matrix).indexOf(targetType2) : -1;

	return matrix[ownMoveType][targetType1Index] * (targetType2 ? matrix[ownMoveType][targetType2Index] : 1);
};

/* ---- raid model constants ---------------------------------------------------
 * See the DPS/TDO methodology notes: the offensive side is exact game math; the
 * defensive side (TDO / eDPS) uses one fitted "incoming DPS" constant that is
 * the same for every boss, matching GamePress / DialgaDex / GO Hub.
 */

/** GamePress "y": incoming DPS ≈ Y / attacker_def_eff. Boss-agnostic. */
export const RAID_INCOMING_DPS_NUMERATOR = 900;
/** Companion: one absorbed boss charged hit, for the energy-from-damage term. */
export const RAID_INCOMING_CM_POWER = 11700;
export const RAID_RESPAWN_SECONDS = 1;
export const RAID_RELOBBY_SECONDS = 10;
export const RAID_PARTY_SIZE = 6;

export type RaidTier = 'T1' | 'T3' | 'T5' | 'MEGA' | 'T6' | 'PRIMAL' | 'ELITE';

/**
 * Boss HP + the CPM applied to the boss's base defense, per tier. HP and CPM are
 * datamined game constants (not estimates). T6 = Mega-Legendary raids.
 */
export const RAID_BOSS_STATS: Record<RaidTier, { hp: number; cpm: number }> = {
	T1: { hp: 600, cpm: 0.5974 },
	T3: { hp: 3600, cpm: 0.73 },
	T5: { hp: 15000, cpm: 0.79 },
	MEGA: { hp: 9000, cpm: 0.79 },
	T6: { hp: 22500, cpm: 0.79 },
	PRIMAL: { hp: 22500, cpm: 0.79 },
	ELITE: { hp: 20000, cpm: 0.79 },
};

/**
 * Best-effort raid tier from Game Master flags: primal (`*_primal` + mega) →
 * Primal, super mega → T6, mega → Mega, legendary/mythical/ultra-beast → T5, an
 * evolved form (or a standalone with no evo line) → T3, the base of an evo line
 * → T1. Elite Raids are event-scheduled, not intrinsic — pass `tier: 'ELITE'`
 * explicitly when you know it's one.
 */
export const guessRaidTier = (p: IGamemasterPokemon): RaidTier => {
	if (p.isMega && p.speciesId.includes('_primal')) return 'PRIMAL';
	if (p.isSuperMega) return 'T6';
	if (p.isMega) return 'MEGA';
	if (p.isLegendary || p.isMythical || p.isBeast) return 'T5';
	if (p.family?.parent) return 'T3';
	if (p.family?.evolutions && p.family.evolutions.length > 0) return 'T1';
	return 'T3';
};

/** PvE battles resolve on a 500 ms server tick, so every duration snaps to it. */
const roundToPveTurn = (seconds: number) => Math.round(seconds * 2) / 2;

/** DialgaDex Party Power model: 0..1 boost on the charged move. */
const partyPowerBoost = (fastPerCharged: number, partySize: number) => {
	if (!partySize || partySize <= 1) return 0;
	const perBoost = partySize === 2 ? 18 : partySize === 3 ? 9 : 6;
	return Math.max(0, Math.min(fastPerCharged / perBoost, 1));
};

export interface WeaveDpsInput {
	fastDmg: number;
	fastDurationSec: number;
	fastEnergy: number;
	chargedDmg: number;
	chargedDurationSec: number;
	/** Energy the charged move costs, as a positive number. */
	chargedEnergyCost: number;
	attackerHpEff: number;
	incomingDps: number;
	incomingChargedHit?: number;
	partyBoost?: number;
}

/**
 * Weave DPS with the GamePress "comprehensive" corrections layered on the
 * steady-state cycle: 0.5 s tick rounding, a 1-bar energy-cap penalty, the
 * energy handed to you by incoming damage, the finite-fight `(0.5 − x/hp)·y`
 * correction (slow ramp early, energy dump as you faint), and Party Power.
 */
export const weaveDps = ({
	fastDmg,
	fastDurationSec,
	fastEnergy,
	chargedDmg,
	chargedDurationSec,
	chargedEnergyCost,
	attackerHpEff,
	incomingDps,
	incomingChargedHit = 0,
	partyBoost = 0,
}: WeaveDpsInput): number => {
	const d_f = roundToPveTurn(fastDurationSec);
	const d_c = roundToPveTurn(chargedDurationSec);

	if (d_f <= 0 || fastEnergy <= 0 || chargedEnergyCost <= 0) {
		return d_f > 0 ? fastDmg / d_f : 0;
	}

	const fm_dps = fastDmg / d_f;
	const fm_eps = fastEnergy / d_f;
	const cm_dps = chargedDmg / d_c;
	const cm_dps_adj = cm_dps * (1 + partyBoost);

	// energy-cap waste on a 1-bar move: it sits pinned near the 100 ceiling, so a
	// fast move's worth of energy overflows every cycle. This is DialgaDex's
	// turn-based form `(100 + 0.5·E_f) / d_c` — its extra `0.5·y·dws` term only
	// applies in continuous mode, which we are not.
	let cm_eps = chargedEnergyCost / d_c;
	if (chargedEnergyCost >= 100) {
		cm_eps = (chargedEnergyCost + 0.5 * fastEnergy) / d_c;
	}

	const x = 0.5 * chargedEnergyCost + 0.5 * fastEnergy + 0.5 * incomingChargedHit;

	if (fm_dps > cm_dps) return fm_dps;

	const dps0 = (fm_dps * cm_eps + cm_dps_adj * fm_eps) / (cm_eps + fm_eps);
	const dps = dps0 + ((cm_dps_adj - fm_dps) / (cm_eps + fm_eps)) * (0.5 - x / attackerHpEff) * incomingDps;

	return fm_dps > dps ? fm_dps : Math.max(dps, 0);
};

export interface RaidOpts {
	/** Boss tier — sets boss HP (eDPS) and the CPM on the boss's defense. */
	tier?: RaidTier | undefined;
	/** Attacker move types boosted ×1.2 by the current weather. */
	weatherBoostedTypes?: ReadonlySet<string> | undefined;
	/** Friendship damage multiplier (1 = none … 1.11 = best friend). */
	friendship?: number | undefined;
	/** Trainers fast-attacking together, for Party Power (1 = off). */
	partySize?: number | undefined;
	/** A Mega of this type on your team: ×1.3 same type, ×1.1 others. */
	megaBoostType?: string | undefined;
}

export const computeDPSEntry = (
	p: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	moves: Record<string, IGameMasterMove>,
	attackIV = 15,
	level = MAX_LEVEL_INDEX,
	forcedType = '',
	target?: IGamemasterPokemon,
	movesetOverride?: [string, string],
	opts: RaidOpts = {}
): DPSEntry => {
	// Real boss for Counters; a generic T5 raid for the pre-computed type list.
	const tier: RaidTier = opts.tier ?? (target ? guessRaidTier(target) : 'T5');
	const boss = RAID_BOSS_STATS[tier];

	const attackerDefEff = (p.baseStats.def + 15) * cpm[level] * (p.isShadow ? 0.8333333 : 1);
	const attackerHpEff = Math.floor((p.baseStats.hp + 15) * cpm[level]);
	const incomingDps = RAID_INCOMING_DPS_NUMERATOR / attackerDefEff;
	const incomingChargedHit = RAID_INCOMING_CM_POWER / attackerDefEff;

	const moveBonus = (moveType: string) => {
		let m = opts.friendship && opts.friendship > 1 ? opts.friendship : 1;
		if (opts.weatherBoostedTypes?.has(moveType)) m *= 1.2;
		if (opts.megaBoostType) m *= moveType === opts.megaBoostType ? 1.3 : 1.1;
		return m;
	};

	const dmg = (moveId: string) => {
		const mv = moves[moveId];
		const mType = mv.type.toLocaleLowerCase();
		const stab = p.types.map((t) => t.toString().toLocaleLowerCase()).includes(mType);
		const eff = target
			? computeMoveEffectiveness(
					mv.type,
					target.types[0].toString().toLocaleLowerCase(),
					target.types[1]?.toString().toLocaleLowerCase()
				)
			: forcedType && forcedType !== 'normal' && mType === forcedType
				? Effectiveness.Effective
				: Effectiveness.Normal;
		return calculateDamage(
			p.baseStats.atk,
			mv.pvePower,
			stab,
			p.isShadow,
			target ? target.isShadow : false,
			eff,
			attackIV,
			level,
			target ? target.baseStats.def : 200,
			moveBonus(mType),
			boss.cpm
		);
	};

	const finalize = (fast: string, charged: string, fastDmg: number, chargedDmg: number, dps: number): DPSEntry => {
		const safeDps = Number.isFinite(dps) && dps > 0 ? dps : 0;
		const tof = incomingDps > 0 ? attackerHpEff / incomingDps : 0;
		const tdo = safeDps * tof;
		let edps = 0;
		if (tdo > 0 && tof > 0) {
			const lives = boss.hp / tdo;
			const deaths = Math.max(0, Math.ceil(lives) - 1);
			const relobbies = Math.floor(deaths / RAID_PARTY_SIZE);
			const ttw = lives * tof + (deaths - relobbies) * RAID_RESPAWN_SECONDS + relobbies * RAID_RELOBBY_SECONDS;
			edps = ttw > 0 ? boss.hp / ttw : 0;
		}
		return {
			fastMove: fast,
			chargedMove: charged,
			dps: safeDps,
			tdo,
			edps,
			speciesId: p.speciesId,
			fastMoveDmg: fastDmg,
			chargedMoveDmg: chargedDmg,
			rank: -1,
		};
	};

	const oneWeave = (fastId: string, chargedId: string, fastDmg: number, chargedDmg: number) => {
		const fm = moves[fastId];
		const cm = moves[chargedId];
		const chargedEnergyCost = -cm.pveEnergy;
		const fastEnergy = fm.pveEnergy;
		const fastPerCharged = fastEnergy > 0 ? chargedEnergyCost / fastEnergy : 0;
		return weaveDps({
			fastDmg,
			fastDurationSec: fm.pveCooldown,
			fastEnergy,
			chargedDmg,
			chargedDurationSec: cm.pveCooldown,
			chargedEnergyCost,
			attackerHpEff,
			incomingDps,
			incomingChargedHit,
			partyBoost: partyPowerBoost(fastPerCharged, opts.partySize ?? 1),
		});
	};

	if (movesetOverride) {
		const [f, c] = movesetOverride;
		const fastMoveDmg = dmg(f);
		const chargedMoveDmg = dmg(c);
		return finalize(f, c, fastMoveDmg, chargedMoveDmg, oneWeave(f, c, fastMoveDmg, chargedMoveDmg));
	}

	let best = { dps: -Infinity, fast: '', fastDmg: 0, charged: '', chargedDmg: 0 };
	for (const currentFastMove of p.fastMoves) {
		for (const currentChargedMove of p.chargedMoves) {
			const chargedMove = moves[currentChargedMove];
			if (forcedType && chargedMove.type !== forcedType) {
				continue;
			}
			const fastMoveDmg = dmg(currentFastMove);
			const chargedMoveDmg = dmg(currentChargedMove);
			const dps = oneWeave(currentFastMove, currentChargedMove, fastMoveDmg, chargedMoveDmg);
			if (dps > best.dps) {
				best = {
					dps,
					fast: moves[currentFastMove].moveId,
					fastDmg: fastMoveDmg,
					charged: chargedMove.moveId,
					chargedDmg: chargedMoveDmg,
				};
			}
		}
	}
	return finalize(best.fast, best.charged, best.fastDmg, best.chargedDmg, best.dps);
};

export const calculateDamage = (
	baseAtk: number,
	moveDamage: number,
	stab: boolean,
	selfShadow: boolean,
	targetShadow = false,
	effectiveness: Effectiveness = Effectiveness.Effective,
	attackIV = 15,
	level = MAX_LEVEL_INDEX,
	targetDef = 200,
	/** Weather × friendship × mega-aura, applied on top. */
	bonusMultiplier = 1,
	/** CPM applied to the defender's base defense (raid tier CPM, or L40). */
	defenderCpm = cpm[78]
) => {
	return (
		Math.floor(
			0.5 *
				moveDamage *
				(((baseAtk + attackIV) * cpm[level] * (selfShadow ? 1.2 : 1)) /
					((targetDef + 15) * defenderCpm * (targetShadow ? 0.8333333 : 1))) *
				(stab ? 1.2 : 1) *
				effectiveness *
				bonusMultiplier
		) + 1
	);
};

export const pveDPS = (
	chargedMoveDamage: number,
	fastMoveDamage: number,
	fastMoveCooldown: number,
	chargedMoveRequiredEnergy: number,
	fastMoveEnergy: number,
	chargedMoveAnimationDuration: number
) => {
	const fastMoveDPS = fastMoveDamage / fastMoveCooldown;

	// No usable rotation: a fast move that generates no energy can never charge a
	// move, and a charged move with 0 required energy makes the load-time maths
	// blow up (e.g. Cramorant). Fall back to spamming the fast move.
	if (chargedMoveRequiredEnergy === 0 || fastMoveEnergy === 0) {
		return fastMoveDPS;
	}

	const secondsNeededToLoadChargedMove =
		chargedMoveRequiredEnergy === 0 ? 0 : (chargedMoveRequiredEnergy / fastMoveEnergy) * fastMoveCooldown;

	const chargedMoveUsageDPS =
		(chargedMoveDamage + fastMoveDPS * secondsNeededToLoadChargedMove) /
		(secondsNeededToLoadChargedMove + chargedMoveAnimationDuration);

	return Math.max(chargedMoveUsageDPS, fastMoveDPS);
};

const megaFetcherExceptions = ['slowbro_galarian', 'slowpoke_galarian', 'mewtwo_armored'];

const getMegaPokemonFromBase = (pokemon: IGamemasterPokemon, gamemasterPokemon: Record<string, IGamemasterPokemon>) => {
	return Object.values(gamemasterPokemon).filter(
		(p) => !p.aliasId && p.isMega && p.dex === pokemon.dex && !megaFetcherExceptions.includes(pokemon.speciesId)
	);
};

export const fetchReachablePokemonIncludingSelf = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	domainFilter?: (p: IGamemasterPokemon) => boolean,
	includeMega?: boolean
) => {
	const reachablePokemons = new Set<IGamemasterPokemon>();

	const nonShadowReplica =
		!pokemon.isShadow || pokemon.isMega
			? []
			: Object.values(gamemasterPokemon).filter(
					(r) =>
						!r.aliasId &&
						r.speciesId === pokemon.speciesId.replaceAll('_shadow', '') &&
						(!domainFilter || domainFilter(r))
				);

	const baseVersionOfMegaPkm = !pokemon.isMega
		? []
		: Object.values(gamemasterPokemon).filter(
				(r) =>
					!r.aliasId &&
					(!domainFilter || domainFilter(r)) &&
					r.dex === pokemon.dex &&
					!r.isMega &&
					!r.isShadow &&
					!megaFetcherExceptions.includes(r.speciesId)
			);

	const queue = [pokemon, ...nonShadowReplica, ...baseVersionOfMegaPkm];

	while (queue.length > 0) {
		const currentPokemon = queue.shift()!;

		if (reachablePokemons.has(currentPokemon)) {
			continue;
		}

		if (includeMega) {
			queue.push(...getMegaPokemonFromBase(currentPokemon, gamemasterPokemon));
		}

		reachablePokemons.add(currentPokemon);
		if (!currentPokemon.family?.evolutions || currentPokemon.family.evolutions.length === 0) {
			continue;
		}
		queue.push(
			...currentPokemon.family.evolutions
				.map((id) => gamemasterPokemon[id])
				.filter((pk) => pk && pk.isShadow === currentPokemon.isShadow && (!domainFilter || domainFilter(pk)))
		);
	}

	return reachablePokemons;
};

const sortPokemonByBattlePower = (a: IGamemasterPokemon, b: IGamemasterPokemon, asc: boolean) => {
	const sortScalar = asc ? -1 : 1;

	if (b.baseStats.atk * b.baseStats.def * b.baseStats.hp > a.baseStats.atk * a.baseStats.def * a.baseStats.hp) {
		return 1 * sortScalar;
	}

	if (b.baseStats.atk * b.baseStats.def * b.baseStats.hp < a.baseStats.atk * a.baseStats.def * a.baseStats.hp) {
		return -1 * sortScalar;
	}

	if (b.speciesId < a.speciesId) {
		return 1 * sortScalar;
	}

	return -1 * sortScalar;
};

export const sortPokemonByBattlePowerDesc = (a: IGamemasterPokemon, b: IGamemasterPokemon) => {
	return sortPokemonByBattlePower(a, b, false);
};

export const sortPokemonByBattlePowerAsc = (a: IGamemasterPokemon, b: IGamemasterPokemon) => {
	return sortPokemonByBattlePower(a, b, true);
};

export const fetchPredecessorPokemonIncludingSelf = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	domainFilter?: (p: IGamemasterPokemon) => boolean
) => {
	const predecessorPokemons = new Set<IGamemasterPokemon>();
	const queue = [pokemon];

	while (queue.length > 0) {
		const currentPokemon = queue.shift()!;

		if (predecessorPokemons.has(currentPokemon)) {
			continue;
		}

		predecessorPokemons.add(currentPokemon);

		if (!currentPokemon.family?.parent) {
			continue;
		}

		const parentRef = gamemasterPokemon[currentPokemon.family.parent];
		if (!parentRef || parentRef.isShadow !== pokemon.isShadow || (domainFilter && !domainFilter(parentRef))) {
			continue;
		}

		queue.push(parentRef);
	}

	return predecessorPokemons;
};

export const fetchPokemonFamily = (
	pokemon: IGamemasterPokemon,
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	domainFilter?: (p: IGamemasterPokemon) => boolean,
	pokemonByDex?: Record<string, Array<IGamemasterPokemon>>,
	pokemonByFamilyId?: Record<string, Array<IGamemasterPokemon>>
) => {
	const queue = [pokemon];
	const family = new Set<IGamemasterPokemon>();

	while (queue.length > 0) {
		const currentPokemon = queue.shift()!;

		if (family.has(currentPokemon)) {
			continue;
		}

		family.add(currentPokemon);

		const sameDex = pokemonByDex
			? pokemonByDex[currentPokemon.dex].filter((p) => !domainFilter || domainFilter(p))
			: Object.values(gamemasterPokemon).filter(
					(p) =>
						(!domainFilter || domainFilter(p)) &&
						p.dex === currentPokemon.dex &&
						p.isShadow === currentPokemon.isShadow &&
						!p.aliasId
				);
		const sameFamily = currentPokemon.family?.id
			? pokemonByFamilyId
				? pokemonByFamilyId[currentPokemon.family.id].filter((p) => !domainFilter || domainFilter(p))
				: Object.values(gamemasterPokemon).filter(
						(p) =>
							(!domainFilter || domainFilter(p)) &&
							p.family &&
							p.family.id === currentPokemon.family!.id &&
							p.isShadow === currentPokemon.isShadow &&
							!p.aliasId
					)
			: [];
		const predecessorPokemons = fetchPredecessorPokemonIncludingSelf(currentPokemon, gamemasterPokemon, domainFilter);
		const reachablePokemons = Array.from(
			fetchReachablePokemonIncludingSelf(currentPokemon, gamemasterPokemon, domainFilter)
		).filter((k) => k.isShadow === currentPokemon.isShadow);

		const newBatch = new Set(
			[...sameDex, ...sameFamily, ...predecessorPokemons, ...reachablePokemons].filter((p) => !family.has(p))
		);

		queue.push(...newBatch);
	}

	return family;
};

export const calculateCP = (
	baseAtk: number,
	atkIV: number,
	baseDef: number,
	defIV: number,
	baseHP: number,
	hpIV: number,
	level: number
) =>
	Math.max(
		10,
		Math.floor(
			((baseAtk + atkIV) * Math.sqrt(baseDef + defIV) * Math.sqrt(baseHP + hpIV) * cpm[level] * cpm[level]) / 10
		)
	);

export const calculateHP = (baseHP: number, hpIV: number, level: number) =>
	Math.max(10, Math.floor((baseHP + hpIV) * cpm[level]));

export const cpm = [
	0.0939999967813491, 0.135137430784308, 0.166397869586944, 0.192650914456886, 0.215732470154762, 0.236572655026622,
	0.255720049142837, 0.273530381100769, 0.29024988412857, 0.306057381335773, 0.321087598800659, 0.335445032295077,
	0.349212676286697, 0.36245774877879, 0.375235587358474, 0.387592411085168, 0.399567276239395, 0.41119354951725,
	0.422500014305114, 0.432926413410414, 0.443107545375824, 0.453059953871985, 0.46279838681221, 0.472336077786704,
	0.481684952974319, 0.490855810259008, 0.499858438968658, 0.508701756943992, 0.517393946647644, 0.525942508771329,
	0.534354329109191, 0.542635762230353, 0.550792694091796, 0.558830599438087, 0.566754519939422, 0.574569148039264,
	0.582278907299041, 0.589887911977272, 0.59740000963211, 0.604823657502073, 0.61215728521347, 0.61940411056605,
	0.626567125320434, 0.633649181622743, 0.640652954578399, 0.647580963301656, 0.654435634613037, 0.661219263506722,
	0.667934000492096, 0.674581899290818, 0.681164920330047, 0.687684905887771, 0.694143652915954, 0.700542893277978,
	0.706884205341339, 0.713169102333341, 0.719399094581604, 0.725575616972598, 0.731700003147125, 0.734741011137376,
	0.737769484519958, 0.740785574597326, 0.743789434432983, 0.746781208702482, 0.749761044979095, 0.752729105305821,
	0.75568550825119, 0.758630366519684, 0.761563837528228, 0.764486065255226, 0.767397165298461, 0.77029727397159,
	0.77318650484085, 0.776064945942412, 0.778932750225067, 0.781790064808426, 0.784636974334716, 0.787473583646825,
	0.790300011634826, 0.792803950958807, 0.795300006866455, 0.79780392148697, 0.800300002098083, 0.802803892322847,
	0.805299997329711, 0.807803863460723, 0.81029999256134, 0.812803834895026, 0.815299987792968, 0.817803806620319,
	0.820299983024597, 0.822803778631297, 0.825299978256225, 0.827803750922782, 0.830299973487854, 0.832803753381377,
	0.835300028324127, 0.837803755931569, 0.840300023555755, 0.842803729034748, 0.845300018787384, 0.847803702398935,
	0.850300014019012, 0.852803676019539, 0.85530000925064, 0.857803649892077, 0.860300004482269, 0.862803624012168,
	0.865299999713897,
];

export type IVs = {
	A: number;
	D: number;
	S: number;
	star: number;
};

export type BattleStats = {
	A: number;
	D: number;
	S: number;
};

export type RankEntry = {
	IVs: IVs;
	battle: BattleStats;
	L: number;
	CP: number;
};

export const computeBestIVs = (
	baseatk: number,
	basedef: number,
	basesta: number,
	league: number
): Record<string, Array<RankEntry>> => {
	const floor = 0;
	let minLvl = 1;
	let maxLvl = MAX_LEVEL;

	const ranks: Record<string, Array<RankEntry>> = {};

	const maxAtk = {
		value: 0,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	const maxDef = {
		value: 0,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	const maxHP = {
		value: 0,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	const minAtk = {
		value: 1000,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	const minDef = {
		value: 1000,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	const minHP = {
		value: 1000,
		aIV: 0,
		dIV: 0,
		sIV: 0,
		sp: 0,
	};
	let minRankLvl = 100;
	let maxRankLvl = 0;
	let numRanks = 0;
	/* account for half-level CPMs (40-1)*2=78 */
	minLvl = Math.max(0, (minLvl - 1) * 2);
	/* use half-levels */
	maxLvl = Math.max(0, (maxLvl - 1) * 2);
	/* use half-levels */
	for (let atk = floor / 1; atk <= 15; atk++) {
		for (let def = floor / 1; def <= 15; def++) {
			for (let sta = floor / 1; sta <= 15; sta++) {
				for (let level = maxLvl; level >= minLvl; level--) {
					const cp = calculateCP(baseatk, atk, basedef, def, basesta, sta, level);
					if (league && cp > league) {
						continue;
					}
					/* Update maxLvl on first loop (0/0/0 or floor/floor/floor) to optimize performance */
					if (atk === floor / 1 && def === floor / 1 && sta === floor / 1) {
						maxLvl = level;
					}
					const aSt = (baseatk + atk) * cpm[level];
					const dSt = (basedef + def) * cpm[level];
					const sSt = calculateHP(basesta, sta, level);
					const statProd = Math.round(aSt * dSt * sSt);
					/* update maxStats if necessary */
					if (maxAtk.value < aSt || (maxAtk.sp < statProd && maxAtk.value <= aSt)) {
						maxAtk.value = aSt;
						maxAtk.aIV = atk;
						maxAtk.dIV = def;
						maxAtk.sIV = sta;
						maxAtk.sp = statProd;
					}
					if (maxDef.value < dSt || (maxDef.sp < statProd && maxDef.value <= dSt)) {
						maxDef.value = dSt;
						maxDef.aIV = atk;
						maxDef.dIV = def;
						maxDef.sIV = sta;
						maxDef.sp = statProd;
					}
					if (maxHP.value < sSt || (maxHP.sp < statProd && maxHP.value <= sSt)) {
						maxHP.value = sSt;
						maxHP.aIV = atk;
						maxHP.dIV = def;
						maxHP.sIV = sta;
						maxHP.sp = statProd;
					}
					if (level / 1 > maxRankLvl / 1) {
						maxRankLvl = level;
					}
					/* update minStats if necessary */
					if (minAtk.value > aSt || (minAtk.sp < statProd && minAtk.value >= aSt)) {
						minAtk.value = aSt;
						minAtk.aIV = atk;
						minAtk.dIV = def;
						minAtk.sIV = sta;
						minAtk.sp = statProd;
					}
					if (minDef.value > dSt || (minDef.sp < statProd && minDef.value >= dSt)) {
						minDef.value = dSt;
						minDef.aIV = atk;
						minDef.dIV = def;
						minDef.sIV = sta;
						minDef.sp = statProd;
					}
					if (minHP.value > sSt || (minHP.sp < statProd && minHP.value >= sSt)) {
						minHP.value = sSt;
						minHP.aIV = atk;
						minHP.dIV = def;
						minHP.sIV = sta;
						minHP.sp = statProd;
					}
					if (level / 1 < minRankLvl / 1) {
						minRankLvl = level;
					}

					const IVsum = atk / 1 + def / 1 + sta / 1;

					let star = 0;
					if (IVsum < 23) {
						star = 0;
					} else if (IVsum < 30) {
						star = 1;
					} else if (IVsum < 37) {
						star = 2;
					} else if (IVsum < 45) {
						star = 3;
					} else {
						star = 4;
					}

					const levelDisplay = level / 2 + 1;
					/* store as arrays to prevent hash collisions from dropping entires */
					/* Tie Breaking Order: 1)StatProd -> 2)AtkStat -> 3)HPval -> 4)finalCP -> 5)StaIV -> 6)ERROR */
					const newIndex = statProd + '.' + Math.round(100000 * aSt);
					const entry: RankEntry = {
						IVs: {
							A: atk,
							D: def,
							S: sta,
							star: star,
						},
						battle: {
							A: aSt,
							D: dSt,
							S: sSt,
						},
						L: levelDisplay,
						CP: cp,
					};
					if (!(newIndex in ranks)) {
						ranks[newIndex] = [entry];
					} else {
						let i = 0;
						const arr = ranks[newIndex];
						const arrLen = arr.length;
						for (; i < arrLen; i++) {
							if (sSt > arr[i].battle.S) {
								break;
							} else if (sSt === arr[i].battle.S) {
								if (cp > arr[i].CP) {
									break;
								} else if (cp === arr[i].CP) {
									if (sta > arr[i].IVs.S) {
										/*console.log("Used 5th tie breaker (Stamina IV) for newIndex("+newIndex+"):"+JSON.stringify(ranks[newIndex]));*/
										break;
									} else if (sta === arr[i].IVs.S) {
										console.log('Need 6th tie breaker for newIndex(' + newIndex + '):' + JSON.stringify(arr));
									}
								}
							}
						}
						arr.splice(i, 0, entry);
					}
					numRanks = numRanks + 1;
					break;
					/* stop evaluating this IV combination */
				}
			}
		}
	}

	/* sort by statProd+CP before returning */
	const sorted: Record<string, Array<RankEntry>> = {};
	Object.keys(ranks)
		.sort((a: string, b: string) => {
			// sort descending by statProd+CP
			return Number(b) - Number(a);
		})
		.forEach((key: string) => {
			sorted[key] = ranks[key];
		});
	return sorted;
};
