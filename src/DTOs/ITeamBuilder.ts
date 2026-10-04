import { STATIC_LEAGUE_IDS } from './ILeagueDefinition';

/**
 * Mirrors dex-server's `team-builder.json` (see its `parsers/types/teams.ts`) —
 * PvPoke's own team-builder inputs, for Great / Ultra / Master League and every rotating / custom cup.
 */

/** A league id: `great` / `ultra` / `master`, or a rotating / custom cup's id from `leagues.json`. */
export type TeamLeague = string;
/** The three permanent leagues. */
export const TEAM_LEAGUES = STATIC_LEAGUE_IDS;
/** A plausible league id (whether it is still an active league is up to the caller, which knows `leagues.json`). */
export const isTeamLeague = (v: string | null | undefined): v is TeamLeague => typeof v === 'string' && v.length > 0;

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

/** `[level, atk IV, def IV, hp IV]` — the rank-1 (best stat product) spread for a CP cap. */
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
	/** Rank-1 spread per ranked species and CP cap (see `ivsKeyForCap`) — every Pokémon is rated at its ceiling. */
	ivs: Record<string, Partial<Record<string, BestIvs>>>;
	forms: Record<string, TeamBuilderForm>;
	excludedThreats: Array<string>;
	meta: Record<string, Array<string>>;
}

export interface RankedTeamMember {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` as moveIds — the ranking's recommended moveset. */
	moveset: Array<string>;
	/** IVs picked for this Pokémon (a favorite can carry them); absent: the league's best spread. */
	ivs?: [number, number, number];
	/** Level picked for this Pokémon; absent: the highest the CP cap allows. */
	level?: number;
	/** A Best Buddy (level ceiling 51). */
	buddy?: true;
	/** The stand-in for a Best Buddy without its ribbon (shown with a disabled crown). */
	formerBuddy?: true;
	/** A Super Max Mega (two more levels). */
	superMega?: true;
}

export interface RankedTeam {
	/** In the order the Battle plan plays them: lead, switch, closer. */
	members: Array<RankedTeamMember>;
	/** The Team Score, 0–100. */
	score: number;
	tier: 'elite' | 'strong' | 'solid' | 'shaky' | 'risky';
	/** PvPoke's threat score for the team — lower is better. */
	threatScore: number;
	/** Places gained (+) or lost (−) in the list it is in since the previous ranking; absent for new or unmoved teams. */
	rankChange?: number;
}

/** `team-ranking.json` (go-pokedex's `data` branch): every trio of each league's best Pokémon, rated; the top of each list. */
export interface TeamRanking {
	generatedAt: string;
	/** How many of the league's best-ranked Pokémon every trio was drawn from (every Super Max Mega of the league is added to them). */
	candidates: number;
	/** Only the leagues that were rated are here: a cup that rotated in after the last run has no entry yet. */
	leagues: Partial<
		Record<
		TeamLeague,
		{
			totalTeams: number;
			/** The sample this league used (the same as `candidates` today). */
			candidates?: number;
			/** The best teams by Team Score (higher is better). */
			byScore: Array<RankedTeam>;
			/** The best teams by threat score alone (lower is better). */
			byThreat: Array<RankedTeam>;
		}
		>
	>;
}
