import type { BestIvs, TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import type { SimContext, SimSpecies } from './types';

/** What the simulator needs to know about one species — a slim projection of the game master. */
export interface SpeciesInfo {
	speciesId: string;
	speciesName: string;
	dex: number;
	/** Any casing — normalised internally. */
	types: ReadonlyArray<string>;
	baseStats: { atk: number; def: number; hp: number };
	isShadow: boolean;
}

/** League CP caps — PvPoke's "all Pokémon" cup at each. */
export const LEAGUE_CP: Record<TeamLeague, number> = { great: 1500, ultra: 2500, master: 10000 };

const normaliseTypes = (types: ReadonlyArray<string>): [string, string] => [
	(types[0] ?? 'none').toLowerCase(),
	(types[1] ?? 'none').toLowerCase(),
];

/**
 * Wires the raw team-builder data and a species lookup into what `SimPokemon`
 * consumes: the PvP move table, each species' rank-1 IVs for the league, and the
 * mid-battle form data (which overrides the game master for those species).
 */
export const createSimContext = (
	league: TeamLeague,
	builder: TeamBuilderData,
	lookup: (speciesId: string) => SpeciesInfo | undefined
): SimContext => {
	const excluded = new Set(builder.excludedThreats);

	return {
		cp: LEAGUE_CP[league],
		levelCap: 50,
		moves: builder.moves,
		speciesById: (speciesId): SimSpecies | undefined => {
			const info = lookup(speciesId);
			const form = builder.forms[speciesId];
			if (!info && !form) return undefined;

			const bestIvs: BestIvs | undefined = builder.ivs[speciesId]?.[league];
			const isShadow = info?.isShadow ?? speciesId.endsWith('_shadow');

			return {
				speciesId,
				speciesName: info?.speciesName ?? speciesId,
				dex: info?.dex ?? 0,
				types: normaliseTypes(form?.types ?? info?.types ?? []),
				baseStats: form?.baseStats ?? info!.baseStats,
				tags: [...(isShadow ? ['shadow'] : []), ...(excluded.has(speciesId) ? ['teambuilderexclude'] : [])],
				bestIvs,
				formChange: form?.formChange,
				originalFormId: form?.originalFormId,
				nativeStatBuffs: form?.nativeStatBuffs,
			};
		},
	};
};
