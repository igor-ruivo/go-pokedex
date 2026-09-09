import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import { type Arena, buffText, fastMoveTurns, moveDPE, moveDPS, moveEPS } from '../lib/moves';

/** Full PvE + PvP stat readout for a move (no attacker context — raw values). */
export const MoveStatRows = ({ m }: { m: IGameMasterMove }) => {
	const kind: 'fast' | 'charged' = m.isFast ? 'fast' : 'charged';

	const row = (arena: Arena) => {
		const pow = arena === 'pve' ? m.pvePower : m.pvpPower;
		const nrg = arena === 'pve' ? m.pveEnergy : m.pvpEnergy;
		const cd = arena === 'pve' ? m.pveCooldown : m.pvpCooldown;
		const base: Array<[string, string | number]> = [
			['DMG', pow],
			['NRG', kind === 'fast' ? `+${nrg}` : nrg],
			// fast: PvE cooldown in seconds / PvP duration in turns. charged: PvE
			// animation length only — PvP charged moves have no cooldown.
			...(arena === 'pve'
				? ([['CD', `${cd}s`]] as Array<[string, string | number]>)
				: kind === 'fast'
					? ([['TURNS', fastMoveTurns(m)]] as Array<[string, string | number]>)
					: []),
		];
		const derived: Array<[string, string | number]> =
			kind === 'fast'
				? [
						['DPS', moveDPS(m, arena).toFixed(1)],
						['EPS', moveEPS(m, arena).toFixed(1)],
					]
				: [['DPE', moveDPE(m, arena).toFixed(2)]];
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

	const fx = kind === 'charged' ? buffText(m.buffs) : null;

	return (
		<>
			<div className='r-move-stats r-move-stats--stack'>
				{row('pve')}
				{row('pvp')}
			</div>
			{fx && <p className='r-move-buff'>{fx}</p>}
		</>
	);
};
