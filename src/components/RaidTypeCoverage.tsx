import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { cleanName, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { raidRankOf } from '../lib/raid-metric';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';
import { computeDPSEntry } from '../utils/pokemon-helper';

type Combo = { f: string; c: string; dps: number };
export type RaidRecommendation = { fast: string; charged: string; type: string };

/**
 * Raid "type coverage" panel — every attacking type this Pokémon is ranked in,
 * best rank first, each with its top fast+charged combo and a small carousel to
 * cycle the combos. The `.r-raidtypes` list scrolls internally past ~5 rows.
 *
 * Self-contained (own type / combo selection state). Used in the Moves tab's
 * Raids sub-tab; the Ranks tab's raid card renders an equivalent block inline
 * because there it's wired to the leaderboard carousel.
 */
export const RaidTypeCoverage = ({
	pokemon,
	showReadout = true,
	onRecommend,
}: {
	pokemon: IGamemasterPokemon;
	/** Show the rank / DPS / Base-ATK readout above the list. */
	showReadout?: boolean;
	/** Reports the currently-selected type's active fast+charged combo. */
	onRecommend?: (rec: RaidRecommendation | null) => void;
}) => {
	const { t } = useTranslation(['components']);
	const { gamemasterPokemon } = usePokemon();
	const { moves, movesFetchCompleted } = useMoves();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { currentGameLanguage: gl } = useLanguage();
	const { maxLevelIndex } = useBestBuddy();
	const { raidMetric } = useRaidMetric();

	const [typeIdx, setTypeIdx] = useState(0);
	const [comboIdx, setComboIdx] = useState<Record<string, number>>({});
	useEffect(() => {
		setTypeIdx(0);
		setComboIdx({});
	}, [pokemon.speciesId]);

	// every attacking-type list this species is ranked in, best rank first
	// (under whichever figure — DPS/TDO/eDPS — the app is currently ranking by)
	// — `raidDPS` never has a 'normal' entry at all any more (see useRaidRanker:
	// Normal is the only type with zero super-effective matchups against
	// anything, so dex-server doesn't generate that ranking), so no explicit
	// filtering for it is needed here.
	const types = useMemo(
		() =>
			Object.entries(raidDPS)
				.filter(([t]) => t !== '')
				.map(([type, list]) => ({ type, entry: list[pokemon.speciesId] as DPSEntry | undefined }))
				.filter((x): x is { type: string; entry: DPSEntry } => !!x.entry)
				.sort((a, b) => (raidRankOf(a.entry, raidMetric) ?? Infinity) - (raidRankOf(b.entry, raidMetric) ?? Infinity)),
		[raidDPS, pokemon.speciesId, raidMetric]
	);

	// fast+charged combos per attacking type, best DPS first (top 5)
	const comboLists = useMemo(() => {
		const out: Record<string, Array<Combo>> = {};
		if (!movesFetchCompleted || Object.keys(moves).length === 0) return out;
		const charged = [...new Set([...pokemon.chargedMoves, ...(pokemon.extraChargedMoves ?? [])])];
		for (const { type } of types) {
			const tc = charged.filter((id) => moves[id]?.type?.toLowerCase() === type);
			out[type] = pokemon.fastMoves
				.flatMap((f) =>
					tc.map((c) => ({
						f,
						c,
						dps: computeDPSEntry(pokemon, gamemasterPokemon, moves, 15, maxLevelIndex, '', undefined, [f, c]).dps,
					}))
				)
				.sort((a, b) => b.dps - a.dps)
				.slice(0, 5);
		}
		return out;
	}, [types, moves, movesFetchCompleted, gamemasterPokemon, pokemon, maxLevelIndex]);

	const selIdx = types.length ? Math.min(typeIdx, types.length - 1) : 0;
	const rows = useMemo(
		() =>
			types.map(({ type, entry }, i) => {
				const combos = comboLists[type] ?? [];
				const mIdx = Math.min(comboIdx[type] ?? 0, Math.max(0, combos.length - 1));
				return { t: type, e: entry, on: i === selIdx, combos, mIdx, combo: combos[mIdx] as Combo | undefined };
			}),
		[types, comboLists, comboIdx, selIdx]
	);
	const selRow = rows[selIdx];

	const recFast = selRow?.combo?.f;
	const recCharged = selRow?.combo?.c;
	const recType = selRow?.t;
	useEffect(() => {
		if (!onRecommend) return;
		onRecommend(recFast && recCharged && recType ? { fast: recFast, charged: recCharged, type: recType } : null);
	}, [onRecommend, recFast, recCharged, recType]);

	if (!raidDPSFetchCompleted) {
		return (
			<div className='r-loading' style={{ minHeight: '18dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}
	if (types.length === 0) {
		return (
			<p className='r-muted'>
				{t('components:raidTypeCoverage.notRanked', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}
			</p>
		);
	}

	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);
	const elite = new Set(pokemon.eliteMoves);
	const legacy = new Set(pokemon.legacyMoves);
	const moveTag = (id: string) =>
		legacy.has(id)
			? t('components:raidTypeCoverage.legacy')
			: elite.has(id)
				? gameTranslator(moves[id]?.isFast ? GameTranslatorKeys.EliteFastTm : GameTranslatorKeys.EliteChargedTm, gl)
				: null;
	const cycleCombo = (type: string, len: number) =>
		setComboIdx((c) => ({ ...c, [type]: len ? ((c[type] ?? 0) + 1) % len : 0 }));
	const selectType = (i: number) => {
		if (i === selIdx) return;
		// leaving a type resets it back to its best combo
		const left = types[selIdx]?.type;
		setTypeIdx(i);
		if (left) setComboIdx((c) => ({ ...c, [left]: 0 }));
	};

	return (
		<>
			{showReadout && selRow && (
				<div className='r-readout'>
					<div>
						<i>
							{t('components:raidTypeCoverage.typeRank', {
								type: gameTypeDisplayTranslator(selRow.t, gl) || selRow.t,
							})}
						</i>
						<b className='hi'>{ordinal(raidRankOf(selRow.e, raidMetric) ?? 0)}</b>
					</div>
					<div>
						<i>DPS</i>
						<b>{(selRow.combo?.dps ?? selRow.e.dps).toFixed(1)}</b>
					</div>
					<div>
						<i>{t('components:raidTypeCoverage.baseAtk')}</i>
						<b>{pokemon.baseStats.atk}</b>
					</div>
				</div>
			)}

			<div className='r-section-h' style={showReadout ? { marginTop: 16 } : undefined}>
				{t('components:raidTypeCoverage.bestMovesetByType')}
			</div>
			<div className='r-raidtypes'>
				{rows.map(({ t: typeKey, e, on, combos, mIdx, combo }, i) => {
					const activate = () => (on ? cycleCombo(typeKey, combos.length) : selectType(i));
					return (
						<div
							key={typeKey}
							className='r-raidtype'
							role='button'
							tabIndex={0}
							data-active={on ? '' : undefined}
							aria-pressed={on}
							title={
								on ? t('components:raidTypeCoverage.tapNextMoveset') : t('components:raidTypeCoverage.tapSelectType')
							}
							style={{ ['--tc' as string]: `var(--t-${typeKey})` }}
							onClick={activate}
							onKeyDown={(ev) => {
								if (ev.key === 'Enter' || ev.key === ' ') {
									ev.preventDefault();
									activate();
								}
							}}
						>
							<span className='r-raidtype-head'>
								<span className='r-move-type'>{gameTypeDisplayTranslator(typeKey, gl) || typeKey}</span>
								<b>{ordinal(raidRankOf(e, raidMetric) ?? 0)}</b>
								<em>{(combo?.dps ?? e.dps).toFixed(1)} DPS</em>
							</span>
							{combo && (
								<span className='r-raidtype-moves'>
									<span className='r-raidtype-mv'>
										<Link to={R.move(combo.f)} onClick={(ev) => ev.stopPropagation()}>
											{moveName(combo.f)}
										</Link>
										<i>+</i>
										<Link to={R.move(combo.c)} onClick={(ev) => ev.stopPropagation()}>
											{moveName(combo.c)}
										</Link>
									</span>
									{[...new Set([moveTag(combo.f), moveTag(combo.c)])]
										.filter((tg): tg is string => !!tg)
										.map((tg) => (
											<i key={tg} className='r-move-tag r-raidtype-tag'>
												{tg}
											</i>
										))}
									{combos.length > 1 && (
										<span className='r-raidtype-pips' aria-hidden='true'>
											{combos.map((_, j) => (
												<i key={j} data-on={j === mIdx} />
											))}
										</span>
									)}
								</span>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};
