import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { type RaidRecommendation, RaidTypeCoverage } from '../../components/RaidTypeCoverage';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { type Arena, buffInfo, fastMoveTurns, moveDPE, moveDPS, moveEPS } from '../../lib/moves';
import { R } from '../../lib/nav';
import { useMoves } from '../../queries/moves';
import { usePvp } from '../../queries/pvp';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../../utils/GameTranslator';

const EPS = 1e-9;

const MoveRow = ({
	pokemon,
	moveId,
	kind,
	arena,
	tags,
	best,
	recommended,
}: {
	pokemon: IGamemasterPokemon;
	moveId: string;
	kind: 'fast' | 'charged';
	/** Which stat set to show — PvP for a battle league, PvE for raids. */
	arena: Arena;
	tags: Array<string>;
	best?: boolean;
	recommended?: boolean;
}) => {
	const { t } = useTranslation(['pokemonDetail', 'moveDetail']);
	const { currentGameLanguage } = useLanguage();
	const { moves } = useMoves();
	const m = moves[moveId];
	if (!m) return null;
	const type = m.type.toLowerCase();

	const pow = arena === 'pve' ? m.pvePower : m.pvpPower;
	const nrg = arena === 'pve' ? m.pveEnergy : m.pvpEnergy;
	const cd = arena === 'pve' ? m.pveCooldown : m.pvpCooldown;

	const base: Array<[string, string | number]> = [
		[t('moveDetail:statLabels.dmg'), pow],
		[t('moveDetail:statLabels.nrg'), kind === 'fast' ? `+${nrg}` : nrg],
		...(arena === 'pve'
			? ([[t('moveDetail:statLabels.dur'), `${cd}s`]] as Array<[string, string | number]>)
			: kind === 'fast'
				? ([[t('moveDetail:statLabels.turns'), fastMoveTurns(m)]] as Array<[string, string | number]>)
				: []),
	];
	const derived: Array<[string, string | number]> =
		kind === 'fast'
			? [
					[t('moveDetail:statLabels.dps'), moveDPS(m, arena, pokemon).toFixed(1)],
					[t('moveDetail:statLabels.eps'), moveEPS(m, arena).toFixed(1)],
				]
			: [[t('moveDetail:statLabels.dpe'), moveDPE(m, arena, pokemon).toFixed(2)]];
	// stat-stage buffs are a PvP-only mechanic
	const fx = arena === 'pvp' && kind === 'charged' ? buffInfo(m.buffs, currentGameLanguage) : null;

	return (
		<Link
			to={R.move(moveId)}
			className='r-move r-move--link'
			data-best={best ? '' : undefined}
			style={{ ['--tc' as string]: `var(--t-${type})` }}
		>
			<div className='r-move-head'>
				<span className='r-move-type'>{gameTypeDisplayTranslator(type, currentGameLanguage) || m.type}</span>
				<b>{m.moveName[currentGameLanguage] ?? cleanName(moveId)}</b>
				{recommended && <i className='r-move-tag r-move-tag--rec'>{t('pokemonDetail:moves.recommended')}</i>}
				{tags.map((t) => (
					<i key={t} className='r-move-tag'>
						{t}
					</i>
				))}
			</div>
			<div className='r-move-stats'>
				<div>
					<u>{arena === 'pve' ? t('pokemonDetail:moves.pve') : t('pokemonDetail:moves.pvp')}</u>
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
		</Link>
	);
};

const MovesTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { t } = useTranslation(['pokemonDetail']);
	const { moves, movesFetchCompleted } = useMoves();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { currentGameLanguage } = useLanguage();

	// League names track the player's in-game language (`GameLanguage`), not
	// the website UI's — same reasoning as every other GameTranslator use.
	const LEAGUE_LABEL = [
		gameTranslator(GameTranslatorKeys.GreatLeagueLong, currentGameLanguage),
		gameTranslator(GameTranslatorKeys.UltraLeagueLong, currentGameLanguage),
		gameTranslator(GameTranslatorKeys.MasterLeagueLong, currentGameLanguage),
		gameTranslator(GameTranslatorKeys.RaidDisplay, currentGameLanguage),
	];

	const isRaid = league === 3;
	const arena: Arena = isRaid ? 'pve' : 'pvp';
	const [raidRec, setRaidRec] = useState<RaidRecommendation | null>(null);

	if (!movesFetchCompleted) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	const elite = new Set(pokemon.eliteMoves);
	const legacy = new Set(pokemon.legacyMoves);
	const tagsFor = (id: string) =>
		[elite.has(id) ? t('pokemonDetail:moves.elite') : '', legacy.has(id) ? t('pokemonDetail:moves.legacy') : ''].filter(
			Boolean
		);
	const charged = Array.from(new Set([...pokemon.chargedMoves, ...pokemon.extraChargedMoves]));

	// Moveset recommended for the league the user is looking at.
	// PvP: [fast, charged1, charged2] from the ranking data. Raids: the selected
	// type's active combo, reported up by <RaidTypeCoverage>.
	const pvpMoveset = pvpFetchCompleted ? (rankLists[league]?.[pokemon.speciesId]?.moveset ?? []) : [];
	const recFast = isRaid ? (raidRec?.fast ?? '') : (pvpMoveset[0] ?? '');
	const recCharged = isRaid ? (raidRec ? [raidRec.charged] : []) : pvpMoveset.slice(1);
	const hasBest = !isRaid && !!recFast && recCharged.length > 0;
	const recSet = new Set([recFast, ...recCharged].filter(Boolean));

	const name = (id: string) => moves[id]?.moveName[currentGameLanguage] ?? id;
	const byTypeThenName = (a: string, b: string) =>
		(moves[a]?.type ?? '').localeCompare(moves[b]?.type ?? '') || name(a).localeCompare(name(b));

	// Fast: recommended → EPS → DPS → type → name.
	const fastCmp = (a: string, b: string) => {
		const rec = (recSet.has(a) ? 0 : 1) - (recSet.has(b) ? 0 : 1);
		if (rec) return rec;
		const ma = moves[a];
		const mb = moves[b];
		if (!ma || !mb) return 0;
		const eps = moveEPS(mb, arena) - moveEPS(ma, arena);
		if (Math.abs(eps) > EPS) return eps;
		const dps = moveDPS(mb, arena, pokemon) - moveDPS(ma, arena, pokemon);
		if (Math.abs(dps) > EPS) return dps;
		return byTypeThenName(a, b);
	};

	// Charged: recommended → (legacies sink to the bottom) → DPE → elites → type → name.
	const chargedCmp = (a: string, b: string) => {
		const rec = (recSet.has(a) ? 0 : 1) - (recSet.has(b) ? 0 : 1);
		if (rec) return rec;
		const leg = (legacy.has(a) ? 1 : 0) - (legacy.has(b) ? 1 : 0);
		if (leg) return leg;
		const ma = moves[a];
		const mb = moves[b];
		if (!ma || !mb) return 0;
		const dpe = moveDPE(mb, arena, pokemon) - moveDPE(ma, arena, pokemon);
		if (Math.abs(dpe) > EPS) return dpe;
		const el = (elite.has(a) ? 0 : 1) - (elite.has(b) ? 0 : 1);
		if (el) return el;
		return byTypeThenName(a, b);
	};

	const fastSorted = [...pokemon.fastMoves].sort(fastCmp);
	const chargedSorted = [...charged].sort(chargedCmp);

	return (
		<div className='r-movecontent'>
			{isRaid ? (
				<RaidTypeCoverage pokemon={pokemon} showReadout={false} onRecommend={setRaidRec} />
			) : (
				<>
					<div className='r-section-h'>
						{t('pokemonDetail:moves.bestMoveset', {
							league: LEAGUE_LABEL[league],
						})}
					</div>
					{hasBest ? (
						<div className='r-movelist'>
							<MoveRow pokemon={pokemon} moveId={recFast} kind='fast' arena={arena} tags={tagsFor(recFast)} best />
							{recCharged.map((id) => (
								<MoveRow key={id} pokemon={pokemon} moveId={id} kind='charged' arena={arena} tags={tagsFor(id)} best />
							))}
						</div>
					) : (
						<p className='r-moves-unranked'>
							{t('pokemonDetail:moves.unrankedForLeague', {
								name: cleanName(pokemon.speciesName),
								league: LEAGUE_LABEL[league],
							})}
						</p>
					)}
				</>
			)}

			<div className='r-section-h r-section-h--big'>
				{t('pokemonDetail:moves.allMovesCanLearn', { name: cleanName(pokemon.speciesName) })}
			</div>
			<div className='r-section-h'>
				{gameTranslator(GameTranslatorKeys.FastAttackHeaderPlural, currentGameLanguage)}
			</div>
			<div className='r-movelist r-movelist--scroll'>
				{fastSorted.map((id) => (
					<MoveRow
						key={id}
						pokemon={pokemon}
						moveId={id}
						kind='fast'
						arena={arena}
						tags={tagsFor(id)}
						recommended={recSet.has(id)}
					/>
				))}
			</div>

			<div className='r-section-h'>
				{gameTranslator(GameTranslatorKeys.ChargedAttackHeaderPlural, currentGameLanguage)}
			</div>
			<div className='r-movelist r-movelist--scroll'>
				{chargedSorted.map((id) => (
					<MoveRow
						key={id}
						pokemon={pokemon}
						moveId={id}
						kind='charged'
						arena={arena}
						tags={tagsFor(id)}
						recommended={recSet.has(id)}
					/>
				))}
			</div>
		</div>
	);
};

export default MovesTab;
