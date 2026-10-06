import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { MoveBuffs, MoveFigures, MoveHead } from '../../components/MoveStatRows';
import { type RaidRecommendation, RaidTypeCoverage } from '../../components/RaidTypeCoverage';
import { useLanguage } from '../../contexts/language-context';
import type { ActiveLeague } from '../../DTOs/IActiveLeague';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { baseMoveId, baseMoveIds, withGenericHiddenPower } from '../../lib/hidden-power';
import { type Arena, moveDPE, moveDPS, moveEPS } from '../../lib/moves';
import { R } from '../../lib/nav';
import { useMoves } from '../../queries/moves';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';

const EPS = 1e-9;

const MoveRow = ({
	pokemon,
	moveId,
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
	const { t } = useTranslation(['pokemonDetail']);
	const { currentGameLanguage } = useLanguage();
	const { moves: rawMoves } = useMoves();
	const moves = useMemo(() => withGenericHiddenPower(rawMoves), [rawMoves]);
	const m = moves[moveId];
	if (!m) return null;
	const type = m.type.toLowerCase();

	return (
		<Link
			to={R.move(moveId)}
			className='r-move r-move--link'
			data-best={best ? '' : undefined}
			style={{ ['--tc' as string]: `var(--t-${type})` }}
		>
			<MoveHead
				m={m}
				moveId={moveId}
				gl={currentGameLanguage}
				chips={
					<>
						{recommended && <i className='r-move-tag r-move-tag--rec'>{t('pokemonDetail:moves.recommended')}</i>}
						{tags.map((tag) => (
							<i key={tag} className='r-move-tag'>
								{tag}
							</i>
						))}
					</>
				}
			/>
			<MoveFigures m={m} arenas={[arena]} pokemon={pokemon} />
			{/* stat-stage buffs are a PvP-only mechanic */}
			{arena === 'pvp' && <MoveBuffs m={m} gl={currentGameLanguage} />}
		</Link>
	);
};

const MovesTab = ({ pokemon, activeLeague }: { pokemon: IGamemasterPokemon; activeLeague: ActiveLeague }) => {
	const { t } = useTranslation(['pokemonDetail']);
	const { moves: rawMoves, movesFetchCompleted } = useMoves();
	// Hidden Power once, not once per type: the Pokémon's own moves and the recommendation are read through `baseMoveId`
	const moves = useMemo(() => withGenericHiddenPower(rawMoves), [rawMoves]);
	const { currentGameLanguage } = useLanguage();

	const isRaid = activeLeague.isRaid;
	const arena: Arena = isRaid ? 'pve' : 'pvp';
	const [raidRec, setRaidRec] = useState<RaidRecommendation | null>(null);

	if (!movesFetchCompleted) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	const elite = new Set(baseMoveIds(pokemon.eliteMoves));
	const legacy = new Set(baseMoveIds(pokemon.legacyMoves));
	const tagsFor = (id: string) =>
		[elite.has(id) ? t('pokemonDetail:moves.elite') : '', legacy.has(id) ? t('pokemonDetail:moves.legacy') : ''].filter(
			Boolean
		);
	const charged = baseMoveIds([...pokemon.chargedMoves, ...pokemon.extraChargedMoves]);

	// Moveset recommended for the league the user is looking at.
	// PvP: [fast, charged1, charged2] from the ranking data. Raids: the selected
	// type's active combo, reported up by <RaidTypeCoverage>.
	const pvpMoveset = (activeLeague.rankList[pokemon.speciesId]?.moveset ?? []).map(baseMoveId);
	const recFast = isRaid ? baseMoveId(raidRec?.fast ?? '') : (pvpMoveset[0] ?? '');
	const recCharged = isRaid ? (raidRec ? [baseMoveId(raidRec.charged)] : []) : pvpMoveset.slice(1);
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

	const fastSorted = baseMoveIds(pokemon.fastMoves).sort(fastCmp);
	const chargedSorted = [...charged].sort(chargedCmp);

	return (
		<div className='r-movecontent'>
			{isRaid ? (
				<RaidTypeCoverage pokemon={pokemon} showReadout={false} onRecommend={setRaidRec} />
			) : (
				<>
					<div className='r-section-h'>
						{t('pokemonDetail:moves.bestMoveset', {
							league: activeLeague.title,
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
								league: activeLeague.title,
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
