import { useTranslation } from 'react-i18next';

import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { usePokemon } from '../queries/pokemon';

/** The highest base stat of each kind among all the Pokémon (what the bars are measured against), worked out once per game master. */
const statMaxCache = new WeakMap<object, { atk: number; def: number; hp: number }>();
const statMaxOf = (gamemasterPokemon: Record<string, IGamemasterPokemon>) => {
	let max = statMaxCache.get(gamemasterPokemon);
	if (!max) {
		max = { atk: 1, def: 1, hp: 1 };
		for (const p of Object.values(gamemasterPokemon)) {
			max.atk = Math.max(max.atk, p.baseStats.atk);
			max.def = Math.max(max.def, p.baseStats.def);
			max.hp = Math.max(max.hp, p.baseStats.hp);
		}
		statMaxCache.set(gamemasterPokemon, max);
	}
	return max;
};

/** A Pokémon's base stats (attack, defense, HP) as three bars, each measured against the highest there is among all the Pokémon. */
export const BaseStatBars = ({ pokemon }: { pokemon: IGamemasterPokemon }) => {
	const { t } = useTranslation(['pokemonDetail']);
	const { gamemasterPokemon } = usePokemon();
	const max = statMaxOf(gamemasterPokemon);
	return (
		<div className='r-bars'>
			{(
				[
					['atk', t('pokemonDetail:hero.stats.atk')],
					['def', t('pokemonDetail:hero.stats.def')],
					['hp', t('pokemonDetail:hero.stats.hp')],
				] as const
			).map(([stat, label]) => (
				<div key={stat} className='r-bar'>
					<i>{label}</i>
					<b>{pokemon.baseStats[stat]}</b>
					<span className='r-bar-track'>
						<span className='r-bar-fill' style={{ ['--v' as string]: Math.min(1, pokemon.baseStats[stat] / max[stat]) }} />
					</span>
				</div>
			))}
		</div>
	);
};
