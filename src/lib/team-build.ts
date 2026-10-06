import {
	BASE_MAX_LEVEL,
	isBuddy,
	isSlotLevel,
	maxLevelOf,
	slotIdentityKey,
	type SlotIvs,
	type TeamSlotDescriptor,
} from './team-analysis';

/**
 * The rules of a team member's build — its IVs, level, Best Buddy and Super Max Mega status — as plain functions, so the
 * builder (and the collection editor) only wire them to buttons and dialogs. The website's own Best Buddy setting plays
 * no part in any of them.
 */

/** What the builder is asked to set on one member: `undefined` puts IVs / level back to their defaults. */
export interface BuildChange {
	ivs: SlotIvs | undefined;
	level: number | undefined;
	buddy?: boolean | undefined;
	superMega?: boolean | undefined;
	/** The whole moveset, when the change replaces it (Reset puts back the recommended moves). */
	moveset?: ReadonlyArray<string> | undefined;
}

export interface StatusFlags {
	buddy: boolean;
	superMega: boolean;
}

/** A spread and the level it is taken to. */
export interface SpreadAndLevel {
	ivs: SlotIvs;
	level: number;
}

/**
 * What pressing the Best Buddy or the Super Max Mega button asks for. Turning one on picks the spread that is best at the new
 * level ceiling (`target`), with its level when that is above 50; turning one off goes back to the best at the lower
 * ceiling, or to the defaults when no status is left. The other status is left as it is. `undefined`: nothing to apply
 * (the best spread isn't known yet).
 */
export const statusToggle = (
	flag: 'buddy' | 'superMega',
	nextFlags: StatusFlags,
	target: SpreadAndLevel | undefined
): BuildChange | undefined => {
	if (maxLevelOf(nextFlags) <= BASE_MAX_LEVEL) {
		return { ivs: undefined, level: undefined, ...(flag === 'buddy' ? { buddy: false } : { superMega: false }) };
	}
	if (!target) return undefined;
	return {
		ivs: target.ivs,
		level: target.level > BASE_MAX_LEVEL ? target.level : undefined,
		...(flag === 'buddy' ? { buddy: nextFlags.buddy } : { superMega: nextFlags.superMega }),
	};
};

/**
 * What typing a level asks for. A level above 50 on a Pokémon that can be a Super Max Mega is that: it takes the status
 * (and, past the 52 that gives, the Best Buddy one) — so the buttons agree with the level. On any other Pokémon a level
 * above 50 can't be typed unless it is a Best Buddy already (the dialog refuses it), so nothing is switched on for it.
 */
export const levelChange = (
	level: number | undefined,
	ivs: SlotIvs | undefined,
	pokemon: { isSuperMega: boolean },
	superNow: boolean
): BuildChange => {
	const superMegaNow = pokemon.isSuperMega && (superNow || (level ?? 0) > BASE_MAX_LEVEL);
	const needsBuddy = (level ?? 0) > maxLevelOf({ superMega: superMegaNow });
	return { ivs, level, ...(superMegaNow ? { superMega: true } : {}), ...(needsBuddy ? { buddy: true } : {}) };
};

/**
 * New IVs keep a level the player picked; a level that was never touched (no `level` on the slot) stays unset, so it follows
 * the league's CP cap and lands on the perfect level for the new IVs.
 */
export const ivsChange = (slot: Pick<TeamSlotDescriptor, 'level'>, ivs: SlotIvs | undefined): BuildChange => ({
	ivs,
	level: slot.level,
});

/**
 * What the card's Reset asks for: the Pokémon back to perfection — the IVs, the level AND the moves, all at once. With a Best
 * Buddy or a Super Max Mega the IVs are the spread that is best at its level ceiling and the level is the one that goes with it
 * (when that is above 50, otherwise the level follows the CP cap again); without either they are the league's default spread at
 * the level the CP cap gives. The statuses themselves are left as they are. The moves go back to the ranking's recommended ones
 * (when there are any). Everything comes from the same spread, so it always fits together.
 */
export const resetChange = (
	flags: StatusFlags,
	best: SpreadAndLevel | undefined,
	recommendedMoves: ReadonlyArray<string> = []
): BuildChange => ({
	...((flags.buddy || flags.superMega) && best
		? { ivs: best.ivs, level: best.level > BASE_MAX_LEVEL ? best.level : undefined }
		: { ivs: undefined, level: undefined }),
	...(recommendedMoves.length > 0 ? { moveset: recommendedMoves } : {}),
});

/** Whether a moveset is the recommended one: the same Fast Move and the same Charged Moves, in either order. */
export const movesAreRecommended = (moveset: ReadonlyArray<string>, recommended: ReadonlyArray<string>): boolean => {
	const wanted = recommended.filter((m) => m !== 'none');
	const have = moveset.filter((m) => m !== 'none');
	if (wanted.length === 0) return true;
	return (
		have[0] === wanted[0] &&
		have.length === wanted.length &&
		[...have.slice(1)].sort().join() === [...wanted.slice(1)].sort().join()
	);
};

/** The card offers Reset whenever the IVs, the level or the moves are not the best the Pokémon can have. */
export const showReset = (state: { ivsOptimal: boolean; levelOptimal: boolean; movesOptimal?: boolean }): boolean =>
	!(state.ivsOptimal && state.levelOptimal && (state.movesOptimal ?? true));

/**
 * How a member's IVs line reads: the level is stated only when it is a deliberate one (not the level the cap gives anyway),
 * and the line is flagged "custom" (blue) when the IVs were picked and are not the best, or the level is shown.
 */
export const buildHighlight = (state: {
	ivsPicked: boolean;
	ivsOptimal: boolean;
	level: number | undefined;
	levelOptimal: boolean;
}): { showLevel: boolean; custom: boolean } => {
	const showLevel = state.level !== undefined && !state.levelOptimal;
	return { showLevel, custom: (state.ivsPicked && !state.ivsOptimal) || showLevel };
};

/** A trailing "#<rank>" on a nickname — the part that follows the IVs' rank, attached to the name ("Azumarill#12"). */
export const RANK_SUFFIX = /\s*#(\d+)$/;

/** The nickname with its trailing rank brought up to date, or `undefined` when it has none / is current already. */
export const syncedNickname = (nickname: string | undefined, rank: number | undefined): string | undefined => {
	if (nickname === undefined || rank === undefined) return undefined;
	const match = RANK_SUFFIX.exec(nickname);
	return match && match[1] !== String(rank) ? nickname.replace(RANK_SUFFIX, `#${rank}`) : undefined;
};

/** The nickname a new one starts as: the Pokémon's name with the rank of its IVs attached ("Azumarill#12"). */
export const starterNickname = (name: string, rank: number | undefined): string =>
	(rank === undefined ? name : `${name}#${rank}`).slice(0, 32);

/** A move the ranking doesn't recommend for the Pokémon is shown with a warning. */
export const isUnrecommendedMove = (moveId: string, recommended: ReadonlyArray<string>): boolean =>
	!recommended.includes(moveId);

/**
 * The nickname of each saved Pokémon, by the build it names (species, moves, IVs, level — never the statuses): a team member
 * is one specific build, so with duplicates of a species each card shows the nickname of the entry it came from. The first
 * entry to name a build keeps it. `variantsOf` gives the other builds an entry takes part in teams as (its stand-ins).
 */
export const nicknamesByBuild = <
	E extends Pick<TeamSlotDescriptor, 'speciesId' | 'moveset' | 'ivs' | 'level'> & { nickname?: string | undefined },
>(
	saved: ReadonlyArray<E>,
	variantsOf: (entry: E) => ReadonlyArray<TeamSlotDescriptor> = () => []
): Record<string, string> => {
	const byBuild: Record<string, string> = {};
	for (const entry of saved) {
		if (!entry.nickname) continue;
		for (const key of [slotIdentityKey(entry), ...variantsOf(entry).map(slotIdentityKey)]) {
			if (!(key in byBuild)) byBuild[key] = entry.nickname;
		}
	}
	return byBuild;
};

export interface BuildContext {
	/** Whether the species can be a Super Max Mega. */
	isSuperMegaSpecies: (speciesId: string) => boolean;
	/** The league's best spread for a species. */
	defaultIvs: (speciesId: string) => SlotIvs | undefined;
}

/**
 * The team after one member's IVs, level and statuses are set, or `undefined` when the change is refused: a level beyond
 * what the statuses allow (50, +1 Best Buddy, +2 Super Max Mega). A build that is over the league's CP cap is NOT refused: it is
 * kept, shown with its CP in red, and simply not rated until it fits.
 * Only one Pokémon per team is a Best Buddy: making this one the buddy takes it from the current one, which goes back to the
 * defaults. A Super Max Mega is only for a species that can be one; a status left out of the change stays as it is.
 */
export const applyBuild = (
	team: ReadonlyArray<TeamSlotDescriptor>,
	index: number,
	build: BuildChange,
	context: BuildContext
): Array<TeamSlotDescriptor> | undefined => {
	const target = team[index];
	const buddy = build.buddy ?? (target ? isBuddy(target) : false);
	const takesBuddy = !!target && buddy && !isBuddy(target);
	const superMega =
		(build.superMega ?? target?.superMega ?? false) && !!target && context.isSuperMegaSpecies(target.speciesId);
	if ((build.level ?? 0) > maxLevelOf({ buddy, superMega })) return undefined;
	return team.map((slot, i) => {
		if (i !== index) {
			return takesBuddy && isBuddy(slot) ? { speciesId: slot.speciesId, moveset: slot.moveset } : slot;
		}
		const best = context.defaultIvs(slot.speciesId);
		const ivs = build.ivs && !best?.every((n, k) => n === build.ivs?.[k]) ? build.ivs : undefined;
		return {
			speciesId: slot.speciesId,
			moveset: build.moveset ? [...build.moveset] : slot.moveset,
			...(ivs ? { ivs } : {}),
			...(build.level !== undefined ? { level: build.level } : {}),
			...(buddy ? { buddy: true as const } : {}),
			...(superMega ? { superMega: true as const } : {}),
		};
	});
};

/**
 * What the level box says about what was typed. `valid`: a level the Pokémon can be at now (no invalid mark, can be applied).
 * `needsBuddy`: a level only a Best Buddy reaches (one more than `maxLevel`, up to `buddyMaxLevel`): refused with a message,
 * the Best Buddy status is not switched on for it. Anything further is simply not a level. A Super Max Mega species has
 * `maxLevel` 52 whether or not the status is on, so its levels up to there are valid and take the status (see `levelChange`).
 */
export const levelInputState = (input: {
	typed: number;
	maxLevel: number;
	buddyMaxLevel: number;
}): { valid: boolean; needsBuddy: boolean } => ({
	valid: isSlotLevel(input.typed) && input.typed <= input.maxLevel,
	needsBuddy: isSlotLevel(input.typed) && input.typed > input.maxLevel && input.typed <= input.buddyMaxLevel,
});

/**
 * Why a Pokémon can't be picked for a team slot, or `null` when it can: it is already on the team (a Shadow, its normal form
 * and every Mega of it count as it), or the team already has a Mega (one per team) and this is another.
 */
export const pickerBlock = (state: {
	inTeam: boolean;
	megaTaken: boolean;
	isMega: boolean;
}): 'inTeam' | 'megaTaken' | null => (state.inTeam ? 'inTeam' : state.megaTaken && state.isMega ? 'megaTaken' : null);
