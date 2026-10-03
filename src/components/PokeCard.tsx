import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { cleanName, dexNo, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { typeKey, typeVar } from '../lib/types';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { RankMedal } from './RankMedal';
import { ShadowMark } from './ShadowMark';
import { SpriteImg } from './Sprite';

export interface CardMetric {
	rank?: number;
	score?: number;
	dps?: number;
	tdo?: number;
	cp?: number;
	/** A plain whole-number figure (e.g. a base-stat sort), shown as "Pts". */
	pts?: number;
	/** PvP rank movement since the last update (+ climbed, − dropped). */
	rankChange?: number;
	/** The rank counts down from the best (a ranking read best-first): ranks 1–3 get a medal. */
	podium?: boolean;
}

/** 14123234 → "14.1M" (locale-aware) — keeps big figures inside the tile footer. */
const compactNumber = (n: number, locale: string): string =>
	new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Compact grid tile — same footprint as the calendar / evolution minis. */
export const PokeCard = ({
	pokemon,
	displayName,
	metric,
	league,
	onActivate,
	className,
}: {
	pokemon: IGamemasterPokemon;
	displayName?: string | undefined;
	metric?: CardMetric | undefined;
	/** When set, the detail page opens with this league/raid pre-selected. */
	league?: string | undefined;
	/** Render as an action tile instead of a link (for example, to edit a collection entry). */
	onActivate?: (() => void) | undefined;
	className?: string | undefined;
}) => {
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { i18n } = useTranslation();
	const content = (
		<>
			<span className='r-ctr-rank'>
				{metric?.podium && metric.rank != null && <RankMedal rank={metric.rank} />}
				{metric?.rank != null ? ordinal(metric.rank, currentLanguage) : dexNo(pokemon.dex)}
			</span>
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
				<SpriteImg pokemon={pokemon} loading='lazy' />
			</span>
			<b className='r-pc-name'>{displayName ?? cleanName(pokemon.speciesName)}</b>
			{metric?.cp != null && (
				<span className='r-pc-metric'>
					{metric.cp.toLocaleString()} <em>{gameTranslator(GameTranslatorKeys.CPDisplay, gl)}</em>
				</span>
			)}
			{metric?.pts != null && (
				<span className='r-pc-metric'>
					{compactNumber(metric.pts, i18n.language)} <em>Pts</em>
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
		</>
	);
	const props = {
		'className': className ? `r-pc ${className}` : 'r-pc',
		'data-shadow': pokemon.isShadow ? '' : undefined,
		'style': { ['--tc' as string]: typeVar(pokemon.types[0]) },
	};
	return onActivate ? (
		<button type='button' {...props} onClick={onActivate}>
			{content}
		</button>
	) : (
		<Link to={league ? `${R.pokemon(pokemon.speciesId)}?lg=${league}` : R.pokemon(pokemon.speciesId)} {...props}>
			{content}
		</Link>
	);
};
