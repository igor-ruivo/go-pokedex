import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../DTOs/IRankedPokemon';
import type { TeamLeague } from '../../DTOs/ITeamBuilder';
import { type MemberStats, memberStats } from '../../lib/pvp-sim/member';
import { SimPokemon } from '../../lib/pvp-sim/pokemon';
import type { SimContext } from '../../lib/pvp-sim/types';
import {
	assignRoles,
	bulkGoal,
	bulkPart,
	CONSISTENCY_GOAL,
	consistencyPart,
	type DefenseProfile,
	defenseProfile,
	type LetterGrade,
	letterGrade,
	type OffenseProfile,
	offenseProfile,
	type RoleAssignment,
	type RoleScores,
	SAFETY_GOAL,
	safetyPart,
	type TeamSlotDescriptor,
	type TeamWarning,
	teamWarnings,
} from '../../lib/team-analysis';
import type { TeamsData } from './useTeamsData';

export interface AnalyzedMember {
	slot: TeamSlotDescriptor;
	pokemon: IGamemasterPokemon;
	ranked: IRankedPokemon | undefined;
	stats: MemberStats;
	/** Lowercase, one or two. */
	types: Array<string>;
	/** Fast move type first, then the charged moves'. */
	moveTypes: Array<string>;
	roleScores: RoleScores | undefined;
}

export interface TeamTotals {
	cp: number;
	atk: number;
	def: number;
	hp: number;
	statProduct: number;
	averageBulk: number;
	averageSafety: number;
	averageConsistency: number;
}

export interface TeamAnalysis {
	members: Array<AnalyzedMember>;
	defense: DefenseProfile;
	offense: OffenseProfile;
	roles: RoleAssignment | undefined;
	totals: TeamTotals;
	/** PvPoke's Bulk / Safety / Consistency grades, each with the 0–100 the Team Score uses. */
	grades: Record<'bulk' | 'safety' | 'consistency', { grade: LetterGrade; part: number }>;
	warnings: Array<TeamWarning>;
}

const sum = (values: ReadonlyArray<number>) => values.reduce((a, b) => a + b, 0);

/**
 * Everything about a team that needs no battle simulation. Each member is
 * built the way the simulator builds it (the IVs picked for it, else the league's best, rank-1 spread)
 * so the stats shown here are the stats the threat score was rated with.
 */
export const analyzeTeam = (
	league: TeamLeague,
	ctx: SimContext,
	data: Pick<TeamsData, 'gamemaster' | 'rankList'>,
	team: ReadonlyArray<TeamSlotDescriptor>
): TeamAnalysis | undefined => {
	const members: Array<AnalyzedMember> = [];

	for (const slot of team) {
		const pokemon = data.gamemaster[slot.speciesId];
		if (!pokemon || slot.moveset.some((m) => m !== 'none' && !ctx.moves[m])) return undefined;

		const ranked = data.rankList[slot.speciesId];
		const sim = new SimPokemon(ctx.speciesById(slot.speciesId)!, slot.moveset, ctx, slot.ivs, slot.level);

		members.push({
			slot,
			pokemon,
			ranked,
			stats: memberStats(sim),
			types: pokemon.types.map((t) => String(t).toLowerCase()),
			moveTypes: slot.moveset.filter((m) => m !== 'none').map((m) => ctx.moves[m].type),
			roleScores: ranked ? { lead: ranked.lead, switch: ranked.switch, closer: ranked.closer } : undefined,
		});
	}

	const defense = defenseProfile(members.map((m) => m.types));
	const offense = offenseProfile(members.map((m) => m.moveTypes));
	const roles = assignRoles(members.map((m) => m.roleScores));

	const n = members.length || 1;
	const totals: TeamTotals = {
		cp: sum(members.map((m) => m.stats.cp)),
		atk: sum(members.map((m) => m.stats.atk)),
		def: sum(members.map((m) => m.stats.def)),
		hp: sum(members.map((m) => m.stats.hp)),
		statProduct: sum(members.map((m) => m.stats.statProduct)),
		averageBulk: sum(members.map((m) => m.stats.bulk)) / n,
		averageSafety: sum(members.map((m) => m.ranked?.switch ?? 60)) / n,
		averageConsistency: sum(members.map((m) => m.stats.consistency)) / n,
	};

	const grades = {
		bulk: {
			grade: letterGrade(totals.averageBulk, bulkGoal(league)),
			part: bulkPart(league, totals.averageBulk),
		},
		safety: {
			grade: letterGrade(totals.averageSafety, SAFETY_GOAL),
			part: safetyPart(totals.averageSafety),
		},
		consistency: {
			grade: letterGrade(totals.averageConsistency, CONSISTENCY_GOAL),
			part: consistencyPart(totals.averageConsistency),
		},
	};

	const warnings = teamWarnings({
		speciesIds: team.map((t) => t.speciesId),
		memberTypes: members.map((m) => m.types),
		defense,
		offense,
		bulks: members.map((m) => m.stats.bulk),
		consistencies: members.map((m) => m.stats.consistency),
		roleScores: members.map((m) => m.roleScores),
		league,
	});

	return { members, defense, offense, roles, totals, grades, warnings };
};

export const useTeamAnalysis = (
	league: TeamLeague,
	ctx: SimContext | undefined,
	data: TeamsData,
	team: ReadonlyArray<TeamSlotDescriptor>
): TeamAnalysis | undefined =>
	useMemo(
		() => (ctx && data.ready && team.length > 0 ? analyzeTeam(league, ctx, data, team) : undefined),
		[league, ctx, data, team]
	);
