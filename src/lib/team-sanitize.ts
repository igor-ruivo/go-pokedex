import { bestIvsFor } from './league-caps';
import { cpAt } from './pvp-sim/cp';
import {
	BASE_MAX_LEVEL,
	isBuddy,
	maxLevelOf,
	type SlotIvs,
	speciesFamilyKey,
	type TeamSlotDescriptor,
} from './team-analysis';
import type { TeamRulesData } from './team-combinations';

/**
 * A team read from a link (hand-edited, old or shared) brought back to what the builder allows: only Pokémon the league
 * ranks and whose moves exist; no Pokémon twice (a Shadow, its normal form and every Mega of it are one: the first stays);
 * one Mega at most (a second goes); one Best Buddy at most (later ones are plain Pokémon again, their level above 50 goes);
 * a Super Max Mega only for a species that can be one; a level that could be either of the two statuses (50 to 52 on a species
 * that can be a Super Max Mega, neither written) is not guessed at; and a level only if it fits the CP cap with the Pokémon's IVs and
 * what its flags allow (50, +1 Best Buddy, +2 Super Max Mega) — otherwise the level follows the cap again.
 */
export const sanitizeTeam = (
	slots: ReadonlyArray<TeamSlotDescriptor>,
	data: TeamRulesData,
	cpCap: number
): Array<TeamSlotDescriptor> => {
	const withinCap = (slot: TeamSlotDescriptor) => {
		if (slot.level === undefined) return true;
		const spread = bestIvsFor(data.builder, slot.speciesId, cpCap);
		const ivs = slot.ivs ?? (spread ? ([spread[1], spread[2], spread[3]] as SlotIvs) : undefined);
		const base = data.gamemaster[slot.speciesId]?.baseStats;
		return !ivs || !base || cpAt(base, ivs, slot.level) <= cpCap;
	};
	const bases = new Set<string>();
	let megaTaken = false;
	let buddyTaken = false;
	return slots
		.filter((slot) => {
			if (
				!data.rankList[slot.speciesId] ||
				!data.gamemaster[slot.speciesId] ||
				!slot.moveset.every((m) => m === 'none' || data.builder?.moves[m])
			)
				return false;
			const base = speciesFamilyKey(slot.speciesId, (x) => data.gamemaster[x]);
			if (bases.has(base)) return false;
			const mega = !!data.gamemaster[slot.speciesId]?.isMega;
			if (mega && megaTaken) return false;
			if (mega) megaTaken = true;
			bases.add(base);
			return true;
		})
		.map((given) => {
			// A level between 50 and 52 on a species that can be a Super Max Mega, with neither status written, could be the Super
			// Max Mega status or a Best Buddy (a link from before the statuses had markers): not guessed — the level goes.
			const ambiguous =
				!!data.gamemaster[given.speciesId]?.isSuperMega &&
				!given.buddy &&
				!given.superMega &&
				(given.level ?? 0) > BASE_MAX_LEVEL &&
				(given.level ?? 0) <= maxLevelOf({ superMega: true });
			const slot = ambiguous ? { ...given, level: undefined } : given;
			const buddy = isBuddy(slot) && !buddyTaken;
			if (buddy) buddyTaken = true;
			const superMega = slot.superMega === true && !!data.gamemaster[slot.speciesId]?.isSuperMega;
			const keepLevel = slot.level !== undefined && withinCap(slot) && slot.level <= maxLevelOf({ buddy, superMega });
			return {
				speciesId: slot.speciesId,
				moveset: slot.moveset,
				...(slot.ivs ? { ivs: slot.ivs } : {}),
				...(keepLevel ? { level: slot.level } : {}),
				...(buddy ? { buddy: true as const } : {}),
				...(superMega ? { superMega: true as const } : {}),
			};
		});
};
