import type { IGameMasterMove } from '../DTOs/IGameMasterMove';

/**
 * Hidden Power comes as one move per type (`HIDDEN_POWER_PSYCHIC`…): any Pokémon that learns it can have any of them, the type
 * following its IVs, and the simulator and the raid damage need the type. For the lists a player browses that is 16 rows of the
 * same move, so they show it once, as the generic Hidden Power (Normal type, no type in its name) — the typed ids stay in the
 * data, in the rankings and in the Pokémon's own moves.
 */
export const HIDDEN_POWER = 'HIDDEN_POWER';

export const isHiddenPowerVariant = (moveId: string): boolean => /^HIDDEN_POWER_[A-Z]+$/.test(moveId);

/** The id a move is listed under: its own, or the generic Hidden Power for any of its typed variants. */
export const baseMoveId = (moveId: string): string => (isHiddenPowerVariant(moveId) ? HIDDEN_POWER : moveId);

/** The ids of a move list as listed (each Hidden Power variant as the generic one), each once, in order. */
export const baseMoveIds = (moveIds: ReadonlyArray<string>): Array<string> => [...new Set(moveIds.map(baseMoveId))];

/**
 * The moves with every Hidden Power variant replaced by one generic Hidden Power: Normal type, named without its type. Built
 * from a variant (they share their numbers); a table with none is returned as it is.
 */
export const withGenericHiddenPower = (moves: Record<string, IGameMasterMove>): Record<string, IGameMasterMove> => {
	const variants = Object.values(moves).filter((m) => isHiddenPowerVariant(m.moveId));
	if (variants.length === 0) return moves;
	const [first] = variants;
	const out: Record<string, IGameMasterMove> = {};
	for (const [id, move] of Object.entries(moves)) if (!isHiddenPowerVariant(id)) out[id] = move;
	out[HIDDEN_POWER] = {
		...first,
		moveId: HIDDEN_POWER,
		type: 'normal',
		moveName: first.groupName ?? first.moveName,
	};
	return out;
};
