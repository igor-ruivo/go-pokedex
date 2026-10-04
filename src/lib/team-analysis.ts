import type { TeamLeague } from '../DTOs/ITeamBuilder';
import { computeMoveEffectiveness } from '../utils/pokemon-helper';
import { LEAGUE_CP } from './league-caps';
import type { RoleScores } from './team-roles';
import { TYPE_KEYS } from './types';

/* ---------------------------------------------------------------------------
 * Pure, synchronous team analysis — everything about a team that doesn't need
 * a battle simulation: typing, move coverage, role ordering, grades, warnings
 * and the composite Team Score. (The simulated parts — threat score, meta
 * coverage, alternatives — come from `lib/pvp-sim` and are folded in here.)
 * ------------------------------------------------------------------------- */

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** PvPoke's grade scale: the share of a goal a value reaches — 90%+ A, 80%+ B, 70%+ C, 60%+ D. */
export const letterGrade = (value: number, goal: number): LetterGrade => {
	const pct = value / goal;
	if (pct >= 0.9) return 'A';
	if (pct >= 0.8) return 'B';
	if (pct >= 0.7) return 'C';
	if (pct >= 0.6) return 'D';
	return 'F';
};

/**
 * A number that grows with the CP cap, known at Great (1500), Ultra (2500) and Master (uncapped, 10000): exact at those,
 * and read off the line between them for any other cap a cup uses — below Great scaled from zero (so a Little Cup's
 * 500 gets a third of Great's).
 */
const byCap = (cap: number, great: number, ultra: number, master: number): number =>
	cap <= 1500
		? (great * cap) / 1500
		: cap <= 2500
			? great + ((ultra - great) * (cap - 1500)) / 1000
			: ultra + (master - ultra) * Math.min(1, (cap - 2500) / 7500);
const capOf = (league: TeamLeague): number => LEAGUE_CP[league] ?? 10000;

/** PvPoke's per-league goal for average team bulk (Defense × HP). */
export const bulkGoal = (league: TeamLeague): number => byCap(capOf(league), 22000, 35000, 35000);
/** PvPoke's goal for safety (average switch score) and consistency. */
export const SAFETY_GOAL = 98;
export const CONSISTENCY_GOAL = 98;
/** Threat score is graded as `(1200 − score) / 680` — see PvPoke's Team Builder. */
export const threatCoverage = (threatScore: number): number => (1200 - threatScore) / 680;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * What each part of the Team Score is measured against: a value at (or beyond) its floor scores 0, one at (or beyond)
 * its ceiling scores 100, and everything between is stretched linearly — so a part can never leave 0–100, however bad
 * or good a team turns out to be. The Team Score is simply the weighted average of these parts (the radar's six values).
 *
 * The anchors are fixed numbers, not derived from the teams we happen to rate. They were placed from rating a few hundred
 * thousand teams (`scripts/team-ranking/calibrate.mts`): the floors sit where teams put together at random from the
 * ranked Pokémon fall, so such a team scores about 50 and the weakest ones in the 10s and 20s; the ceilings sit at what
 * the league's best teams reach, so those score 98 and above and the best 100 still 94 or more.
 */
export const SCORE_ANCHORS = {
	/** PvPoke's threat score: 560 is what the best teams reach, 800 a hopeless team (lower is better). */
	threat: { best: 560, worst: 800 },
	/** The typing parts are already 0–100 from their own formulas; real teams use only the upper part of that range. */
	defense: { floor: 55, ceiling: 85 },
	offense: { floor: 70, ceiling: 94 },
	/** Average Defense × HP of the three, at the three permanent leagues (the stat grows with the CP cap; see `bulkAnchors`). */
	bulk: {
		great: { floor: 12000, ceiling: 20500 },
		ultra: { floor: 19000, ceiling: 36000 },
		master: { floor: 26000, ceiling: 45500 },
	},
	/** Average PvPoke "switch" score of the three. */
	safety: { floor: 40, ceiling: 80 },
	/** Average PvPoke moveset consistency of the three. */
	consistency: { floor: 80, ceiling: 93 },
};

/** `value` placed between `floor` (0) and `ceiling` (100), clamped to that range. */
export const stretch = (value: number, floor: number, ceiling: number): number =>
	clamp((value - floor) / (ceiling - floor)) * 100;

/* ------------------------------ Typing ------------------------------------ */

/** Multiplier of an attacking type against a (one- or two-type) defender, in Pokémon GO's scale. */
const effectiveness = (attack: string, defender: ReadonlyArray<string>): number => {
	const [first, second] = defender.map((t) => t.toLowerCase()).filter((t) => t !== 'none');
	return computeMoveEffectiveness(attack, first, second);
};

/** Below this an attack counts as resisted; above 1.1 as super effective (dual types stack, so ranges, not equality). */
const RESISTED = 0.9;
const WEAK = 1.1;

export type DefenseStatus = 'critical' | 'shared' | 'exposed' | 'covered' | 'wall';

export interface DefenseRow {
	type: string;
	/** Each member's multiplier when hit by this type. */
	mults: Array<number>;
	weakMembers: Array<number>;
	resistMembers: Array<number>;
	status: DefenseStatus;
}

export interface DefenseProfile {
	rows: Array<DefenseRow>;
	/** How many of the 18 types at least one member resists. */
	resistedTypes: number;
	/** Types two or more members are weak to and nobody resists — the team folds to these. */
	critical: Array<string>;
	/** Types two or more members are weak to (a superset of `critical`). */
	shared: Array<string>;
	/** Types someone is weak to and nobody resists. */
	exposed: Array<string>;
	/** 0–100. */
	score: number;
}

export const defenseProfile = (memberTypes: ReadonlyArray<ReadonlyArray<string>>): DefenseProfile => {
	const rows: Array<DefenseRow> = TYPE_KEYS.map((type) => {
		const mults = memberTypes.map((types) => effectiveness(type, types));
		const weakMembers = mults.flatMap((m, i) => (m > WEAK ? [i] : []));
		const resistMembers = mults.flatMap((m, i) => (m < RESISTED ? [i] : []));

		let status: DefenseStatus = 'covered';
		if (weakMembers.length >= 2 && resistMembers.length === 0) status = 'critical';
		else if (weakMembers.length >= 2) status = 'shared';
		else if (weakMembers.length === 1 && resistMembers.length === 0) status = 'exposed';
		else if (resistMembers.length >= 2) status = 'wall';

		return { type, mults, weakMembers, resistMembers, status };
	});

	// A type is "handled" when someone can absorb it; every extra member weak to it makes it worse.
	const value = (row: DefenseRow) =>
		clamp((row.resistMembers.length > 0 ? 1 : 0.5) - 0.35 * Math.max(0, row.weakMembers.length - 1));

	return {
		rows,
		resistedTypes: rows.filter((r) => r.resistMembers.length > 0).length,
		critical: rows.filter((r) => r.status === 'critical').map((r) => r.type),
		shared: rows.filter((r) => r.weakMembers.length >= 2).map((r) => r.type),
		exposed: rows.filter((r) => r.weakMembers.length >= 1 && r.resistMembers.length === 0).map((r) => r.type),
		score: memberTypes.length
			? stretch(
					(rows.reduce((sum, r) => sum + value(r), 0) / rows.length) * 100,
					SCORE_ANCHORS.defense.floor,
					SCORE_ANCHORS.defense.ceiling
				)
			: 0,
	};
};

export type OffenseStatus = 'strong' | 'neutral' | 'resisted';

export interface OffenseRow {
	/** The defending type. */
	type: string;
	/** Best multiplier each member's moves reach against this type. */
	perMember: Array<number>;
	best: number;
	status: OffenseStatus;
}

export interface OffenseProfile {
	rows: Array<OffenseRow>;
	/** Types at least one move hits super effectively. */
	superEffectiveTypes: number;
	/** Types nothing on the team hits for even neutral damage. */
	blindSpots: Array<string>;
	/** 0–100. */
	score: number;
}

/**
 * `memberMoveTypes[i]` is the attack types member `i` can use (fast move
 * included) — coverage is about what a member can hit, whichever move it is.
 */
export const offenseProfile = (memberMoveTypes: ReadonlyArray<ReadonlyArray<string>>): OffenseProfile => {
	const rows: Array<OffenseRow> = TYPE_KEYS.map((type) => {
		const perMember = memberMoveTypes.map((types) =>
			types.length ? Math.max(...types.map((t) => effectiveness(t, [type]))) : 0
		);
		const best = perMember.length ? Math.max(...perMember) : 0;
		const status: OffenseStatus = best > WEAK ? 'strong' : best >= 1 ? 'neutral' : 'resisted';
		return { type, perMember, best, status };
	});

	const value = (row: OffenseRow) => (row.status === 'strong' ? 1 : row.status === 'neutral' ? 0.6 : 0.15);

	return {
		rows,
		superEffectiveTypes: rows.filter((r) => r.status === 'strong').length,
		blindSpots: rows.filter((r) => r.status === 'resisted').map((r) => r.type),
		score: memberMoveTypes.length
			? stretch(
					(rows.reduce((sum, r) => sum + value(r), 0) / rows.length) * 100,
					SCORE_ANCHORS.offense.floor,
					SCORE_ANCHORS.offense.ceiling
				)
			: 0,
	};
};

/** Types (of Pokémon or of their moves) that more than one member shares. */
export const sharedTypes = (
	perMember: ReadonlyArray<ReadonlyArray<string>>
): Array<{ type: string; members: Array<number> }> => {
	const byType = new Map<string, Array<number>>();
	perMember.forEach((types, i) => {
		for (const type of new Set(types.map((t) => t.toLowerCase()).filter((t) => t !== 'none'))) {
			byType.set(type, [...(byType.get(type) ?? []), i]);
		}
	});
	return [...byType.entries()]
		.filter(([, members]) => members.length > 1)
		.map(([type, members]) => ({ type, members }));
};

/* ------------------------------ Roles ------------------------------------- */

export { assignRoles, type RoleAssignment, type RoleScores, TEAM_ROLES, type TeamRole } from './team-roles';

/* ------------------------------ Score ------------------------------------- */

export interface ScoreParts {
	/** From the simulated threat score; undefined while it is still being computed. */
	threat: number | undefined;
	defense: number;
	offense: number;
	bulk: number;
	safety: number;
	consistency: number;
}

/** How much each part counts toward the Team Score. Sums to 1. */
export const SCORE_WEIGHTS: Record<keyof ScoreParts, number> = {
	threat: 0.3,
	defense: 0.15,
	offense: 0.1,
	bulk: 0.15,
	safety: 0.15,
	consistency: 0.15,
};

export const PART_KEYS = Object.keys(SCORE_WEIGHTS) as Array<keyof ScoreParts>;

/**
 * The measured parts (threat, bulk, safety, consistency) as 0–100 against SCORE_ANCHORS. Parts are kept unrounded —
 * the Team Score is computed from them as they are; only the display rounds (to one decimal). (The letter grades keep
 * PvPoke's own goals above; they are a separate reading of the same numbers.)
 */
export const threatPart = (threatScore: number): number =>
	stretch(threatScore, SCORE_ANCHORS.threat.worst, SCORE_ANCHORS.threat.best);
/** The bulk anchors of any league, from the three permanent ones by CP cap. */
const bulkAnchors = (league: TeamLeague): { floor: number; ceiling: number } => {
	const { great, ultra, master } = SCORE_ANCHORS.bulk;
	const cap = capOf(league);
	return {
		floor: byCap(cap, great.floor, ultra.floor, master.floor),
		ceiling: byCap(cap, great.ceiling, ultra.ceiling, master.ceiling),
	};
};
export const bulkPart = (league: TeamLeague, averageBulk: number): number => {
	const { floor, ceiling } = bulkAnchors(league);
	return stretch(averageBulk, floor, ceiling);
};
export const safetyPart = (averageSafety: number): number =>
	stretch(averageSafety, SCORE_ANCHORS.safety.floor, SCORE_ANCHORS.safety.ceiling);
export const consistencyPart = (averageConsistency: number): number =>
	stretch(averageConsistency, SCORE_ANCHORS.consistency.floor, SCORE_ANCHORS.consistency.ceiling);

/** Weighted 0–100 Team Score, or undefined until every part (the simulated threat score included) is known. */
export const teamScore = (parts: ScoreParts): number | undefined => {
	if (parts.threat === undefined) return undefined;
	return PART_KEYS.reduce((sum, key) => sum + SCORE_WEIGHTS[key] * (parts[key] ?? 0), 0);
};

export type ScoreTier = 'elite' | 'strong' | 'solid' | 'shaky' | 'risky';

/**
 * A team put together at random from the ranked Pokémon scores about 50, one of the league's best-ranked Pokémon
 * about 75–80, and the published best teams 95 and up (see `scripts/team-ranking/calibrate.mts`).
 */
export const scoreTier = (score: number): ScoreTier =>
	score >= 95 ? 'elite' : score >= 85 ? 'strong' : score >= 65 ? 'solid' : score >= 40 ? 'shaky' : 'risky';

/* ----------------------------- Warnings ----------------------------------- */

export type TeamWarning =
	| { kind: 'duplicateSpecies'; members: Array<number> }
	| { kind: 'criticalWeakness'; type: string; members: Array<number> }
	| { kind: 'sharedWeakness'; type: string; members: Array<number> }
	| { kind: 'sharedTyping'; type: string; members: Array<number> }
	| { kind: 'blindSpot'; types: Array<string> }
	| { kind: 'fragile'; member: number }
	| { kind: 'baitDependent'; member: number }
	| { kind: 'noLead' }
	| { kind: 'noSafeSwitch' };

export interface WarningInput {
	speciesIds: ReadonlyArray<string>;
	/** Maps a speciesId to the species it counts as for "the same Pokémon twice" (see `speciesFamilyKey`). */
	familyOf: (speciesId: string) => string;
	memberTypes: ReadonlyArray<ReadonlyArray<string>>;
	defense: DefenseProfile;
	offense: OffenseProfile;
	bulks: ReadonlyArray<number>;
	consistencies: ReadonlyArray<number>;
	roleScores: ReadonlyArray<RoleScores | undefined>;
	league: TeamLeague;
}

/**
 * The species a Pokémon counts as for a team, which can't field one twice: a Shadow is its normal form, and a Mega /
 * Primal form is the species it evolves from (so two Megas of one species, or a Mega and its base, are one Pokémon).
 * Read from the game master's relations, never from the id's spelling.
 */
export const speciesFamilyKey = (
	speciesId: string,
	infoOf: (
		speciesId: string
	) =>
		| { nonShadowSpecies?: string | undefined; baseSpecies?: string | undefined; isShadow?: boolean | undefined }
		| undefined
): string => {
	const info = infoOf(speciesId);
	// A Shadow without its relation recorded (a trimmed-down species list) is still its normal form under the id's suffix.
	const normal = info?.nonShadowSpecies ?? (info?.isShadow ? speciesId.replace(/_shadow$/, '') : speciesId);
	return infoOf(normal)?.baseSpecies ?? normal;
};

/** Ordered most-serious first. */
export const teamWarnings = (input: WarningInput): Array<TeamWarning> => {
	const out: Array<TeamWarning> = [];
	const base = input.familyOf;

	// The same species twice (Shadow, normal and every Mega of it count as the same one)
	const seen = new Map<string, Array<number>>();
	input.speciesIds.forEach((id, i) => seen.set(base(id), [...(seen.get(base(id)) ?? []), i]));
	for (const members of seen.values()) if (members.length > 1) out.push({ kind: 'duplicateSpecies', members });

	for (const row of input.defense.rows) {
		if (row.status === 'critical') out.push({ kind: 'criticalWeakness', type: row.type, members: row.weakMembers });
	}
	for (const row of input.defense.rows) {
		if (row.weakMembers.length >= 2 && row.status !== 'critical') {
			out.push({ kind: 'sharedWeakness', type: row.type, members: row.weakMembers });
		}
	}

	if (input.offense.blindSpots.length > 0) out.push({ kind: 'blindSpot', types: input.offense.blindSpots });

	const goal = bulkGoal(input.league);
	input.bulks.forEach((bulk, member) => {
		if (bulk / goal < 0.75) out.push({ kind: 'fragile', member });
	});
	input.consistencies.forEach((c, member) => {
		if (c < 75) out.push({ kind: 'baitDependent', member });
	});

	// Sharing a type only matters when it stacks a weakness: some attack the shared type is weak to still hits at
	// least two of the members that share it super effectively. The rest of their typing may cancel it (Normal/Flying
	// is not weak to Fighting), in which case there is nothing to warn about.
	for (const { type, members } of sharedTypes(input.memberTypes)) {
		const stacks = input.defense.rows.some(
			(row) =>
				effectiveness(row.type, [type]) > WEAK && members.filter((member) => row.mults[member] > WEAK).length >= 2
		);
		if (stacks) out.push({ kind: 'sharedTyping', type, members });
	}

	const defined = input.roleScores.filter((s): s is RoleScores => !!s);
	if (defined.length === 3) {
		if (Math.max(...defined.map((s) => s.lead)) < 75) out.push({ kind: 'noLead' });
		if (Math.max(...defined.map((s) => s.switch)) < 75) out.push({ kind: 'noSafeSwitch' });
	}

	return out;
};

/* ------------------------------ Sharing ----------------------------------- */

/** `[attack, defense, HP]` IVs, each 0–15. */
export type SlotIvs = [number, number, number];

/** A Pokémon fields a Fast Move and up to three Charged Moves (the Mega Pokémon of a Mega cup have three; the others two). */
export const MAX_MOVES = 4;

/**
 * `moveset` with the move at `moveIndex` set to `moveId`. The same Charged Move can't be fielded twice: picking one another
 * Charged slot already holds drops that slot (a `none` can repeat).
 */
export const withMove = (moveset: ReadonlyArray<string>, moveIndex: number, moveId: string): Array<string> => {
	const next = [...moveset];
	next[moveIndex] = moveId;
	if (moveIndex > 0 && moveId !== 'none') {
		for (let other = next.length - 1; other > 0; other--) {
			if (other !== moveIndex && next[other] === moveId) {
				next.splice(other, 1);
				if (other < moveIndex) moveIndex--;
			}
		}
	}
	return next;
};

export interface TeamSlotDescriptor {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` */
	moveset: ReadonlyArray<string>;
	/** IVs picked for this Pokémon. Absent: the league's best (rank-1) spread, which is what a fresh pick gets. */
	ivs?: SlotIvs | undefined;
	/** Level picked for this Pokémon (1 to 50, in steps of 0.5; up to 51 for a Best Buddy). Absent: the highest the league's CP cap allows. */
	level?: number | undefined;
	/** A Best Buddy: its level ceiling is 51, and a level above 50 may be picked. Only one Pokémon per team can be. */
	buddy?: true | undefined;
	/** Only on the stand-in a Best Buddy gets in the team combinations (see `nonBuddyCounterpart`): it had the ribbon. */
	formerBuddy?: true | undefined;
	/** Same for the stand-in a Super Max Mega gets: it had the status (see `standInsOf`). */
	formerSuperMega?: true | undefined;
	/** A Super Max Mega: a Mega at Super Max level, which gives it two more levels (see `SUPER_MEGA_BONUS`). */
	superMega?: true | undefined;
}

/** Highest level without help: 50. A Best Buddy reaches one more, a Super Max Mega two more. */
export const BASE_MAX_LEVEL = 50;
export const BUDDY_BONUS = 1;
export const SUPER_MEGA_BONUS = 2;

/** The highest level a Pokémon can be at: 50, plus 1 as a Best Buddy, plus 2 as a Super Max Mega (53 with both). */
export const maxLevelOf = (flags: { buddy?: boolean | undefined; superMega?: boolean | undefined }): number =>
	BASE_MAX_LEVEL + (flags.buddy ? BUDDY_BONUS : 0) + (flags.superMega ? SUPER_MEGA_BONUS : 0);

/**
 * The stand-ins a Pokémon takes part in team combinations as, besides itself: the same Pokémon (same IVs, same moves)
 * without its Best Buddy ribbon (one full level lower), without its Super Max Mega status (two levels lower), or without
 * both (three lower) — what happens to it when a status is removed. Its IVs were picked for a higher level, but still fit
 * the CP cap lower down. A status the Pokémon doesn't lean on (its level is within what the remaining statuses reach anyway)
 * changes nothing about it, so removing it makes no stand-in: it would be identical. `formerBuddy` / `formerSuperMega`
 * mark what a stand-in lost (it is shown with a disabled crown / symbol); they are not part of its identity.
 */
export const standInsOf = (slot: TeamSlotDescriptor): Array<TeamSlotDescriptor> => {
	const hadBuddy = isBuddy(slot);
	const hadSuper = slot.superMega === true;
	const level = slot.level ?? 0;
	const out: Array<TeamSlotDescriptor> = [];
	for (const buddy of hadBuddy ? [true, false] : [false]) {
		for (const superMega of hadSuper ? [true, false] : [false]) {
			if (buddy === hadBuddy && superMega === hadSuper) continue;
			if (level <= maxLevelOf({ buddy, superMega })) continue;
			const lower = (hadBuddy && !buddy ? BUDDY_BONUS : 0) + (hadSuper && !superMega ? SUPER_MEGA_BONUS : 0);
			out.push({
				speciesId: slot.speciesId,
				moveset: slot.moveset,
				...(slot.ivs ? { ivs: slot.ivs } : {}),
				level: Math.max(1, level - lower),
				...(buddy ? { buddy: true as const } : {}),
				...(superMega ? { superMega: true as const } : {}),
				...(hadBuddy && !buddy ? { formerBuddy: true as const } : {}),
				...(hadSuper && !superMega ? { formerSuperMega: true as const } : {}),
			});
		}
	}
	return out;
};

/**
 * Whether a team respects the one-per-team limits: a single Mega and a single Best Buddy. (A Super Max Mega is a Mega, so
 * the Mega limit already keeps a team to one.)
 */
export const respectsStatusLimits = (
	team: ReadonlyArray<TeamSlotDescriptor>,
	isMegaSpecies: (speciesId: string) => boolean
): boolean =>
	team.filter((slot) => isMegaSpecies(slot.speciesId)).length <= 1 && team.filter(exceedsNormalLevel).length <= 1;

/**
 * A level beyond what the Pokémon reaches without being a Best Buddy: above 50, or above 52 for a Super Max Mega (whose two
 * extra levels are its own). Only a Best Buddy can be there.
 */
export const exceedsNormalLevel = (slot: Pick<TeamSlotDescriptor, 'level' | 'superMega'>): boolean =>
	(slot.level ?? 0) > maxLevelOf({ superMega: slot.superMega === true });

/** A Best Buddy: flagged as one (a level beyond the normal maximum implies it, for data saved before the flag existed). */
export const isBuddy = (slot: Pick<TeamSlotDescriptor, 'buddy' | 'level' | 'superMega'>): boolean =>
	slot.buddy === true || exceedsNormalLevel(slot);

/** Levels go up to 53 (50, plus a Best Buddy's 1, plus a Super Max Mega's 2), in steps of 0.5. */
export const isSlotLevel = (value: unknown): value is number =>
	typeof value === 'number' && value >= 1 && value <= 53 && Number.isInteger(value * 2);

export const isSlotIvs = (value: unknown): value is SlotIvs =>
	Array.isArray(value) && value.length === 3 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 15);

/**
 * One Pokémon of a team as text: `azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH`, plus `@0.15.15` when its IVs were picked and
 * `@L25.5` when its level was, `@B` for a Best Buddy, `@S` for a Super Max Mega (species and move ids never contain a dash, an `@` or a dot). The same Pokémon with
 * other moves, IVs or level is another key.
 */
export const slotKey = (
	slot: Pick<TeamSlotDescriptor, 'speciesId' | 'moveset' | 'ivs' | 'level' | 'buddy' | 'superMega'>
): string =>
	[slot.speciesId, ...slot.moveset].join('-') +
	(slot.ivs ? `@${slot.ivs.join('.')}` : '') +
	(slot.level !== undefined ? `@L${slot.level}` : '') +
	(slot.buddy ? '@B' : '') +
	(slot.superMega ? '@S' : '');

/**
 * What identifies a team for rating it: like `encodeTeam`, but without the Best Buddy flag. The flag only matters through
 * the IVs and the level it sets (which are in the key), so flipping it on its own must not look like a different team —
 * and so must not re-run its battles.
 */
export const evaluationKey = (team: ReadonlyArray<TeamSlotDescriptor>): string => team.map(slotIdentityKey).join(',');

/**
 * What makes a Pokémon the same one: `slotKey` without the Best Buddy flag. The flag only matters through the IVs and the
 * level it sets, which are in the key — so a Best Buddy turned on or off on its own is still the same Pokémon (and the same
 * team, the same favorite, the same saved entry…). `slotKey` itself keeps the flag, so it survives in a link.
 */
export const slotIdentityKey = (slot: Pick<TeamSlotDescriptor, 'speciesId' | 'moveset' | 'ivs' | 'level'>): string =>
	slotKey({ speciesId: slot.speciesId, moveset: slot.moveset, ivs: slot.ivs, level: slot.level });

/** `azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH@0.15.15,medicham-COUNTER-…` — see `slotKey`. */
export const encodeTeam = (team: ReadonlyArray<TeamSlotDescriptor>): string => team.map(slotKey).join(',');

export const decodeTeam = (raw: string | null | undefined): Array<TeamSlotDescriptor> =>
	(raw ?? '')
		.split(',')
		.map((part) => {
			const [moves = '', ...modifiers] = part.split('@');
			let ivs: SlotIvs | undefined;
			let level: number | undefined;
			let buddy = false;
			let superMega = false;
			for (const modifier of modifiers) {
				if (modifier === 'B') {
					buddy = true;
				} else if (modifier === 'S') {
					superMega = true;
				} else if (modifier.startsWith('L')) {
					const n = Number(modifier.slice(1));
					if (isSlotLevel(n)) level = n;
				} else {
					const picked = modifier.split('.').map(Number);
					if (isSlotIvs(picked)) ivs = picked;
				}
			}
			return { parts: moves.split('-').filter(Boolean), ivs, level, buddy, superMega };
		})
		.filter(({ parts }) => parts.length >= 3)
		.slice(0, 3)
		.map(({ parts: [speciesId, ...moveset], ivs, level, buddy, superMega }) => ({
			speciesId,
			moveset: moveset.slice(0, MAX_MOVES),
			...(ivs ? { ivs } : {}),
			...(level !== undefined ? { level } : {}),
			...(buddy ? { buddy: true as const } : {}),
			...(superMega ? { superMega: true as const } : {}),
		}));
