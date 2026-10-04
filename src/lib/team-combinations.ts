import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { TeamBuilderData, TeamLeague } from '../DTOs/ITeamBuilder';
import { canonicalSlot } from './canonical-slot';
import type { CollectionPokemon } from './pokemon-collection';
import {
	respectsStatusLimits,
	slotIdentityKey,
	speciesFamilyKey,
	standInsOf,
	type TeamSlotDescriptor,
} from './team-analysis';

/** What the team rules read of the Teams view's data (`TeamsData` satisfies it). */
export interface TeamRulesData {
	gamemaster: Readonly<
		Record<
			string,
			Pick<IGamemasterPokemon, 'isMega' | 'isSuperMega' | 'baseStats'> &
				Partial<Pick<IGamemasterPokemon, 'isShadow' | 'nonShadowSpecies' | 'baseSpecies'>>
		>
	>;
	rankList: Readonly<Record<string, unknown>>;
	builder: Pick<TeamBuilderData, 'moves' | 'ivs'> | undefined;
}

/**
 * The slots one saved Pokémon takes part in team combinations with. A team can only have one Best Buddy and one Super Max
 * Mega (and one Mega at all), but that must not keep two of them off the same team, so a Best Buddy / Super Max Mega that
 * leans on its status also gets temporary counterparts without it — without the ribbon, without the Super Max Mega status,
 * or without either — each at the level that takes (see `standInsOf`): the combinations then include both "this one is
 * the buddy" and "the other one is". A status on a Pokémon whose level doesn't need it changes nothing about it, so it
 * gets no counterpart (it would be identical): it is itself, and keeps its status, so its mark still shows.
 */
export const comboSlots = (
	entry: Pick<CollectionPokemon, 'speciesId' | 'moveset' | 'ivs' | 'level' | 'buddy' | 'superMega'>
): Array<TeamSlotDescriptor> => {
	const slot: TeamSlotDescriptor = {
		speciesId: entry.speciesId,
		moveset: entry.moveset,
		...(entry.ivs ? { ivs: entry.ivs } : {}),
		...(entry.level !== undefined ? { level: entry.level } : {}),
		...(entry.buddy ? { buddy: true as const } : {}),
		...(entry.superMega ? { superMega: true as const } : {}),
	};
	return [slot, ...standInsOf(slot)];
};

/**
 * Every team of three the saved Pokémon (with their stand-ins, see `comboSlots`) can make: no Pokémon twice (a Shadow, its
 * normal form and every Mega of it are one), one Mega and one Best Buddy at most, and only builds the league can rate (a
 * ranked species whose moves are all known).
 */
export const buildCombinations = (
	species: ReadonlyArray<TeamSlotDescriptor>,
	data: TeamRulesData
): Array<Array<TeamSlotDescriptor>> => {
	const familyOf = (id: string) => speciesFamilyKey(id, (x) => data.gamemaster[x]);
	const teams: Array<Array<TeamSlotDescriptor>> = [];
	for (let a = 0; a < species.length; a++) {
		for (let b = a + 1; b < species.length; b++) {
			const aBase = familyOf(species[a].speciesId);
			const bBase = familyOf(species[b].speciesId);
			if (aBase === bBase) continue;
			for (let c = b + 1; c < species.length; c++) {
				const cBase = familyOf(species[c].speciesId);
				if (cBase === aBase || cBase === bBase) continue;
				const trio = [species[a], species[b], species[c]];
				// A team has one Mega (so one Super Max Mega) and one Best Buddy at most.
				if (!respectsStatusLimits(trio, (id) => !!data.gamemaster[id]?.isMega)) continue;
				if (
					!trio.every(
						(slot) =>
							data.gamemaster[slot.speciesId] &&
							data.rankList[slot.speciesId] &&
							slot.moveset.every((id) => id === 'none' || data.builder?.moves[id])
					)
				)
					continue;
				teams.push(trio);
			}
		}
	}
	return teams;
};

/**
 * The pool the combinations are made from: every saved Pokémon with its stand-ins, identical builds counted once (a stand-in
 * goes first, so that when the same Pokémon was also saved by hand the stand-in is the one kept — it carries the disabled
 * mark), best-ranked species first.
 */
export const buildComboPool = (
	saved: ReadonlyArray<Pick<CollectionPokemon, 'speciesId' | 'moveset' | 'ivs' | 'level' | 'buddy' | 'superMega'>>,
	league: TeamLeague,
	data: TeamRulesData & { rankList: Readonly<Record<string, { rank?: number } | undefined>> }
): Array<TeamSlotDescriptor> =>
	saved
		.flatMap(comboSlots)
		.sort((a, b) => Number(!!(b.formerBuddy ?? b.formerSuperMega)) - Number(!!(a.formerBuddy ?? a.formerSuperMega)))
		.filter(
			(slot, i, all) =>
				all.findIndex(
					(other) =>
						slotIdentityKey(canonicalSlot(other, league, data)) === slotIdentityKey(canonicalSlot(slot, league, data))
				) === i
		)
		.sort(
			(a, b) =>
				(data.rankList[a.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER) -
				(data.rankList[b.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER)
		);
