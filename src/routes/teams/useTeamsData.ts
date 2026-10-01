import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../DTOs/IRankedPokemon';
import type { TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import { createSimContext, type SpeciesInfo } from '../../lib/pvp-sim/context';
import { inPvpokeOrder } from '../../lib/pvp-sim/pool-order';
import type { AlternativePick, EvaluatorInit, TeamEvaluation, TeamSlot } from '../../lib/pvp-sim/team-eval';
import type { SimContext } from '../../lib/pvp-sim/types';
import { encodeTeam, type ScoreParts, teamScore, type TeamSlotDescriptor, threatPart } from '../../lib/team-analysis';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { useTeamBuilderData } from '../../queries/teams';
import { getTeamWorker } from '../../workers/team-client';
import { analyzeTeam } from './useTeamAnalysis';

const LEAGUE_INDEX: Record<TeamLeague, number> = { great: 0, ultra: 1, master: 2 };

export interface TeamsData {
	ready: boolean;
	failed: boolean;
	builder: TeamBuilderData | undefined;
	gamemaster: Record<string, IGamemasterPokemon>;
	rankList: Record<string, IRankedPokemon>;
}

/** Everything the Teams view reads for one league: the game master, that league's ranking and PvPoke's team-builder data. */
export const useTeamsData = (league: TeamLeague): TeamsData => {
	const { gamemasterPokemon, fetchCompleted: gmDone, errors: gmErrors } = usePokemon();
	const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
	const builderQuery = useTeamBuilderData();

	const rankList = rankLists[LEAGUE_INDEX[league]];
	const ready = gmDone && pvpFetchCompleted && builderQuery.isSuccess && Object.keys(rankList).length > 0;

	const failed = !!gmErrors || !!pvpErrors || builderQuery.isError;

	return useMemo(
		() => ({ ready, failed, builder: builderQuery.data, gamemaster: gamemasterPokemon, rankList }),
		[ready, failed, builderQuery.data, gamemasterPokemon, rankList]
	);
};

const speciesInfoOf = (p: IGamemasterPokemon): SpeciesInfo => ({
	speciesId: p.speciesId,
	speciesName: p.speciesName,
	dex: p.dex,
	types: p.types.map(String),
	baseStats: p.baseStats,
	isShadow: p.isShadow,
});

/** Builds the (structured-cloneable) input the simulator worker needs for a league. */
const buildEvaluatorInit = (
	league: TeamLeague,
	builder: TeamBuilderData,
	gamemaster: Record<string, IGamemasterPokemon>,
	rankList: Record<string, IRankedPokemon>
): EvaluatorInit => {
	const ranking = inPvpokeOrder(
		Object.values(rankList).filter((r) => gamemaster[r.speciesId]),
		gamemaster
	).map((r) => ({
		speciesId: r.speciesId,
		moveset: r.moveset.filter((m) => m !== 'none'),
		score: r.score,
		lead: r.lead,
		switch: r.switch,
		closer: r.closer,
		charger: r.charger,
		consistency: r.consistency,
		rank: r.rank,
	}));

	return {
		league,
		builder,
		ranking,
		species: ranking.map(({ speciesId }) => speciesInfoOf(gamemaster[speciesId])),
	};
};

// Which league the worker's evaluator is currently built for — re-sending the whole ranking on
// every evaluation would dwarf the evaluation itself.
let initializedKey = '';

const ensureEvaluator = async (key: string, build: () => EvaluatorInit) => {
	if (initializedKey === key) return;
	await getTeamWorker().init(key, build());
	initializedKey = key;
};

const dataKey = (league: TeamLeague, data: TeamsData) =>
	`${league}|${Object.keys(data.rankList).length}|${Object.keys(data.builder?.moves ?? {}).length}`;

const toSlots = (team: ReadonlyArray<TeamSlotDescriptor>): Array<TeamSlot> =>
	team.map(({ speciesId, moveset, ivs, level }) => ({
		speciesId,
		moveset: [...moveset],
		ivs: ivs ? [...ivs] : undefined,
		level,
	}));

/**
 * The simulated part of a team's rating (threat score, meta coverage). Runs
 * in a worker; while a new result is being computed the previous one stays
 * available (`isFetching` says it's stale) so panels can dim instead of blank.
 */
export const useTeamEvaluation = (league: TeamLeague, data: TeamsData, team: ReadonlyArray<TeamSlotDescriptor>) => {
	const enabled = data.ready && team.length === 3;

	return useQuery<TeamEvaluation>({
		queryKey: ['team-eval', league, encodeTeam(team), data.builder?.simulator.verified],
		enabled,
		staleTime: Infinity,
		gcTime: 10 * 60 * 1000,
		placeholderData: keepPreviousData,
		retry: false,
		queryFn: async () => {
			await ensureEvaluator(dataKey(league, data), () =>
				buildEvaluatorInit(league, data.builder!, data.gamemaster, data.rankList)
			);
			return getTeamWorker().evaluate(toSlots(team));
		},
	});
};

/**
 * The simulated rating of several teams at once (the favorites list). Same queries, and so the same cache, as
 * `useTeamEvaluation` — a favorite already rated in the builder is not simulated again. The worker runs one job at a
 * time, so they resolve one after another.
 */
export const useTeamEvaluations = (
	league: TeamLeague,
	data: TeamsData,
	teams: ReadonlyArray<ReadonlyArray<TeamSlotDescriptor>>
) =>
	useQueries({
		queries: teams.map((team) => ({
			queryKey: ['team-eval', league, encodeTeam(team), data.builder?.simulator.verified],
			enabled: data.ready && team.length === 3,
			staleTime: Infinity,
			gcTime: 10 * 60 * 1000,
			retry: false,
			queryFn: async (): Promise<TeamEvaluation> => {
				await ensureEvaluator(dataKey(league, data), () =>
					buildEvaluatorInit(league, data.builder!, data.gamemaster, data.rankList)
				);
				return getTeamWorker().evaluate(toSlots(team));
			},
		})),
	});

/**
 * Every single-slot swap (each top candidate in each slot) with the threat score it would give. Heavier than a rating (every top candidate is simulated), so the caller
 * enables it once the rating has landed: the worker runs one job at a time and the score shouldn't wait on this.
 */
export const useTeamSuggestions = (
	league: TeamLeague,
	data: TeamsData,
	team: ReadonlyArray<TeamSlotDescriptor>,
	enabled: boolean
) =>
	useQuery<Array<AlternativePick>>({
		queryKey: ['team-suggest', league, encodeTeam(team)],
		enabled: enabled && data.ready && team.length === 3,
		staleTime: Infinity,
		gcTime: 10 * 60 * 1000,
		retry: false,
		queryFn: async () => {
			await ensureEvaluator(dataKey(league, data), () =>
				buildEvaluatorInit(league, data.builder!, data.gamemaster, data.rankList)
			);
			return getTeamWorker().swaps(toSlots(team));
		},
	});

/** Sim context for main-thread, battle-free work (stats, consistency). */
export const useSimContext = (league: TeamLeague, data: TeamsData) =>
	useMemo(
		() =>
			data.builder
				? createSimContext(league, data.builder, (id) => {
						const p = data.gamemaster[id];
						return p
							? {
									speciesId: p.speciesId,
									speciesName: p.speciesName,
									dex: p.dex,
									types: p.types.map(String),
									baseStats: p.baseStats,
									isShadow: p.isShadow,
								}
							: undefined;
					})
				: undefined,
		[league, data.builder, data.gamemaster]
	);

/**
 * The best way to finish a team of one or two Pokémon: every way of completing it with the league's best-ranked
 * Pokémon is rated (the threat score in the worker, the rest here), and the one with the highest Team Score wins.
 * Returns the team with the added Pokémon appended after the ones already on it — they keep their slots and moves.
 */
export const completeTeam = async (
	league: TeamLeague,
	data: TeamsData,
	ctx: SimContext,
	team: ReadonlyArray<TeamSlotDescriptor>
): Promise<Array<TeamSlotDescriptor> | undefined> => {
	await ensureEvaluator(dataKey(league, data), () =>
		buildEvaluatorInit(league, data.builder!, data.gamemaster, data.rankList)
	);
	const completions = await getTeamWorker().complete(toSlots(team));

	let best: { score: number; threatScore: number; added: Array<TeamSlotDescriptor> } | undefined;
	for (const { members, threatScore } of completions) {
		const analysis = analyzeTeam(league, ctx, data, members);
		if (!analysis) continue;
		const parts: ScoreParts = {
			threat: threatPart(threatScore),
			defense: analysis.defense.score,
			offense: analysis.offense.score,
			bulk: analysis.grades.bulk.part,
			safety: analysis.grades.safety.part,
			consistency: analysis.grades.consistency.part,
		};
		const score = teamScore(parts);
		if (score === undefined) continue;
		if (best && (score < best.score || (score === best.score && threatScore >= best.threatScore))) continue;
		best = {
			score,
			threatScore,
			// Play order, minus the Pokémon that were already there.
			added: members
				.filter((m) => !team.some((t) => t.speciesId === m.speciesId))
				.map((m) => ({ speciesId: m.speciesId, moveset: [...m.moveset] })),
		};
	}
	return best ? [...team, ...best.added] : undefined;
};
