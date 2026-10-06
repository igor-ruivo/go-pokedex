import { Link } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { cleanName, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { typeVar } from '../lib/types';
import { RankMedal } from './RankMedal';
import { ShadowMark } from './ShadowMark';
import { SpriteImg } from './Sprite';

/** One figure shown in the middle of a row on a wide screen: its name, its text, and how full its bar is (0 to 1). */
export interface RowStat {
	label: string;
	text: string;
	fill: number;
}

export const CounterRankRow = ({
	pokemon,
	rank,
	moves: rawMoves,
	moveData,
	score,
	scoreLabel,
	rankChange,
	podium = false,
	moveLayout = 'inline',
	stats,
	onActivate,
}: {
	pokemon: IGamemasterPokemon;
	rank: number;
	moves: ReadonlyArray<string>;
	moveData: Record<string, IGameMasterMove>;
	score?: string | undefined;
	scoreLabel?: string | undefined;
	rankChange?: number | undefined;
	podium?: boolean | undefined;
	moveLayout?: 'inline' | 'pvp' | undefined;
	/** What fills the middle of the row on a wide screen (hidden on a narrow one, where the row has no room for it). */
	stats?: ReadonlyArray<RowStat> | undefined;
	onActivate: () => void;
}) => {
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	// A ranking lists `none` for the charged move a Pokémon doesn't use: with a single charged move there is nothing to show
	// after it, neither a `+` nor the word.
	const moves = rawMoves.filter((move) => move !== 'none');
	const renderMove = (move: string, key: string, showSeparator: boolean) => {
		const moveInfo = moveData[move];
		return (
			<span key={key} className='r-rank-row-move'>
				{showSeparator && <i>+</i>}
				<Link
					to={R.move(move)}
					style={moveInfo?.type ? { ['--tc' as string]: typeVar(moveInfo.type) } : undefined}
					onClick={(event) => event.stopPropagation()}
				>
					{moveInfo?.moveName[gl] ?? cleanName(move)}
				</Link>
			</span>
		);
	};

	return (
		<div
			className='r-ctr-row r-ctr-row--raid r-rank-row'
			style={{ ['--tc' as string]: typeVar(pokemon.types[0]) }}
			role='link'
			tabIndex={0}
			onClick={onActivate}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onActivate();
				}
			}}
		>
			<span className='r-ctr-rank'>
				{podium && <RankMedal rank={rank} size={14} />}
				{ordinal(rank, currentLanguage)}
				{rankChange != null && rankChange !== 0 && (
					<i className='r-rank-row-delta' data-dir={rankChange > 0 ? 'up' : 'down'}>
						{rankChange > 0 ? '▲' : '▼'}
						{Math.abs(rankChange)}
					</i>
				)}
			</span>
			<span className='r-ctr-art'>
				{pokemon.isShadow && <ShadowMark />}
				<SpriteImg pokemon={pokemon} loading='lazy' />
			</span>
			<div className='r-ctr-mid'>
				<span className='r-ctr-name'>{cleanName(pokemon.speciesName)}</span>
				{moves.length > 0 &&
					(moveLayout === 'pvp' ? (
						<span className='r-ctr-moves r-rank-row-moves--split'>
							<span className='r-rank-row-moves-line'>{renderMove(moves[0], moves[0], false)}</span>
							{moves.length > 1 && (
								<span className='r-rank-row-moves-line'>
									{moves.slice(1).map((move, index) => renderMove(move, `${move}-${index + 1}`, index > 0))}
								</span>
							)}
						</span>
					) : (
						<span className='r-ctr-moves'>
							{moves.map((move, index) => renderMove(move, `${move}-${index}`, index > 0))}
						</span>
					))}
			</div>
			{stats && stats.length > 0 && (
				<div className='r-ctr-stats' aria-hidden='true'>
					{stats.map((stat) => (
						<span key={stat.label} className='r-ctr-stat'>
							<i>{stat.label}</i>
							<b>{stat.text}</b>
							<span className='r-ctr-stat-bar'>
								<span style={{ ['--v' as string]: Math.min(1, Math.max(0, stat.fill)) }} />
							</span>
						</span>
					))}
				</div>
			)}
			{score != null && scoreLabel != null && (
				<span className='r-ctr-score'>
					{score}
					<i>{scoreLabel}</i>
				</span>
			)}
		</div>
	);
};
