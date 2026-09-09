import { useMemo } from 'react';

import { useLanguage } from '../../../contexts/language-context';
import type { IGamemasterPokemon } from '../../../DTOs/IGamemasterPokemon';
import { useMoves } from '../../../queries/moves';
import { usePokemon } from '../../../queries/pokemon';
import { usePvp } from '../../../queries/pvp';
import { computeDPSEntry } from '../../../utils/pokemon-helper';
import { cleanName } from '../../lib/format';
import { TYPE_LABEL } from '../../lib/types';

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

const LEAGUE_LABEL = ['Great League', 'Ultra League', 'Master League', 'Raids'] as const;

const MoveRow = ({
	moveId,
	kind,
	tags,
	best,
}: {
	moveId: string;
	kind: 'fast' | 'charged';
	tags: Array<string>;
	best?: boolean;
}) => {
	const { currentGameLanguage } = useLanguage();
	const { moves } = useMoves();
	const m = moves[moveId];
	if (!m) return null;
	const type = m.type.toLowerCase();

	const pveStats =
		kind === 'fast'
			? [
					['DMG', m.pvePower],
					['NRG', `+${m.pveEnergy}`],
					['CD', `${m.pveCooldown}s`],
				]
			: [
					['DMG', m.pvePower],
					['NRG', m.pveEnergy],
					['CD', `${m.pveCooldown}s`],
				];
	const pvpStats =
		kind === 'fast'
			? [
					['DMG', m.pvpPower],
					['NRG', `+${m.pvpEnergy}`],
					['TURNS', Math.max(1, Math.round(m.pvpCooldown / 0.5))],
				]
			: [
					['DMG', m.pvpPower],
					['NRG', m.pvpEnergy],
					m.buffs ? ['FX', `${Math.round((m.buffs.buffActivationChance ?? 0) * 100)}%`] : null,
				].filter(Boolean);

	return (
		<div className='r-move' data-best={best ? '' : undefined} style={{ ['--tc' as string]: `var(--t-${type})` }}>
			<div className='r-move-head'>
				<span className='r-move-type'>{TYPE_LABEL[type] ?? m.type}</span>
				<b>{m.moveName[currentGameLanguage] ?? cleanName(moveId)}</b>
				{tags.map((t) => (
					<i key={t} className='r-move-tag'>
						{t}
					</i>
				))}
			</div>
			<div className='r-move-stats'>
				<div>
					<u>PvE</u>
					{pveStats.map(([k, v]) => (
						<span key={k}>
							{k} <b>{v}</b>
						</span>
					))}
				</div>
				<div>
					<u>PvP</u>
					{(pvpStats as Array<[string, string | number]>).map(([k, v]) => (
						<span key={k}>
							{k} <b>{v}</b>
						</span>
					))}
				</div>
			</div>
		</div>
	);
};

const MovesTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { gamemasterPokemon } = usePokemon();
	const { moves, movesFetchCompleted } = useMoves();
	const { rankLists, pvpFetchCompleted } = usePvp();

	const isRaid = league === 3;

	const raidBest = useMemo(() => {
		if (!isRaid || !movesFetchCompleted || Object.keys(moves).length === 0) return null;
		return computeDPSEntry(pokemon, gamemasterPokemon, moves, 15, 100);
	}, [isRaid, pokemon, gamemasterPokemon, moves, movesFetchCompleted]);

	if (!movesFetchCompleted) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	const elite = new Set(pokemon.eliteMoves);
	const legacy = new Set(pokemon.legacyMoves);
	const tagsFor = (id: string) => [elite.has(id) ? 'Elite' : '', legacy.has(id) ? 'Legacy' : ''].filter(Boolean);
	const charged = Array.from(new Set([...pokemon.chargedMoves, ...pokemon.extraChargedMoves]));

	// The single moveset that matters for the league the user is looking at.
	// PvP: [fast, charged1, charged2] from the ranking data. Raids: [fast, charged].
	const pvpMoveset = pvpFetchCompleted ? (rankLists[league]?.[pokemon.speciesId]?.moveset ?? []) : [];
	const bestFast = isRaid ? (raidBest?.fastMove ?? '') : (pvpMoveset[0] ?? '');
	const bestCharged = isRaid ? (raidBest ? [raidBest.chargedMove] : []) : pvpMoveset.slice(1);
	const hasBest = !!bestFast && bestCharged.length > 0;
	const bestSet = new Set([bestFast, ...bestCharged]);

	return (
		<div className='r-movecontent'>
			{hasBest && (
				<>
					<div className='r-section-h'>
						Best {LEAGUE_LABEL[league] ?? 'league'} moveset
						{isRaid && raidBest ? ` · ${round(raidBest.dps)} DPS` : ''}
					</div>
					<div className='r-movelist'>
						<MoveRow moveId={bestFast} kind='fast' tags={tagsFor(bestFast)} best />
						{bestCharged.map((id) => (
							<MoveRow key={id} moveId={id} kind='charged' tags={tagsFor(id)} best />
						))}
					</div>
				</>
			)}

			<div className='r-section-h'>Fast moves</div>
			<div className='r-movelist'>
				{pokemon.fastMoves.map((id) => (
					<MoveRow key={id} moveId={id} kind='fast' tags={tagsFor(id)} best={bestSet.has(id)} />
				))}
			</div>

			<div className='r-section-h'>Charged moves</div>
			<div className='r-movelist'>
				{charged.map((id) => (
					<MoveRow key={id} moveId={id} kind='charged' tags={tagsFor(id)} best={bestSet.has(id)} />
				))}
			</div>
		</div>
	);
};

export default MovesTab;
