/**
 * PvPoke walks its Pokémon in the game master's own order, and when two threats rate exactly the same (which is common
 * for a team of identical or near-identical Pokémon) the one it meets first is the one it keeps. The evaluator's pool has
 * to come in that order too, or such ties break the other way and the threat score comes out different. dex-server's
 * `game-master.json` lists the species in PvPoke's order (checked against PvPoke's `pokemon.json` for every ranked
 * species), so sorting by its key order restores it. A species the game master doesn't list goes last, in its own order.
 */
export const inPvpokeOrder = <T extends { speciesId: string }>(
	entries: ReadonlyArray<T>,
	gamemaster: Readonly<Record<string, unknown>>
): Array<T> => {
	const position = new Map(Object.keys(gamemaster).map((id, index) => [id, index] as const));
	const at = (entry: T) => position.get(entry.speciesId) ?? Number.MAX_SAFE_INTEGER;
	return [...entries].sort((a, b) => at(a) - at(b));
};
