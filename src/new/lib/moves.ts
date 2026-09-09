import type { BuffsType, IGameMasterMove } from '../../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';

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

const STAT_EFFECTS: Array<{ key: string; who: 'own' | 'foe'; stat: 'Attack' | 'Defense' }> = [
	{ key: 'attackerAttackStatStageChange', who: 'own', stat: 'Attack' },
	{ key: 'attackerDefenseStatStageChange', who: 'own', stat: 'Defense' },
	{ key: 'targetAttackStatStageChange', who: 'foe', stat: 'Attack' },
	{ key: 'targetDefenseStatStageChange', who: 'foe', stat: 'Defense' },
];

const WHO_LABEL: Record<'own' | 'foe', string> = { own: 'its own', foe: "the foe's" };

/**
 * Human-readable PvP stat-stage effect for a charged move, e.g.
 *   "100% chance to lower the foe's Defense by 1 stage"
 *   "10% chance to raise its own Attack & Defense by 1 stage"
 * Returns null when the move has no stat-stage buff/debuff.
 */
export const buffText = (buffs: BuffsType | undefined): string | null => {
	if (!buffs) return null;
	const chance = Math.round(buffs.buffActivationChance * 100);

	// group effects sharing target + direction + magnitude so "Attack & Defense" collapses
	const groups = new Map<string, { who: 'own' | 'foe'; dir: 'raise' | 'lower'; mag: number; stats: Array<string> }>();
	for (const { key, who, stat } of STAT_EFFECTS) {
		const v = buffs[key];
		if (!v) continue;
		const dir: 'raise' | 'lower' = v > 0 ? 'raise' : 'lower';
		const mag = Math.abs(v);
		const gk = `${who}|${dir}|${mag}`;
		const g = groups.get(gk) ?? { who, dir, mag, stats: [] };
		g.stats.push(stat);
		groups.set(gk, g);
	}
	if (groups.size === 0) return null;

	const clauses = [...groups.values()].map(
		(g) => `${g.dir} ${WHO_LABEL[g.who]} ${g.stats.join(' & ')} by ${g.mag} stage${g.mag === 1 ? '' : 's'}`
	);
	const joined =
		clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
	return `${chance}% chance to ${joined}`;
};
