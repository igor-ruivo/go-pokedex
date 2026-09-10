import { Link } from 'react-router-dom';

import { useImageSource } from '../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { cleanName, dexNo } from '../lib/format';
import { R } from '../lib/nav';
import { typeKey, typeVar } from '../lib/types';
import { ShadowMark } from './ShadowMark';
import { spriteUrl } from './Sprite';

export interface CardMetric {
	rank?: number;
	score?: number;
	dps?: number;
	tdo?: number;
	edps?: number;
	cp?: number;
	/** PvP rank movement since the last update (+ climbed, − dropped). */
	rankChange?: number;
}

/** Compact grid tile — same footprint as the calendar / evolution minis. */
export const PokeCard = ({
	pokemon,
	metric,
	league,
}: {
	pokemon: IGamemasterPokemon;
	metric?: CardMetric | undefined;
	/** When set, the detail page opens with this league/raid pre-selected. */
	league?: string | undefined;
}) => {
	const { imageSource } = useImageSource();
	return (
		<Link
			to={league ? `${R.pokemon(pokemon.speciesId)}?lg=${league}` : R.pokemon(pokemon.speciesId)}
			className='r-pc'
			data-shadow={pokemon.isShadow ? '' : undefined}
			style={{ ['--tc' as string]: typeVar(pokemon.types[0]) }}
		>
			<span className='r-pc-rank'>{metric?.rank ?? dexNo(pokemon.dex)}</span>
			{metric?.rankChange != null && metric.rankChange !== 0 && (
				<span className='r-pc-delta' data-dir={metric.rankChange > 0 ? 'up' : 'down'}>
					{metric.rankChange > 0 ? '▲' : '▼'}
					{Math.abs(metric.rankChange)}
				</span>
			)}
			{pokemon.isShadow && <ShadowMark />}
			<span className='r-pc-types' aria-hidden='true'>
				{pokemon.types.map((t) => (
					<i key={typeKey(t)} style={{ background: typeVar(t) }} />
				))}
			</span>
			<span className='r-pc-art'>
				<img src={spriteUrl(pokemon, imageSource)} alt='' loading='lazy' decoding='async' />
			</span>
			<b className='r-pc-name'>{cleanName(pokemon.speciesName)}</b>
			{metric?.cp != null && (
				<span className='r-pc-metric'>
					{metric.cp.toLocaleString()} <em>CP</em>
				</span>
			)}
			{metric?.score != null && (
				<span className='r-pc-metric'>
					{metric.score.toFixed(1)} <em>Pts</em>
				</span>
			)}
			{metric?.dps != null && (
				<span className='r-pc-metric'>
					{metric.dps.toFixed(1)} <em>DPS</em>
				</span>
			)}
			{metric?.tdo != null && (
				<span className='r-pc-metric'>
					{Math.round(metric.tdo).toLocaleString()} <em>TDO</em>
				</span>
			)}
			{metric?.edps != null && (
				<span className='r-pc-metric'>
					{metric.edps.toFixed(1)} <em>eDPS</em>
				</span>
			)}
		</Link>
	);
};
