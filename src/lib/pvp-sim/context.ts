import type { BestIvs, TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import { bestIvsFor, LEAGUE_CP } from '../league-caps';
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
	/** A Mega with a "Plus" move: it can be a Super Max Mega, which the suggestions always consider it as. */
	isSuperMega?: boolean;
}

export { LEAGUE_CP };

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
	lookup: (speciesId: string) => SpeciesInfo | undefined,
	/** The league's CP cap; the worker has no registry of league caps, so it is passed in there. */
	cpCap: number = LEAGUE_CP[league]
): SimContext => {
	const excluded = new Set(builder.excludedThreats);

	return {
		cp: cpCap,
		levelCap: 50,
		moves: builder.moves,
		speciesById: (speciesId): SimSpecies | undefined => {
			const info = lookup(speciesId);
			const form = builder.forms[speciesId];
			if (!info && !form) return undefined;

			const bestIvs: BestIvs | undefined = bestIvsFor(builder, speciesId, cpCap);
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
