import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { PokeMini } from '../components/PokeMini';
import { useLanguage } from '../contexts/language-context';
import { cleanName } from '../lib/format';
import { type Arena, buffText, fastMoveTurns, moveDPE, moveDPS, moveEPS, moveOwners } from '../lib/moves';
import { TYPE_LABEL } from '../lib/types';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';

const MoveDetail = () => {
	const { moveId = '' } = useParams();
	const { moves, movesFetchCompleted } = useMoves();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists } = usePvp();
	const { raidDPS } = useRaidRanker();
	const { currentGameLanguage: gl } = useLanguage();

	// Shadow forms share their base's movepool, so they'd just be duplicates —
	// hide them, except for Frustration, which only shadows can have.
	const owners = useMemo(() => {
		const keepShadows = moveId === 'FRUSTRATION';
		return moveOwners(moveId, gamemasterPokemon)
			.filter((p) => keepShadows || !p.isShadow)
			.sort((a, b) => a.dex - b.dex || a.speciesId.localeCompare(b.speciesId));
	}, [moveId, gamemasterPokemon]);

	// "Recommended" = the move is part of a Pokémon's best moveset for some PvP
	// league OR the fast/charged of its best combo for any raid attacking type.
	const recommendedFor = useMemo(() => {
		const s = new Set<string>();
		for (const list of rankLists) {
			for (const r of Object.values(list ?? {})) {
				if (r.moveset?.includes(moveId)) s.add(r.speciesId);
			}
		}
		for (const list of Object.values(raidDPS)) {
			for (const e of Object.values(list)) {
				if (e.fastMove === moveId || e.chargedMove === moveId) s.add(e.speciesId);
			}
		}
		return s;
	}, [rankLists, raidDPS, moveId]);

	if (!movesFetchCompleted || !fetchCompleted) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
			</div>
		);
	}
	const m = moves[moveId];
	if (!m) {
		return (
			<div className='r-loading'>
				<p>No move “{moveId}”.</p>
			</div>
		);
	}

	const kind: 'fast' | 'charged' = m.isFast ? 'fast' : 'charged';
	const type = m.type.toLowerCase();
	const eliteCount = owners.filter((p) => p.eliteMoves.includes(moveId)).length;
	const legacyCount = owners.filter((p) => p.legacyMoves.includes(moveId)).length;
	const megaCount = owners.filter((p) => p.isMega).length;

	const recommended = owners.filter((p) => recommendedFor.has(p.speciesId));
	const others = owners.filter((p) => !recommendedFor.has(p.speciesId));

	const name = m.moveName[gl] ?? cleanName(moveId);
	const fx = kind === 'charged' ? buffText(m.buffs) : null;

	const statsFor = (a: Arena): Array<[string, string]> => {
		const pow = a === 'pve' ? m.pvePower : m.pvpPower;
		const nrg = a === 'pve' ? m.pveEnergy : m.pvpEnergy;
		const cd = a === 'pve' ? m.pveCooldown : m.pvpCooldown;
		const out: Array<[string, string]> = [
			['DMG', String(pow)],
			['NRG', kind === 'fast' ? `+${nrg}` : String(nrg)],
		];
		if (a === 'pve') out.push(['DUR.', `${cd}s`]);
		else if (kind === 'fast') out.push(['Turns', String(fastMoveTurns(m))]);
		if (kind === 'fast') {
			out.push(['DPS', moveDPS(m, a).toFixed(1)], ['EPS', moveEPS(m, a).toFixed(1)]);
		} else {
			out.push(['DPE', moveDPE(m, a).toFixed(2)]);
		}
		return out;
	};

	return (
		<div className='r-shell'>
			<header
				className='r-hero r-move-hero'
				style={{ ['--tc' as string]: `var(--t-${type})`, ['--accent' as string]: `var(--t-${type})` }}
			>
				<div className='r-move-hero-badges'>
					<span className='r-move-type'>{TYPE_LABEL[type] ?? m.type}</span>
					<span className='r-chip'>{kind === 'fast' ? 'Fast move' : 'Charged move'}</span>
					{m.isSuperMega && <span className='r-chip'>Super Mega</span>}
				</div>
				<h1 className='r-name'>{m.moveName[gl] ?? cleanName(moveId)}</h1>
			</header>

			<div className='r-section-h'>Stats</div>
			<div className='r-card' style={{ ['--tc' as string]: `var(--t-${type})` }}>
				<div className='r-mstat'>
					{(['pve', 'pvp'] as const).map((a) => (
						<div className='r-mstat-col' key={a}>
							<span className='r-mstat-arena'>{a === 'pve' ? 'PvE · Raids & Gyms' : 'PvP · Leagues'}</span>
							<div className='r-mstat-tiles'>
								{statsFor(a).map(([label, value]) => (
									<div className='r-mstat-tile' key={label}>
										<b>{value}</b>
										<i>{label}</i>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
				{fx && <p className='r-mstat-buff'>{fx}</p>}
			</div>

			<div className='r-section-h'>Usage</div>
			<div className='r-card'>
				<div className='r-usage'>
					<div className='r-usage-lead'>
						<b>{owners.length.toLocaleString()}</b>
						<i>Pokémon can learn {name}</i>
					</div>
					<div className='r-usage-tiles'>
						<div className='r-usage-tile' data-hi=''>
							<b>{recommended.length.toLocaleString()}</b>
							<i>Recommended</i>
						</div>
						<div className='r-usage-tile'>
							<b>{megaCount}</b>
							<i>Mega</i>
						</div>
						<div className='r-usage-tile'>
							<b>{eliteCount}</b>
							<i>Elite move</i>
						</div>
						<div className='r-usage-tile'>
							<b>{legacyCount}</b>
							<i>Legacy move</i>
						</div>
					</div>
				</div>
			</div>

			{recommended.length > 0 && (
				<>
					<div className='r-section-h'>Recommended</div>
					<div className='r-minigrid r-minigrid--fill'>
						{recommended.map((p) => (
							<PokeMini key={p.speciesId} speciesId={p.speciesId} />
						))}
					</div>
				</>
			)}

			<div className='r-section-h'>{recommended.length > 0 ? 'Also learned by' : 'Learned by'}</div>
			<div className='r-minigrid r-minigrid--fill'>
				{others.map((p) => (
					<PokeMini key={p.speciesId} speciesId={p.speciesId} />
				))}
			</div>
			{owners.length === 0 && <p className='r-muted'>No Pokémon learns this move.</p>}
		</div>
	);
};

export default MoveDetail;
