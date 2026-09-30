import { isStaticLeague, STATIC_LEAGUE_IDS, type StaticLeagueId } from './ILeagueDefinition';

/**
 * Mirrors dex-server's `team-builder.json` (see its `parsers/types/teams.ts`) —
 * PvPoke's own team-builder inputs, for Great / Ultra / Master League only.
 */

/** The Teams view covers the three permanent leagues only. */
export type TeamLeague = StaticLeagueId;
export const TEAM_LEAGUES = STATIC_LEAGUE_IDS;
export const isTeamLeague = (v: string | null | undefined): v is TeamLeague => isStaticLeague(v ?? '');

/** A PvP move exactly as PvPoke's simulator sees it. */
export interface TeamBuilderMove {
	abbreviation: string;
	type: string;
	power: number;
	energy: number;
	energyGain: number;
	cooldown: number;
	turns: number;
	buffs?: [number, number];
	buffsSelf?: [number, number];
	buffsOpponent?: [number, number];
	buffTarget?: 'self' | 'opponent' | 'both';
	buffApplyChance?: number;
	category?: 'fast' | 'charged';
	damageMethod?: string;
	tags?: Array<string>;
}

/** `[level, atk IV, def IV, hp IV]` — the rank-1 (best stat product) spread for a league. */
export type BestIvs = [number, number, number, number];

export interface FormChange {
	type: string;
	trigger: string;
	moveId?: string;
	moveIDs?: Array<string>;
	effect?: string;
	alternativeFormId?: string;
	defaultFormId?: string;
	resetOnSwitch?: boolean;
}

export interface TeamBuilderForm {
	speciesId: string;
	baseStats: { atk: number; def: number; hp: number };
	types: Array<string>;
	fastMoves: Array<string>;
	chargedMoves: Array<string>;
	formChange?: FormChange;
	originalFormId?: string;
	nativeStatBuffs?: [number, number];
}

/** Whether the client-side simulator port is known to match PvPoke's current code (see dex-server `simulator-guard.ts`). */
export interface SimulatorStatus {
	verified: boolean;
	changedSources: Array<string>;
	unknownMechanics: Array<string>;
}

export interface TeamBuilderData {
	simulator: SimulatorStatus;
	moves: Record<string, TeamBuilderMove>;
	/** Rank-1 spread per ranked species and league — every Pokémon is rated at its ceiling. */
	ivs: Record<string, Partial<Record<TeamLeague, BestIvs>>>;
	forms: Record<string, TeamBuilderForm>;
	excludedThreats: Array<string>;
	meta: Record<TeamLeague, Array<string>>;
}
