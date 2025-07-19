import './ReusableAdorners.scss';

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

import { usePokemon } from '../contexts/pokemon-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { shortName, sortPokemonByBattlePowerDesc } from '../utils/pokemon-helper';
import PokemonImage from './PokemonImage';

interface IPokemonFamilyProps {
	pokemon: IGamemasterPokemon;
	similarPokemon: Set<IGamemasterPokemon>;
	getClickDestination: (speciesId: string) => string;
}

const PokemonFamily = ({ pokemon, similarPokemon, getClickDestination }: IPokemonFamilyProps) => {
	const { gamemasterPokemon } = usePokemon();
	const navigate = useNavigate();
	const options = useMemo(() => Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc), [similarPokemon]);
	return (
		<>
			{similarPokemon.size > 1 && (
				<div className='family-container-element'>
					<Select
						className='navbar-dropdown-family'
						isSearchable={false}
						options={options}
						value={options.find((s) => s.speciesId === pokemon.speciesId)}
						onChange={(v) => void navigate(getClickDestination(v!.speciesId))}
						formatOptionLabel={(data, _) => (
							<div className='hint-container'>
								{data && (
									<PokemonImage
										pokemon={gamemasterPokemon[data.speciesId]}
										withName={false}
										specificHeight={34}
										specificWidth={34}
									/>
								)}
								<strong className='aligned-block ellipsed normal-text large-line-height'>
									{data && shortName(data.speciesName)}
								</strong>
							</div>
						)}
					/>
				</div>
			)}
		</>
	);
};

export default PokemonFamily;
