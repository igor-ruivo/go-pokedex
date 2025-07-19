import { useEffect, useState } from 'react';

import type { IIvPercents } from '../components/PokemonInfoBanner';
import { usePokemon } from '../contexts/pokemon-context';
import { customCupCPLimit } from '../contexts/pvp-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { computeBestIVs, fetchReachablePokemonIncludingSelf } from '../utils/pokemon-helper';

interface IUseComputeIVsProps {
	pokemon: IGamemasterPokemon;
	attackIV: number;
	defenseIV: number;
	hpIV: number;
	justForSelf?: boolean;
}

const useComputeIVs = ({ pokemon, attackIV, defenseIV, hpIV, justForSelf = false }: IUseComputeIVsProps) => {
	const [ivPercents, setIvPercents] = useState<Record<string, IIvPercents>>({});
	const [loading, setLoading] = useState(true);
	const { gamemasterPokemon, fetchCompleted } = usePokemon();

	useEffect(() => {
		setLoading(true);
		if (!fetchCompleted) {
			return;
		}

		const computeIvs = () => {
			const familyIvPercents: Record<string, IIvPercents> = {};

			let reachablePokemons = new Set<IGamemasterPokemon>();
			if (!justForSelf && fetchCompleted && pokemon) {
				reachablePokemons = fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon);
			} else {
				reachablePokemons.add(pokemon);
			}

			Array.from(reachablePokemons)
				.filter((p) => p)
				.forEach((p) => {
					const effectiveAtk = Math.min(15, pokemon.isShadow && !p.isShadow ? 2 + attackIV : attackIV);
					const effectiveDef = Math.min(15, pokemon.isShadow && !p.isShadow ? 2 + defenseIV : defenseIV);
					const effectiveHP = Math.min(15, pokemon.isShadow && !p.isShadow ? 2 + hpIV : hpIV);

					const resLC = computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, customCupCPLimit);
					const resGL = computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 1500);
					const resUL = computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, 2500);
					const resML = computeBestIVs(p.baseStats.atk, p.baseStats.def, p.baseStats.hp, Number.MAX_VALUE);

					const flatLResult = Object.values(resLC).flat();
					const flatGLResult = Object.values(resGL).flat();
					const flatULResult = Object.values(resUL).flat();
					const flatMLResult = Object.values(resML).flat();

					const rankLIndex = flatLResult.findIndex(
						(r) => r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP
					);
					const rankGLIndex = flatGLResult.findIndex(
						(r) => r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP
					);
					const rankULIndex = flatULResult.findIndex(
						(r) => r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP
					);
					const rankMLIndex = flatMLResult.findIndex(
						(r) => r.IVs.A === effectiveAtk && r.IVs.D === effectiveDef && r.IVs.S === effectiveHP
					);

					familyIvPercents[p.speciesId] = {
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
				});
			setIvPercents(familyIvPercents);
			setLoading(false);
		};
		computeIvs();
	}, [pokemon, attackIV, defenseIV, hpIV, justForSelf, gamemasterPokemon, fetchCompleted]);

	const result: [Record<string, IIvPercents>, boolean] = [ivPercents, loading];

	return result;
};

export default useComputeIVs;
