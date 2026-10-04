import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { TeamBuilderData, TeamLeague } from '../DTOs/ITeamBuilder';
import { bestIvsFor, LEAGUE_CP } from './league-caps';
import { highestLevelWithinCap } from './pvp-sim/cp';
import { slotIdentityKey, type SlotIvs, type TeamSlotDescriptor } from './team-analysis';

/** What the canonical form reads: the league's best spreads and the species' base stats. */
export interface CanonicalData {
	builder: Pick<TeamBuilderData, 'ivs'> | undefined;
	gamemaster: Readonly<Record<string, Pick<IGamemasterPokemon, 'baseStats'>>>;
}

/**
 * A Pokémon with the picks that only restate a default left out, so the same Pokémon always reads the same: IVs equal to
 * the league's best spread are no pick, and neither is a level equal to the one the CP cap gives these IVs anyway. A Best
 * Buddy that was brought back to exactly that (a manual edit, or one that gains nothing from the ribbon) is then the very
 * same Pokémon as a plain one — compare these with `slotIdentityKey`, which ignores the ribbon itself.
 */
export const canonicalSlot = (
	slot: TeamSlotDescriptor,
	league: TeamLeague,
	data: CanonicalData
): TeamSlotDescriptor => {
	const spread = bestIvsFor(data.builder, slot.speciesId, LEAGUE_CP[league]);
	const defaultIvs: SlotIvs | undefined = spread ? [spread[1], spread[2], spread[3]] : undefined;
	const ivs = slot.ivs && !defaultIvs?.every((value, i) => value === slot.ivs?.[i]) ? slot.ivs : undefined;
	const effectiveIvs = ivs ?? defaultIvs;
	const base = data.gamemaster[slot.speciesId]?.baseStats;
	const followsCap =
		slot.level !== undefined &&
		!!effectiveIvs &&
		!!base &&
		slot.level === highestLevelWithinCap(base, effectiveIvs, LEAGUE_CP[league]);
	return {
		speciesId: slot.speciesId,
		moveset: slot.moveset,
		...(ivs ? { ivs } : {}),
		...(slot.level !== undefined && !followsCap ? { level: slot.level } : {}),
		...(slot.buddy ? { buddy: true as const } : {}),
		...(slot.superMega ? { superMega: true as const } : {}),
	};
};

/**
 * Whether `slot` is an exact replica (species, moves, IVs, level — the Best Buddy and Super Max Mega statuses only count
 * through the level they allow, which is already in the build) of another saved Pokémon of the league, once the picks that
 * only restate a default are left out. `ownId` is the saved entry being edited, which is not a replica of itself.
 */
export const isDuplicateBuild = (
	slot: TeamSlotDescriptor,
	saved: ReadonlyArray<TeamSlotDescriptor & { id: string }>,
	ownId: string | undefined,
	league: TeamLeague,
	data: CanonicalData
): boolean => {
	const key = slotIdentityKey(canonicalSlot(slot, league, data));
	return saved.some((entry) => entry.id !== ownId && slotIdentityKey(canonicalSlot(entry, league, data)) === key);
};
