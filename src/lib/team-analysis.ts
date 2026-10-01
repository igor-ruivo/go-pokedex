import type { TeamLeague } from '../DTOs/ITeamBuilder';
import { computeMoveEffectiveness } from '../utils/pokemon-helper';
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

/** PvPoke's per-league goal for average team bulk (Defense × HP). */
export const BULK_GOAL: Record<TeamLeague, number> = { great: 22000, ultra: 35000, master: 35000 };
/** PvPoke's goal for safety (average switch score) and consistency. */
export const SAFETY_GOAL = 98;
export const CONSISTENCY_GOAL = 98;
/** Threat score is graded as `(1200 − score) / 680` — see PvPoke's Team Builder. */
export const threatCoverage = (threatScore: number): number => (1200 - threatScore) / 680;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

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
		score: memberTypes.length ? (rows.reduce((sum, r) => sum + value(r), 0) / rows.length) * 100 : 0,
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
		score: memberMoveTypes.length ? (rows.reduce((sum, r) => sum + value(r), 0) / rows.length) * 100 : 0,
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
 * Goal-relative parts (bulk, safety, consistency, threat) as 0–100: reaching the goal is 100. Parts are kept
 * unrounded — the Team Score is computed from them as they are; only the display rounds (to one decimal).
 */
export const goalPart = (value: number, goal: number): number => clamp(value / goal) * 100;
export const threatPart = (threatScore: number): number => clamp(threatCoverage(threatScore)) * 100;

/** Weighted 0–100 Team Score, or undefined until every part (the simulated threat score included) is known. */
export const teamScore = (parts: ScoreParts): number | undefined => {
	if (parts.threat === undefined) return undefined;
	return PART_KEYS.reduce((sum, key) => sum + SCORE_WEIGHTS[key] * (parts[key] ?? 0), 0);
};

export type ScoreTier = 'elite' | 'strong' | 'solid' | 'shaky' | 'risky';

export const scoreTier = (score: number): ScoreTier =>
	score >= 88 ? 'elite' : score >= 78 ? 'strong' : score >= 68 ? 'solid' : score >= 55 ? 'shaky' : 'risky';

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
	memberTypes: ReadonlyArray<ReadonlyArray<string>>;
	defense: DefenseProfile;
	offense: OffenseProfile;
	bulks: ReadonlyArray<number>;
	consistencies: ReadonlyArray<number>;
	roleScores: ReadonlyArray<RoleScores | undefined>;
	league: TeamLeague;
}

/** Ordered most-serious first. */
export const teamWarnings = (input: WarningInput): Array<TeamWarning> => {
	const out: Array<TeamWarning> = [];
	const base = (id: string) => id.replace(/_shadow$/, '');

	// The same species twice (Shadow and normal count as the same one)
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

	const goal = BULK_GOAL[input.league];
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

export interface TeamSlotDescriptor {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` */
	moveset: ReadonlyArray<string>;
	/** IVs picked for this Pokémon. Absent: the league's best (rank-1) spread, which is what a fresh pick gets. */
	ivs?: SlotIvs | undefined;
}

export const isSlotIvs = (value: unknown): value is SlotIvs =>
	Array.isArray(value) && value.length === 3 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 15);

/**
 * One Pokémon of a team as text: `azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH`, plus `@0.15.15` when its IVs were picked
 * (species and move ids never contain a dash, an `@` or a dot). The same Pokémon with other moves or other IVs is
 * another key.
 */
export const slotKey = (slot: Pick<TeamSlotDescriptor, 'speciesId' | 'moveset' | 'ivs'>): string =>
	[slot.speciesId, ...slot.moveset].join('-') + (slot.ivs ? `@${slot.ivs.join('.')}` : '');

/** `azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH@0.15.15,medicham-COUNTER-…` — see `slotKey`. */
export const encodeTeam = (team: ReadonlyArray<TeamSlotDescriptor>): string => team.map(slotKey).join(',');

export const decodeTeam = (raw: string | null | undefined): Array<TeamSlotDescriptor> =>
	(raw ?? '')
		.split(',')
		.map((part) => {
			const [moves = '', ivText] = part.split('@');
			const ivs = ivText?.split('.').map(Number);
			return { parts: moves.split('-').filter(Boolean), ivs: isSlotIvs(ivs) ? ivs : undefined };
		})
		.filter(({ parts }) => parts.length >= 3)
		.slice(0, 3)
		.map(({ parts: [speciesId, ...moveset], ivs }) => ({
			speciesId,
			moveset: moveset.slice(0, 3),
			...(ivs ? { ivs } : {}),
		}));
