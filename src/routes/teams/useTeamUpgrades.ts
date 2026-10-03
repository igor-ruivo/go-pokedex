import { useMemo } from 'react';

import type { TeamLeague } from '../../DTOs/ITeamBuilder';
import type { AlternativePick } from '../../lib/pvp-sim/team-eval';
import type { SimContext } from '../../lib/pvp-sim/types';
import { evaluationKey, type ScoreParts, teamScore, type TeamSlotDescriptor, threatPart } from '../../lib/team-analysis';
import { analyzeTeam } from './useTeamAnalysis';
import type { TeamsData } from './useTeamsData';

/** How many upgrades each list shows. */
const SHOWN = 4;
/** A swap has to beat the current Team Score by at least this much (it is shown with one decimal). */
const MIN_SCORE_GAIN = 0.05;

export interface ScoreUpgrade extends AlternativePick {
	/** The Team Score (the radar's) of the team with this swap. */
	score: number;
	/** Change against the current Team Score (positive = better). */
	scoreDelta: number;
}

export interface TeamUpgrades {
	/** Swaps that lower (or keep) the threat score, best first. */
	byThreat: Array<AlternativePick>;
	/** Swaps that raise the Team Score, best first. */
	byScore: Array<ScoreUpgrade>;
}

/** Keeps the first (best) pick of each species, for a list already sorted best-first. */
const bestPerSpecies = <T extends { speciesId: string }>(picks: ReadonlyArray<T>): Array<T> => {
	const seen = new Set<string>();
	return picks.filter((p) => (seen.has(p.speciesId) ? false : (seen.add(p.speciesId), true)));
};

/**
 * Two readings of the same set of single-slot swaps: which lower the threat score, and which raise the Team Score
 * (threat, typing, bulk, safety and consistency together — the radar's score, computed for each swapped team here
 * on the main thread, since only the threat part needs the simulator).
 */
export const useTeamUpgrades = (
	league: TeamLeague,
	ctx: SimContext | undefined,
	data: TeamsData,
	team: ReadonlyArray<TeamSlotDescriptor>,
	swaps: ReadonlyArray<AlternativePick> | undefined,
	currentScore: number | undefined
): TeamUpgrades | undefined => {
	// Keyed by what the team is rated on, not by the array: flipping a Best Buddy flag on its own changes neither the
	// IVs nor the level, so it must not redo every swap's analysis.
	const teamKey = evaluationKey(team);
	return useMemo(() => {
		if (!swaps || !ctx || currentScore === undefined) return undefined;

		const byThreat = bestPerSpecies(swaps)
			.filter((p) => p.delta <= 0)
			.slice(0, SHOWN);

		const scored: Array<ScoreUpgrade> = [];
		for (const pick of swaps) {
			const swapped = team.map((slot, i) =>
				i === pick.slot ? { speciesId: pick.speciesId, moveset: [...pick.moveset] } : slot
			);
			const analysis = analyzeTeam(league, ctx, data, swapped);
			if (!analysis) continue;
			const parts: ScoreParts = {
				threat: threatPart(pick.threatScore),
				defense: analysis.defense.score,
				offense: analysis.offense.score,
				bulk: analysis.grades.bulk.part,
				safety: analysis.grades.safety.part,
				consistency: analysis.grades.consistency.part,
			};
			const score = teamScore(parts);
			if (score !== undefined) scored.push({ ...pick, score, scoreDelta: score - currentScore });
		}
		scored.sort((a, b) => b.score - a.score);
		const byScore = bestPerSpecies(scored)
			.filter((p) => p.scoreDelta >= MIN_SCORE_GAIN)
			.slice(0, SHOWN);

		return { byThreat, byScore };
		// `team` itself is tracked through `teamKey`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [league, ctx, data, teamKey, swaps, currentScore]);
};
