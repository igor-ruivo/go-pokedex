import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { TeamBuilderData, TeamLeague } from '../DTOs/ITeamBuilder';
import { LEAGUE_CP } from './pvp-sim/context';
import { highestLevelWithinCap } from './pvp-sim/cp';
import { type SlotIvs, type TeamSlotDescriptor } from './team-analysis';

/**
 * A Pokémon with the picks that only restate a default left out, so the same Pokémon always reads the same: IVs equal to
 * the league's best spread are no pick, and neither is a level equal to the one the CP cap gives these IVs anyway. A Best
 * Buddy that was brought back to exactly that (a manual edit, or one that gains nothing from the ribbon) is then the very
 * same Pokémon as a plain one — compare these with `slotIdentityKey`, which ignores the ribbon itself.
 */
export const canonicalSlot = (
	slot: TeamSlotDescriptor,
	league: TeamLeague,
	data: { builder: TeamBuilderData | undefined; gamemaster: Readonly<Record<string, IGamemasterPokemon>> }
): TeamSlotDescriptor => {
	const spread = data.builder?.ivs[slot.speciesId]?.[league];
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
	};
};
