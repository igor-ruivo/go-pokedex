import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';

type Dex = Record<string, IGamemasterPokemon>;

/** A plain, regular species: no Shadow, no Mega, no alias and no regional or other form. */
const isPlain = (p: IGamemasterPokemon): boolean =>
	!p.isShadow && !p.isMega && !p.aliasId && !p.speciesName.includes('(');

/** The one species `p` evolves into, or none when it evolves into several (or into nothing). */
const onlyEvolution = (p: IGamemasterPokemon, dex: Dex): IGamemasterPokemon | undefined => {
	const next = (p.family?.evolutions ?? [])
		.map((id) => dex[id])
		.filter((e): e is IGamemasterPokemon => !!e && !e.isShadow);
	return next.length === 1 ? next[0] : undefined;
};

export interface EvolutionLine {
	/** The three stages, first to last. */
	stages: [IGamemasterPokemon, IGamemasterPokemon, IGamemasterPokemon];
	/** The Mega (or Primal) forms of the last stage. */
	megas: Array<IGamemasterPokemon>;
}

/**
 * Every plain three-stage evolution line: one species that evolves into exactly one species, that in turn evolves into exactly
 * one species that evolves no further (so no Eevee, no Oddish, no regional forms, no Shadows). The last stage brings its Megas.
 */
export const evolutionLines = (dex: Dex): Array<EvolutionLine> => {
	const lines: Array<EvolutionLine> = [];
	for (const first of Object.values(dex)) {
		if (!isPlain(first) || first.family?.parent) continue;
		const second = onlyEvolution(first, dex);
		if (!second || !isPlain(second) || second.family?.parent !== first.speciesId) continue;
		const third = onlyEvolution(second, dex);
		if (!third || !isPlain(third) || third.family?.parent !== second.speciesId) continue;
		if ((third.family?.evolutions ?? []).length > 0) continue;
		const megas = (third.megaFormsIds ?? []).map((id) => dex[id]).filter((p): p is IGamemasterPokemon => !!p);
		lines.push({ stages: [first, second, third], megas });
	}
	return lines;
};

/** Every form of a line a trainer can end up with. */
export const lineMembers = (line: EvolutionLine): Array<IGamemasterPokemon> => [...line.stages, ...line.megas];

export interface BestForm {
	pokemon: IGamemasterPokemon;
	rank: number;
}

/** The best-ranked of `members` under `rankOf` (a form with no rank does not count), or none when none of them is ranked. */
export const bestRanked = (
	members: ReadonlyArray<IGamemasterPokemon>,
	rankOf: (speciesId: string) => number | undefined
): BestForm | undefined => {
	let best: BestForm | undefined;
	for (const pokemon of members) {
		const rank = rankOf(pokemon.speciesId);
		if (rank !== undefined && (!best || rank < best.rank)) best = { pokemon, rank };
	}
	return best;
};

export interface BestAttacker<E> extends BestForm {
	type: string;
	entry: E;
}

/** The best raid attacker rank any of `members` holds, in whichever attacking type it is highest. */
export const bestRaidAttacker = <E extends { speciesId: string }>(
	members: ReadonlyArray<IGamemasterPokemon>,
	raidByType: Record<string, Record<string, E>>,
	rankOf: (entry: E) => number | undefined
): BestAttacker<E> | undefined => {
	let best: BestAttacker<E> | undefined;
	for (const [type, list] of Object.entries(raidByType)) {
		for (const pokemon of members) {
			const entry = list[pokemon.speciesId];
			const rank = entry && rankOf(entry);
			if (entry && rank !== undefined && (!best || rank < best.rank)) best = { type, pokemon, rank, entry };
		}
	}
	return best;
};
