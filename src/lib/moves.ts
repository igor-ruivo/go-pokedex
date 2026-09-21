import type { GameLanguage } from '../contexts/language-context';
import type { BuffsType, IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

/**
 * PvP fast-move duration in turns. A PvP turn is 0.5 s, and `pvpCooldown` is
 * stored in seconds (0.5 / 1 / 1.5 / 2), so turns = cooldown / 0.5.
 */
export const fastMoveTurns = (m: IGameMasterMove): number => Math.max(1, Math.round(m.pvpCooldown / 0.5));

export type Arena = 'pvp' | 'pve';

const STAB = 1.2;
const SHADOW_ATK = 1.2;

const power = (m: IGameMasterMove, a: Arena) => (a === 'pve' ? m.pvePower : m.pvpPower);
const energy = (m: IGameMasterMove, a: Arena) => (a === 'pve' ? m.pveEnergy : m.pvpEnergy);
const seconds = (m: IGameMasterMove, a: Arena) => (a === 'pve' ? m.pveCooldown : m.pvpCooldown);

/**
 * Damage multiplier this attacker applies to the move — same STAB (×1.2) and
 * shadow attack (×1.2) bonuses as `calculateDamage` in pokemon-helper. Base ATK /
 * level / target defense scale every move equally, so they're left out of these
 * per-move comparison metrics (they don't change ordering or ratios).
 */
const dmgMult = (m: IGameMasterMove, pokemon?: IGamemasterPokemon): number =>
	pokemon
		? (pokemon.types.some((t) => String(t).toLowerCase() === m.type.toLowerCase()) ? STAB : 1) *
			(pokemon.isShadow ? SHADOW_ATK : 1)
		: 1;

/** Damage per second for a fast move. STAB + shadow applied when a `pokemon` is given. */
export const moveDPS = (m: IGameMasterMove, a: Arena, pokemon?: IGamemasterPokemon): number =>
	(power(m, a) * dmgMult(m, pokemon)) / seconds(m, a);
/** Energy generated per second (fast moves) — energy isn't boosted by STAB / shadow. */
export const moveEPS = (m: IGameMasterMove, a: Arena): number => energy(m, a) / seconds(m, a);
/** Damage per energy spent for a charged move. STAB + shadow applied when a `pokemon` is given. */
export const moveDPE = (m: IGameMasterMove, a: Arena, pokemon?: IGamemasterPokemon): number =>
	(power(m, a) * dmgMult(m, pokemon)) / (Math.abs(energy(m, a)) || 1);

/** Every non-alias Pokémon that can learn this move (any slot). */
export const moveOwners = (moveId: string, gm: Record<string, IGamemasterPokemon>): Array<IGamemasterPokemon> =>
	Object.values(gm).filter(
		(p) =>
			!p.aliasId &&
			(p.fastMoves.includes(moveId) || p.chargedMoves.includes(moveId) || p.extraChargedMoves.includes(moveId))
	);

type StatEffectKey =
	| 'attackerAttackStatStageChange'
	| 'attackerDefenseStatStageChange'
	| 'targetAttackStatStageChange'
	| 'targetDefenseStatStageChange';

const STAT_EFFECTS: Array<{ key: StatEffectKey; who: 'own' | 'foe'; stat: 'Attack' | 'Defense' }> = [
	{ key: 'attackerAttackStatStageChange', who: 'own', stat: 'Attack' },
	{ key: 'attackerDefenseStatStageChange', who: 'own', stat: 'Defense' },
	{ key: 'targetAttackStatStageChange', who: 'foe', stat: 'Attack' },
	{ key: 'targetDefenseStatStageChange', who: 'foe', stat: 'Defense' },
];

// Pokémon GO's own move-detail screen shows these as short badges (e.g.
// "ATTACK DROP"), not a constructed sentence — assembling "raise/lower the
// foe's Attack & Defense by N stages" from independently-translated words
// isn't safe across 15 languages' word order/grammar, so this mirrors the
// real UI instead. See dex-server's `game-translations-provider.ts` for the
// data-mined source of each of these 8 keys.
const BUFF_KEY_LOOKUP: Record<'own' | 'foe', Record<'Attack' | 'Defense', Record<'raise' | 'lower', GameTranslatorKeys>>> = {
	own: {
		Attack: { raise: GameTranslatorKeys.AttackBoostSelf, lower: GameTranslatorKeys.AttackDropSelf },
		Defense: { raise: GameTranslatorKeys.DefenseBoostSelf, lower: GameTranslatorKeys.DefenseDropSelf },
	},
	foe: {
		Attack: { raise: GameTranslatorKeys.AttackBoostTarget, lower: GameTranslatorKeys.AttackDropTarget },
		Defense: { raise: GameTranslatorKeys.DefenseBoostTarget, lower: GameTranslatorKeys.DefenseDropTarget },
	},
};

export interface BuffBadge {
	label: string;
	/** Stat-stage magnitude (usually 1, occasionally 2) — render as a "×N"
	 *  suffix when >1, the same locale-agnostic convention Pokémon GO's own
	 *  strings use elsewhere (e.g. "2× Stardust"). */
	magnitude: number;
}

export interface BuffInfo {
	chancePercent: number;
	chanceLabel: string;
	badges: Array<BuffBadge>;
}

/** Whether a charged move has any stat-stage buff/debuff at all — a pure
 *  boolean check that doesn't need a `GameLanguage` (existence doesn't
 *  depend on it), for callers that only need to know whether to reserve
 *  extra layout space (see Moves.tsx's row-height calc). */
export const hasBuff = (buffs: BuffsType | undefined): boolean =>
	!!buffs && STAT_EFFECTS.some(({ key }) => !!buffs[key]);

/** PvP stat-stage buff/debuff info for a charged move, as the badges +
 *  chance the real game UI shows — `null` when the move has none. */
export const buffInfo = (buffs: BuffsType | undefined, gl: GameLanguage): BuffInfo | null => {
	if (!buffs) return null;

	const badges: Array<BuffBadge> = [];
	for (const { key, who, stat } of STAT_EFFECTS) {
		const v = buffs[key];
		if (!v) continue;
		const dir: 'raise' | 'lower' = v > 0 ? 'raise' : 'lower';
		const translatorKey = BUFF_KEY_LOOKUP[who][stat][dir];
		badges.push({ label: gameTranslator(translatorKey, gl), magnitude: Math.abs(v) });
	}
	if (badges.length === 0) return null;

	return {
		chancePercent: Math.round(buffs.buffActivationChance * 100),
		chanceLabel: gameTranslator(GameTranslatorKeys.BuffChance, gl),
		badges,
	};
};
