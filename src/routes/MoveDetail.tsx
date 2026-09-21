import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { PokeMini } from '../components/PokeMini';
import { useLanguage } from '../contexts/language-context';
import { cleanName, sentenceCase } from '../lib/format';
import { type Arena, buffInfo, fastMoveTurns, moveDPE, moveDPS, moveEPS, moveOwners } from '../lib/moves';
import { sortByCalendarRelevance, useRelevanceSets } from '../lib/relevance';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';

/** Small inline placeholder for the Recommended/Also-learned-by grids while
 *  they're still waiting on relevance data — same treatment as Calendar's
 *  own copy of this (not the page-level spinner, which is far too tall for
 *  a single section, and not just skipping straight to the family-line
 *  fallback order, which would render once then visibly jump). */
const MiniGridLoading = () => (
	<div className='r-minigrid-loading'>
		<div className='r-spinner r-spinner--sm' />
	</div>
);

const MoveDetail = () => {
	const { t } = useTranslation(['moveDetail']);
	const { moveId = '' } = useParams();
	const { moves, movesFetchCompleted } = useMoves();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists } = usePvp();
	const { raidDPS } = useRaidRanker();
	const { currentGameLanguage: gl } = useLanguage();
	const relevanceSets = useRelevanceSets();

	// Shadow forms share their base's movepool, so they'd just be duplicates —
	// hide them, except for Frustration, which only shadows can have. Ordered
	// the same way Calendar's own subtabs order their chips: most PvP/raid
	// relevant first, then — on a tie — each evolution family's own line
	// order (base stage first), falling back to dex/name from there.
	const owners = useMemo(() => {
		const keepShadows = moveId === 'FRUSTRATION';
		const filtered = moveOwners(moveId, gamemasterPokemon).filter((p) => keepShadows || !p.isShadow);
		return sortByCalendarRelevance(filtered, (p) => p.speciesId, gamemasterPokemon, relevanceSets);
	}, [moveId, gamemasterPokemon, relevanceSets]);

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
				<p>{t('moveDetail:notFound', { moveId })}</p>
			</div>
		);
	}

	const kind: 'fast' | 'charged' = m.isFast ? 'fast' : 'charged';
	const type = m.type.toLowerCase();
	// `owners` is already in relevance order (see its own useMemo above) —
	// filtering it preserves that order, no separate sort needed here.
	const eliteOwners = owners.filter((p) => p.eliteMoves.includes(moveId));
	const legacyOwners = owners.filter((p) => p.legacyMoves.includes(moveId));
	const eliteCount = eliteOwners.length;
	const legacyCount = legacyOwners.length;
	const megaCount = owners.filter((p) => p.isMega).length;

	const recommended = owners.filter((p) => recommendedFor.has(p.speciesId));
	const others = owners.filter((p) => !recommendedFor.has(p.speciesId));

	const name = m.moveName[gl] ?? cleanName(moveId);
	const fx = kind === 'charged' ? buffInfo(m.buffs, gl) : null;

	const statsFor = (a: Arena): Array<[string, string]> => {
		const pow = a === 'pve' ? m.pvePower : m.pvpPower;
		const nrg = a === 'pve' ? m.pveEnergy : m.pvpEnergy;
		const cd = a === 'pve' ? m.pveCooldown : m.pvpCooldown;
		const out: Array<[string, string]> = [
			[t('moveDetail:statLabels.dmg'), String(pow)],
			[t('moveDetail:statLabels.nrg'), kind === 'fast' ? `+${nrg}` : String(nrg)],
		];
		if (a === 'pve') out.push([t('moveDetail:statLabels.dur'), `${cd}s`]);
		else if (kind === 'fast') out.push([t('moveDetail:statLabels.turns'), String(fastMoveTurns(m))]);
		if (kind === 'fast') {
			out.push(
				[t('moveDetail:statLabels.dps'), moveDPS(m, a).toFixed(1)],
				[t('moveDetail:statLabels.eps'), moveEPS(m, a).toFixed(1)]
			);
		} else {
			out.push([t('moveDetail:statLabels.dpe'), moveDPE(m, a).toFixed(2)]);
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
					<span className='r-move-type'>{gameTypeDisplayTranslator(type, gl) || m.type}</span>
					<span className='r-chip'>
						{gameTranslator(
							kind === 'fast' ? GameTranslatorKeys.FastAttackHeader : GameTranslatorKeys.ChargedAttackHeader,
							gl
						)}
					</span>
					{m.isSuperMega && <span className='r-chip'>{t('moveDetail:superMega')}</span>}
				</div>
				<h1 className='r-name'>{m.moveName[gl] ?? cleanName(moveId)}</h1>
			</header>

			<div className='r-section-h'>{t('moveDetail:sections.stats')}</div>
			<div className='r-card' style={{ ['--tc' as string]: `var(--t-${type})` }}>
				<div className='r-mstat'>
					{(['pve', 'pvp'] as const).map((a) => (
						<div className='r-mstat-col' key={a}>
							<span className='r-mstat-arena'>
								{a === 'pve'
									? t('moveDetail:arena.pve', {
											raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
										})
									: t('moveDetail:arena.pvp')}
							</span>
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
				{fx && (
					<p className='r-mstat-buff'>
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
			</div>

			<div className='r-section-h'>{t('moveDetail:sections.usage')}</div>
			<div className='r-card'>
				<div className='r-usage'>
					<div className='r-usage-lead'>
						<b>{owners.length.toLocaleString()}</b>
						<i>{t('moveDetail:usageLead', { name })}</i>
					</div>
					<div className='r-usage-tiles'>
						<div className='r-usage-tile' data-hi=''>
							<b>{relevanceSets.ready ? recommended.length.toLocaleString() : '…'}</b>
							<i>{t('moveDetail:tiles.recommended')}</i>
						</div>
						<div className='r-usage-tile'>
							<b>{megaCount}</b>
							<i>{gameTranslator(GameTranslatorKeys.MegaDisplay, gl)}</i>
						</div>
						<div className='r-usage-tile'>
							<b>{eliteCount}</b>
							<i>
								{gameTranslator(
									kind === 'fast' ? GameTranslatorKeys.EliteFastTm : GameTranslatorKeys.EliteChargedTm,
									gl
								)}
							</i>
						</div>
						<div className='r-usage-tile'>
							<b>{legacyCount}</b>
							<i>{t('moveDetail:tiles.legacy')}</i>
						</div>
					</div>
				</div>
			</div>

			{!relevanceSets.ready ? (
				<>
					<div className='r-section-h'>{t('moveDetail:sections.recommended')}</div>
					<MiniGridLoading />
					<div className='r-section-h'>{t('moveDetail:sections.alsoLearnedBy')}</div>
					<MiniGridLoading />
					<div className='r-section-h'>{t('moveDetail:sections.eliteFor')}</div>
					<MiniGridLoading />
					<div className='r-section-h'>{t('moveDetail:sections.legacyFor')}</div>
					<MiniGridLoading />
				</>
			) : (
				<>
					{recommended.length > 0 && (
						<>
							<div className='r-section-h'>{t('moveDetail:sections.recommended')}</div>
							<div className='r-minigrid r-minigrid--fill'>
								{recommended.map((p) => (
									<PokeMini key={p.speciesId} speciesId={p.speciesId} />
								))}
							</div>
						</>
					)}

					<div className='r-section-h'>
						{t(recommended.length > 0 ? 'moveDetail:sections.alsoLearnedBy' : 'moveDetail:sections.learnedBy')}
					</div>
					<div className='r-minigrid r-minigrid--fill'>
						{others.map((p) => (
							<PokeMini key={p.speciesId} speciesId={p.speciesId} />
						))}
					</div>

					{eliteOwners.length > 0 && (
						<>
							<div className='r-section-h'>{t('moveDetail:sections.eliteFor')}</div>
							<div className='r-minigrid r-minigrid--fill'>
								{eliteOwners.map((p) => (
									<PokeMini key={p.speciesId} speciesId={p.speciesId} />
								))}
							</div>
						</>
					)}

					{legacyOwners.length > 0 && (
						<>
							<div className='r-section-h'>{t('moveDetail:sections.legacyFor')}</div>
							<div className='r-minigrid r-minigrid--fill'>
								{legacyOwners.map((p) => (
									<PokeMini key={p.speciesId} speciesId={p.speciesId} />
								))}
							</div>
						</>
					)}
				</>
			)}
			{owners.length === 0 && <p className='r-muted'>{t('moveDetail:noneLearn')}</p>}
		</div>
	);
};

export default MoveDetail;
