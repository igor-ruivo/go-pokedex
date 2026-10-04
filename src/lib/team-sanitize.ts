import { BASE_MAX_LEVEL, isBuddy, maxLevelOf, speciesFamilyKey, type TeamSlotDescriptor } from './team-analysis';
import type { TeamRulesData } from './team-combinations';

/**
 * A team read from a link (hand-edited, old or shared) brought back to what the builder allows: only Pokémon the league
 * ranks and whose moves exist; no Pokémon twice (a Shadow, its normal form and every Mega of it are one: the first stays);
 * one Mega at most (a second goes); one Best Buddy at most (later ones are plain Pokémon again, their level above 50 goes);
 * a Super Max Mega only for a species that can be one; a level that could be either of the two statuses (50 to 52 on a species
 * that can be a Super Max Mega, neither written) is not guessed at; and a level only up to what its flags allow (50, +1 Best
 * Buddy, +2 Super Max Mega) — otherwise the level follows the cap again. A level over the CP cap is kept: the builder shows it
 * in red.
 */
export const sanitizeTeam = (
	slots: ReadonlyArray<TeamSlotDescriptor>,
	data: TeamRulesData
): Array<TeamSlotDescriptor> => {
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
			const keepLevel = slot.level !== undefined && slot.level <= maxLevelOf({ buddy, superMega });
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
