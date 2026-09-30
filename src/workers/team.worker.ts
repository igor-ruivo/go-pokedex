/**
 * Off-main-thread home for the team simulator: rating one team means running
 * a thousand-odd 1v1 battles (see `lib/pvp-sim`), far too much for the main
 * thread. The evaluator for a league is built once (`init`) and kept here, so
 * every later `evaluate` only ships the tiny team description across.
 */
import { expose } from 'comlink';

import type { AlternativePick, EvaluatorInit, TeamEvaluation, TeamSlot } from '../lib/pvp-sim/team-eval';
import { TeamEvaluator } from '../lib/pvp-sim/team-eval';

let evaluator: TeamEvaluator | undefined;
let currentKey = '';

const requireEvaluator = (): TeamEvaluator => {
	if (!evaluator) throw new Error('Team evaluator used before init');
	return evaluator;
};

const api = {
	/** Builds the evaluator for a league. A repeat call with the same `key` is a no-op. */
	init(key: string, init: EvaluatorInit): void {
		if (key === currentKey && evaluator) return;
		evaluator = new TeamEvaluator(init);
		currentKey = key;
	},
	evaluate(team: Array<TeamSlot>): TeamEvaluation {
		return requireEvaluator().evaluate(team);
	},
	suggest(team: Array<TeamSlot>): Array<AlternativePick> {
		return requireEvaluator().suggest(team);
	},
};

export type TeamApi = typeof api;
expose(api);
