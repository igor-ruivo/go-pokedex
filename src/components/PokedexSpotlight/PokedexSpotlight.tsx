import { useEffect, useState } from 'react';

import { getRandomPokemon } from '../../domains/pokemon/api';
import type { Pokemon } from '../../domains/pokemon/types';
import styles from './PokedexSpotlight.module.scss';

const PokedexSpotlight = () => {
	const [pokemon, setPokemon] = useState<Pokemon | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadRandom = async () => {
		setLoading(true);
		setError(null);
		try {
			const poke = await getRandomPokemon();
			setPokemon(poke);
		} catch {
			setError('Failed to load Pokémon.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadRandom();
	}, []);

	return (
		<div className={styles['pokedex-spotlight']}>
			{loading && <div>Loading...</div>}
			{error && <div>{error}</div>}
			{pokemon && !loading && !error && (
				<>
					<img
						src={pokemon.image}
						alt={pokemon.name}
						className={styles['pokedex-spotlight__image']}
						loading='lazy'
					/>
					<div className={styles['pokedex-spotlight__name']}>
						{pokemon.name}
					</div>
					<div className={styles['pokedex-spotlight__types']}>
						{pokemon.types.map((type) => (
							<span key={type} className={styles['pokedex-spotlight__type']}>
								{type}
							</span>
						))}
					</div>
					<div className={styles['pokedex-spotlight__stats']}>
						<div className={styles['pokedex-spotlight__stat']}>
							<span>Attack</span>
							<span>{pokemon.baseStats.attack}</span>
						</div>
						<div className={styles['pokedex-spotlight__stat']}>
							<span>Defense</span>
							<span>{pokemon.baseStats.defense}</span>
						</div>
						<div className={styles['pokedex-spotlight__stat']}>
							<span>Stamina</span>
							<span>{pokemon.baseStats.stamina}</span>
						</div>
					</div>
					<button
						className={styles['pokedex-spotlight__button']}
						onClick={() => void loadRandom()}
					>
						Surprise Me!
					</button>
				</>
			)}
		</div>
	);
};

export default PokedexSpotlight;
