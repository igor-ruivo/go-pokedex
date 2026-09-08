import { Link } from 'react-router-dom';

import { ImageSource, useImageSource } from '../../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName, dexNo } from '../lib/format';
import { R } from '../lib/nav';
import { typeKey, typeVar } from '../lib/types';
import { spriteUrl } from './Sprite';

export interface CardMetric {
	rank?: number;
	score?: number;
	dps?: number;
}

export const PokeCard = ({ pokemon, metric }: { pokemon: IGamemasterPokemon; metric?: CardMetric | undefined }) => {
	const { imageSource } = useImageSource();
	const primary = pokemon.types[0];
	return (
		<Link to={R.pokemon(pokemon.speciesId)} className='r-pc' style={{ ['--tc' as string]: typeVar(primary) }}>
			{metric?.rank != null && <span className='r-pc-rank'>{metric.rank}</span>}
			<div className='r-pc-art'>
				<img src={spriteUrl(pokemon, imageSource)} alt='' loading='lazy' decoding='async' />
			</div>
			<div className='r-pc-meta'>
				<span className='r-pc-dex'>{dexNo(pokemon.dex)}</span>
				<b className='r-pc-name'>{cleanName(pokemon.speciesName)}</b>
				<div className='r-pc-types'>
					{pokemon.types.map((t) => (
						<i key={typeKey(t)} style={{ background: typeVar(t) }} title={typeKey(t)} />
					))}
					{imageSource === ImageSource.Shiny && <span className='r-pc-shiny'>✦</span>}
				</div>
			</div>
			{metric?.score != null && <span className='r-pc-metric'>{metric.score.toFixed(1)}</span>}
			{metric?.dps != null && (
				<span className='r-pc-metric'>
					{metric.dps.toFixed(1)} <em>DPS</em>
				</span>
			)}
		</Link>
	);
};
