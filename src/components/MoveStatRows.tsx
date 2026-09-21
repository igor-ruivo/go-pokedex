import { useTranslation } from 'react-i18next';

import type { GameLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import { type Arena, buffInfo, fastMoveTurns, moveDPE, moveDPS, moveEPS } from '../lib/moves';

/** Full PvE + PvP stat readout for a move (no attacker context — raw values). */
export const MoveStatRows = ({ m, gl }: { m: IGameMasterMove; gl: GameLanguage }) => {
	const { t } = useTranslation(['moveDetail']);
	const kind: 'fast' | 'charged' = m.isFast ? 'fast' : 'charged';

	const row = (arena: Arena) => {
		const pow = arena === 'pve' ? m.pvePower : m.pvpPower;
		const nrg = arena === 'pve' ? m.pveEnergy : m.pvpEnergy;
		const cd = arena === 'pve' ? m.pveCooldown : m.pvpCooldown;
		const base: Array<[string, string | number]> = [
			[t('moveDetail:statLabels.dmg'), pow],
			[t('moveDetail:statLabels.nrg'), kind === 'fast' ? `+${nrg}` : nrg],
			// fast: PvE cooldown in seconds / PvP duration in turns. charged: PvE
			// animation length only — PvP charged moves have no cooldown.
			...(arena === 'pve'
				? ([[t('moveDetail:statLabels.dur'), `${cd}s`]] as Array<[string, string | number]>)
				: kind === 'fast'
					? ([[t('moveDetail:statLabels.turns'), fastMoveTurns(m)]] as Array<[string, string | number]>)
					: []),
		];
		const derived: Array<[string, string | number]> =
			kind === 'fast'
				? [
						[t('moveDetail:statLabels.dps'), moveDPS(m, arena).toFixed(1)],
						[t('moveDetail:statLabels.eps'), moveEPS(m, arena).toFixed(1)],
					]
				: [[t('moveDetail:statLabels.dpe'), moveDPE(m, arena).toFixed(2)]];
		return (
			<div key={arena}>
				<u>{arena === 'pve' ? 'PvE' : 'PvP'}</u>
				{base.map(([k, v]) => (
					<span key={k}>
						{k} <b>{v}</b>
					</span>
				))}
				<span className='r-move-sep' aria-hidden='true' />
				{derived.map(([k, v]) => (
					<span key={k}>
						{k} <b>{v}</b>
					</span>
				))}
			</div>
		);
	};

	const fx = kind === 'charged' ? buffInfo(m.buffs, gl) : null;

	return (
		<>
			<div className='r-move-stats r-move-stats--stack'>
				{row('pve')}
				{row('pvp')}
			</div>
			{fx && (
				<p className='r-move-buff'>
					{fx.badges.map((b, i) => (
						<span key={i}>
							{i > 0 && ' · '}
							{b.label}
							{b.magnitude > 1 ? ` ×${b.magnitude}` : ''}
						</span>
					))}
					{' — '}
					{fx.chanceLabel}: {fx.chancePercent}%
				</p>
			)}
		</>
	);
};
