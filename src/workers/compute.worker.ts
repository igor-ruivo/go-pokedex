/**
 * Off-main-thread home for the expensive, synchronous number crunching:
 * the per-family IV brute force and the whole-dex raid DPS comparison.
 *
 * Everything imported here must be pure (no React, no DOM, no TanStack Query).
 * `pokemon-helper` qualifies — its only runtime import is a plain enum.
 */
import { expose } from 'comlink';

import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import type { DPSEntry } from '../queries/raid-ranker';
import { computeBestIVs, computeDPSEntry } from '../utils/pokemon-helper';

// Keep in sync with `customCupCPLimit` in src/queries/pvp.ts. Duplicated (not imported)
// so the worker bundle doesn't pull in TanStack Query.
const CUSTOM_CUP_CP_LIMIT = 1500;

export interface FamilyMember {
	speciesId: string;
	atk: number;
	def: number;
	hp: number;
	isShadow: boolean;
}

export interface FamilyIvPercentsInput {
	reachable: Array<FamilyMember>;
	selfIsShadow: boolean;
	attackIV: number;
	defenseIV: number;
	hpIV: number;
}

const familyIvPercents = ({
	reachable,
	selfIsShadow,
	attackIV,
	defenseIV,
	hpIV,
}: FamilyIvPercentsInput): Record<string, IIvPercents> => {
	const result: Record<string, IIvPercents> = {};

	for (const p of reachable) {
		// A shadow's non-shadow relatives get a +2 floor on every IV.
		const effIV = (iv: number) => Math.min(15, selfIsShadow && !p.isShadow ? 2 + iv : iv);
		const effectiveAtk = effIV(attackIV);
		const effectiveDef = effIV(defenseIV);
		const effectiveHP = effIV(hpIV);

		const resLC = computeBestIVs(p.atk, p.def, p.hp, CUSTOM_CUP_CP_LIMIT);
		const resGL = computeBestIVs(p.atk, p.def, p.hp, 1500);
		const resUL = computeBestIVs(p.atk, p.def, p.hp, 2500);
		const resML = computeBestIVs(p.atk, p.def, p.hp, Number.MAX_VALUE);

		const flatLResult = Object.values(resLC).flat();
		const flatGLResult = Object.values(resGL).flat();
		const flatULResult = Object.values(resUL).flat();
		const flatMLResult = Object.values(resML).flat();

		const matches = (r: (typeof flatGLResult)[number]) =>
			r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP;

		const rankLIndex = flatLResult.findIndex(matches);
		const rankGLIndex = flatGLResult.findIndex(matches);
		const rankULIndex = flatULResult.findIndex(matches);
		const rankMLIndex = flatMLResult.findIndex(matches);

		result[p.speciesId] = {
			greatLeagueRank: rankGLIndex,
			greatLeagueLvl: flatGLResult[rankGLIndex].L,
			greatLeagueCP: flatGLResult[rankGLIndex].CP,
			greatLeagueAttack: flatGLResult[rankGLIndex].battle.A,
			greatLeagueDefense: flatGLResult[rankGLIndex].battle.D,
			greatLeagueHP: flatGLResult[rankGLIndex].battle.S,
			greatLeaguePerfect: flatGLResult[0].IVs,
			greatLeaguePerfectLevel: flatGLResult[0].L,
			greatLeaguePerfectCP: flatGLResult[0].CP,
			ultraLeagueRank: rankULIndex,
			ultraLeagueLvl: flatULResult[rankULIndex].L,
			ultraLeagueCP: flatULResult[rankULIndex].CP,
			ultraLeagueAttack: flatULResult[rankULIndex].battle.A,
			ultraLeagueDefense: flatULResult[rankULIndex].battle.D,
			ultraLeagueHP: flatULResult[rankULIndex].battle.S,
			ultraLeaguePerfect: flatULResult[0].IVs,
			ultraLeaguePerfectLevel: flatULResult[0].L,
			ultraLeaguePerfectCP: flatULResult[0].CP,
			masterLeagueRank: rankMLIndex,
			masterLeagueLvl: flatMLResult[rankMLIndex].L,
			masterLeagueCP: flatMLResult[rankMLIndex].CP,
			masterLeagueAttack: flatMLResult[rankMLIndex].battle.A,
			masterLeagueDefense: flatMLResult[rankMLIndex].battle.D,
			masterLeagueHP: flatMLResult[rankMLIndex].battle.S,
			masterLeaguePerfect: flatMLResult[0].IVs,
			masterLeaguePerfectLevel: flatMLResult[0].L,
			masterLeaguePerfectCP: flatMLResult[0].CP,
			customLeagueRank: rankLIndex,
			customLeagueLvl: flatLResult[rankLIndex].L,
			customLeagueCP: flatLResult[rankLIndex].CP,
			customLeagueAttack: flatLResult[rankLIndex].battle.A,
			customLeagueDefense: flatLResult[rankLIndex].battle.D,
			customLeagueHP: flatLResult[rankLIndex].battle.S,
			customLeaguePerfect: flatLResult[0].IVs,
			customLeaguePerfectLevel: flatLResult[0].L,
			customLeaguePerfectCP: flatLResult[0].CP,
		};
	}

	return result;
};

export interface RaidComparisonsInput {
	candidates: Array<IGamemasterPokemon>;
	moves: Record<string, IGameMasterMove>;
	target: IGamemasterPokemon;
}

/** Best-moveset DPS of every candidate against `target`, sorted strongest first. */
const raidComparisons = ({ candidates, moves, target }: RaidComparisonsInput): Array<DPSEntry> => {
	const out: Array<DPSEntry> = candidates.map((p) => computeDPSEntry(p, {}, moves, 15, 100, '', target));
	return out.sort((a, b) => (b.dps !== a.dps ? b.dps - a.dps : a.speciesId.localeCompare(b.speciesId)));
};

export const api = { familyIvPercents, raidComparisons };
export type ComputeApi = typeof api;

expose(api);
