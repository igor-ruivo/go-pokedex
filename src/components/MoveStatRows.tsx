import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { GameLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { cleanName } from '../lib/format';
import { type Arena, buffInfo, fastMoveTurns, moveDPE, moveDPS, moveEPS } from '../lib/moves';
import { gameTypeDisplayTranslator } from '../utils/GameTranslator';

/** The top of a move's row: its type (the picture and the pill), its name and the chips after it (Fast, Charged, Recommended, Elite...). */
export const MoveHead = ({
	m,
	moveId,
	gl,
	chips,
}: {
	m: IGameMasterMove;
	moveId: string;
	gl: GameLanguage;
	/** The chips that follow the type pill: tags of the move, or of what it is for. */
	chips?: ReactNode;
}) => {
	const type = m.type.toLowerCase();
	return (
		<div className='r-move-head'>
			<img
				className='r-move-ico'
				src={`/images/types/${type}.png`}
				alt={gameTypeDisplayTranslator(type, gl) || m.type}
				width={34}
				height={34}
				loading='lazy'
			/>
			<b>{m.moveName[gl] ?? cleanName(moveId)}</b>
			<span className='r-move-chips'>
				<span className='r-move-type'>{gameTypeDisplayTranslator(type, gl) || m.type}</span>
				{chips}
			</span>
		</div>
	);
};

/**
 * The figures of a move in one arena (PvE or PvP): damage, energy, and the duration (PvE) or the turns (a PvP fast move); then, for a
 * fast move, its DPS and EPS, for a charged one its DPE. Each figure has a fixed place (`data-col`), so the same figure lines up on
 * every row, whichever move it is and whichever it lacks.
 */
const Arena = ({ m, arena, pokemon }: { m: IGameMasterMove; arena: Arena; pokemon?: IGamemasterPokemon | undefined }) => {
	const { t } = useTranslation(['moveDetail', 'pokemonDetail']);
	const fast = m.isFast;
	const pow = arena === 'pve' ? m.pvePower : m.pvpPower;
	const nrg = arena === 'pve' ? m.pveEnergy : m.pvpEnergy;
	const cd = arena === 'pve' ? m.pveCooldown : m.pvpCooldown;
	// fast: PvE cooldown in seconds / PvP duration in turns. charged: PvE animation length only (PvP charged moves have none).
	const cells: Array<{ col: string; label: string; value: string | number }> = [
		{ col: 'dmg', label: t('moveDetail:statLabels.dmg'), value: pow },
		{ col: 'nrg', label: t('moveDetail:statLabels.nrg'), value: fast ? `+${nrg}` : Math.abs(nrg) },
		...(arena === 'pve'
			? [{ col: 'dur', label: t('moveDetail:statLabels.dur'), value: `${cd}s` }]
			: fast
				? [{ col: 'dur', label: t('moveDetail:statLabels.turns'), value: fastMoveTurns(m) }]
				: []),
		...(fast
			? [
					{ col: 'main', label: t('moveDetail:statLabels.dps'), value: moveDPS(m, arena, pokemon).toFixed(1) },
					{ col: 'eps', label: t('moveDetail:statLabels.eps'), value: moveEPS(m, arena).toFixed(1) },
				]
			: [{ col: 'main', label: t('moveDetail:statLabels.dpe'), value: moveDPE(m, arena, pokemon).toFixed(2) }]),
	];
	return (
		<div className='r-mv-arena' data-arena={arena}>
			<u>{arena === 'pve' ? t('pokemonDetail:moves.pve') : t('pokemonDetail:moves.pvp')}</u>
			{cells.map((cell) => (
				<span key={cell.col} className='r-mv-cell' data-col={cell.col}>
					<i>{cell.label}</i>
					<b>{cell.value}</b>
				</span>
			))}
		</div>
	);
};

/** The figures of a move, for each of the arenas asked for. */
export const MoveFigures = ({
	m,
	arenas,
	pokemon,
}: {
	m: IGameMasterMove;
	arenas: ReadonlyArray<Arena>;
	/** When given, the damage figures count this Pokémon's STAB and Shadow bonus. */
	pokemon?: IGamemasterPokemon | undefined;
}) => (
	<div className='r-move-stats'>
		{arenas.map((arena) => (
			<Arena key={arena} m={m} arena={arena} pokemon={pokemon} />
		))}
	</div>
);

/** The stat-stage effects of a charged move (PvP only) as small chips, and the chance it has to happen. */
export const MoveBuffs = ({ m, gl }: { m: IGameMasterMove; gl: GameLanguage }) => {
	const fx = m.isFast ? null : buffInfo(m.buffs, gl);
	if (!fx) return null;
	return (
		<p className='r-move-buff'>
			{fx.badges.map((b) => (
				<span key={b.label} className='r-buff' data-good={b.good ? '' : undefined}>
					<i aria-hidden='true'>{b.dir === 'raise' ? '▲' : '▼'}</i>
					{b.label}
					{b.magnitude > 1 ? ` ×${b.magnitude}` : ''}
				</span>
			))}
			<span className='r-buff-chance'>
				{fx.chanceLabel} <b>{fx.chancePercent}%</b>
			</span>
		</p>
	);
};

/** Full PvE + PvP readout for a move (no attacker context — raw values), and its stat-stage effects. */
export const MoveStatRows = ({ m, gl }: { m: IGameMasterMove; gl: GameLanguage }) => (
	<>
		<MoveFigures m={m} arenas={['pve', 'pvp']} />
		<MoveBuffs m={m} gl={gl} />
	</>
);
