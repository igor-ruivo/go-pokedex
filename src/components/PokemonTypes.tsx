import './PokemonTypes.scss';

import type { PokemonTypes as PokemonTypesType } from '../DTOs/PokemonTypes';

type IPokemonTypesProps = {
	types: Array<PokemonTypesType>;
};

const PokemonTypes = ({ types }: IPokemonTypesProps) => {
	return (
		<div className='pokemon-types'>
			{types.map((t) => {
				const url = `/images/types/${t.toString().toLocaleLowerCase()}.png`;
				return (
					<img
						key={t}
						src={url}
						alt={t.toString()}
						width='100%'
						height='100%'
					/>
				);
			})}
		</div>
	);
};

export default PokemonTypes;
