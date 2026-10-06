import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BuddyMark, SuperMegaMark } from '../../components/BuddyMark';
import { SearchListBar } from '../../components/SearchListBar';
import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { SpriteImg } from '../../components/Sprite';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDismiss } from '../../hooks/useDismiss';
import { isDuplicateBuild } from '../../lib/canonical-slot';
import { cleanName } from '../../lib/format';
import { bestIvsFor, LEAGUE_CP } from '../../lib/league-caps';
import { removeCollectionPokemon, saveCollectionPokemon, usePokemonCollection } from '../../lib/pokemon-collection';
import {
	isBuddy,
	MAX_MOVES,
	scoreTier,
	slotIdentityKey,
	type SlotIvs,
	teamScore,
	type TeamSlotDescriptor,
	threatPart,
	withMove,
} from '../../lib/team-analysis';
import { type BuildChange, nicknamesByBuild } from '../../lib/team-build';
import { buildCombinations, buildComboPool, comboSlots } from '../../lib/team-combinations';
import { chipMarks } from '../../lib/team-marks';
import {
	canonicalCombinations,
	rankingSignature as rankingSignatureOf,
	readRankedCache,
	writeRankedCache,
} from '../../lib/team-rank-cache';
import { typeVar } from '../../lib/types';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { VirtualTeamCards } from './TeamCards';
import { SlotPicker, TeamMemberEditor } from './TeamStage';
import { analyzeTeam } from './useTeamAnalysis';
import { type TeamsData, useSimContext, useTeamEvaluations } from './useTeamsData';

const GRID_GAP = 8;
const MINI_TILE_MAX_SIZE = 86;
const AUTO_EVALUATION_LIMIT = 10;

export const PokemonCollection = ({
	league,
	leagueLabel,
	data,
	onOpen,
}: {
	league: TeamLeague;
	leagueLabel: string;
	data: TeamsData;
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams', 'components', 'common']);
	const { currentGameLanguage: gameLanguage } = useLanguage();
	const allSaved = usePokemonCollection();
	const saved = useMemo(
		() =>
			allSaved
				.filter((entry) => entry.league === league && data.gamemaster[entry.speciesId])
				.sort((a, b) => a.addedAt - b.addedAt),
		[allSaved, league, data.gamemaster]
	);
	const [draft, setDraft] = useState<{ slot: TeamSlotDescriptor; entryId?: string; nickname?: string } | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
	const [search, setSearch] = useState('');
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');
	const [requestedEvaluationKey, setRequestedEvaluationKey] = useState<string | null>(null);
	const [gridSize, setGridSize] = useState({ cols: 4, rowHeight: 96, measured: false });
	const [scrollMargin, setScrollMargin] = useState(0);
	const gridRef = useRef<HTMLDivElement>(null);
	const ctx = useSimContext(league, data);
	const removeDialogRef = useDismiss<HTMLDivElement>(!!removeTarget, () => setRemoveTarget(null));

	useLayoutEffect(() => {
		const el = gridRef.current;
		if (!el) return;
		const measure = () => {
			const width = el.clientWidth;
			if (width) {
				const minTileSize = Math.min((width - 3 * GRID_GAP) / 4, MINI_TILE_MAX_SIZE);
				const cols = Math.max(4, Math.floor((width + GRID_GAP) / (minTileSize + GRID_GAP)));
				const rowHeight = Math.ceil((width - (cols - 1) * GRID_GAP) / cols);
				setGridSize((prev) =>
					prev.cols === cols && prev.rowHeight === rowHeight && prev.measured
						? prev
						: { cols, rowHeight, measured: true }
				);
			}
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const gridItems = useMemo(() => [null, ...saved], [saved]);
	useLayoutEffect(() => {
		setScrollMargin(gridRef.current?.offsetTop ?? 0);
	}, [draft, gridSize.cols, saved.length]);

	const gridVirtualizer = useWindowVirtualizer({
		count: Math.ceil(gridItems.length / gridSize.cols),
		estimateSize: () => gridSize.rowHeight,
		overscan: 6,
		gap: GRID_GAP,
		scrollMargin,
	});
	useLayoutEffect(() => {
		gridVirtualizer.measure();
	}, [gridSize.rowHeight, gridVirtualizer]);

	const draftMember = useMemo(
		() => (draft && ctx ? analyzeTeam(league, ctx, data, [draft.slot])?.members[0] : undefined),
		[draft, ctx, data, league]
	);
	const savedCp = useMemo(
		() =>
			Object.fromEntries(
				saved.flatMap((entry) => {
					const slot: TeamSlotDescriptor = {
						speciesId: entry.speciesId,
						moveset: entry.moveset,
						...(entry.ivs ? { ivs: entry.ivs } : {}),
						...(entry.level !== undefined ? { level: entry.level } : {}),
						...(entry.buddy ? { buddy: true as const } : {}),
						...(entry.superMega ? { superMega: true as const } : {}),
					};
					const member = ctx ? analyzeTeam(league, ctx, data, [slot])?.members[0] : undefined;
					return member ? [[entry.id, member.stats.cp]] : [];
				})
			),
		[saved, ctx, data, league]
	);
	const combinations = useMemo(() => {
		const slots = buildComboPool(saved, league, data);
		return buildCombinations(slots, data);
	}, [saved, data, league]);
	const rankingSignature = useMemo(
		() =>
			rankingSignatureOf({
				league,
				combinations,
				rankList: data.rankList,
				gamemaster: data.gamemaster,
				builder: data.builder,
			}),
		[league, combinations, data.rankList, data.gamemaster, data.builder]
	);
	const cachedRankedTeams = data.ready ? readRankedCache(league, rankingSignature) : undefined;
	// what the manual evaluation was asked for: the combinations, the Charged Moves in a fixed order (rearranging them is no change)
	const evaluationKey = useMemo(() => JSON.stringify(canonicalCombinations(combinations)), [combinations]);
	const requiresManualEvaluation = saved.length > AUTO_EVALUATION_LIMIT && combinations.length > 0;
	const evaluationRequested =
		cachedRankedTeams === undefined && (!requiresManualEvaluation || requestedEvaluationKey === evaluationKey);
	const evaluations = useTeamEvaluations(league, data, evaluationRequested ? combinations : []);
	const evaluationScores = evaluations.map((result) => result.data?.threatScore ?? null);
	const evaluationScoresKey = JSON.stringify(evaluationScores);
	const computedRankingReady =
		evaluationRequested &&
		data.ready &&
		evaluations.length === combinations.length &&
		evaluations.every((result) => result.data !== undefined && !result.isFetching);
	const rankedTeams = useMemo(() => {
		if (!ctx || !computedRankingReady) return cachedRankedTeams ?? [];
		const threatScores = JSON.parse(evaluationScoresKey) as Array<number | null>;
		return combinations
			.flatMap((members, index): Array<RankedTeam> => {
				const threatScore = threatScores[index];
				const analysis = threatScore !== null ? analyzeTeam(league, ctx, data, members) : undefined;
				if (threatScore === null || !analysis) return [];
				const score = teamScore({
					threat: threatPart(threatScore),
					defense: analysis.defense.score,
					offense: analysis.offense.score,
					bulk: analysis.grades.bulk.part,
					safety: analysis.grades.safety.part,
					consistency: analysis.grades.consistency.part,
				});
				if (score === undefined) return [];
				const order = analysis.roles
					? [analysis.roles.order.lead, analysis.roles.order.switch, analysis.roles.order.closer]
					: [0, 1, 2];
				return [
					{
						members: order.map((memberIndex) => {
							const member = members[memberIndex];
							return {
								speciesId: member.speciesId,
								moveset: [...member.moveset],
								...(member.ivs ? { ivs: [...member.ivs] as SlotIvs } : {}),
								...(member.level !== undefined ? { level: member.level } : {}),
								...(member.buddy ? { buddy: true as const } : {}),
								...(member.superMega ? { superMega: true as const } : {}),
								...(member.formerBuddy ? { formerBuddy: true as const } : {}),
								...(member.formerSuperMega ? { formerSuperMega: true as const } : {}),
							};
						}),
						score,
						tier: scoreTier(score),
						threatScore,
					},
				];
			})
			.sort((a, b) => b.score - a.score || a.threatScore - b.threatScore);
	}, [cachedRankedTeams, combinations, computedRankingReady, ctx, data, evaluationScoresKey, league]);
	useEffect(() => {
		if (computedRankingReady) writeRankedCache(league, rankingSignature, rankedTeams);
	}, [computedRankingReady, league, rankingSignature, rankedTeams]);
	const term = useDebouncedValue(search.trim().toLowerCase(), 220);
	const orderedTeams = [...rankedTeams].sort((a, b) =>
		sortKey === 'threat'
			? a.threatScore - b.threatScore || b.score - a.score
			: b.score - a.score || a.threatScore - b.threatScore
	);
	// Keyed by the build (species + moves + IVs + level), not the species: see `nicknamesByBuild`.
	const nicknames = useMemo(() => nicknamesByBuild(saved, comboSlots), [saved]);
	// The stand-ins of the Best Buddies and Super Max Megas (see `comboSlots`), by identity, each for what it lost: matched on
	// the cards rather than carried by them, so they are marked whether the teams were just computed or came from the cache.
	const standIns = useMemo(() => {
		const stands = saved.flatMap(comboSlots);
		const identities = (keep: (slot: TeamSlotDescriptor) => boolean) =>
			new Set(stands.filter(keep).map(slotIdentityKey));
		return {
			buddy: identities((slot) => !!slot.formerBuddy),
			superMega: identities((slot) => !!slot.formerSuperMega),
		};
	}, [saved]);
	const filteredTeams = orderedTeams.filter(
		(team) =>
			!term ||
			team.members.some((member) => {
				const pokemon = data.gamemaster[member.speciesId];
				const name = nicknames[slotIdentityKey(member)] ?? (pokemon ? cleanName(pokemon.speciesName) : '');
				return name.toLowerCase().includes(term);
			})
	);

	const updateDraft = (next: TeamSlotDescriptor) =>
		setDraft((current) => (current ? { ...current, slot: next } : current));
	const setDraftMove = (moveIndex: number, moveId: string) => {
		if (!draft) return;
		updateDraft({ ...draft.slot, moveset: withMove(draft.slot.moveset, moveIndex, moveId) });
	};
	const setDraftBuild = (_index: number, build: BuildChange): boolean => {
		if (!draft) return false;
		const spread = bestIvsFor(data.builder, draft.slot.speciesId, LEAGUE_CP[league]);
		const defaultIvs = spread ? ([spread[1], spread[2], spread[3]] as SlotIvs) : undefined;
		const ivs = build.ivs && !defaultIvs?.every((value, index) => value === build.ivs?.[index]) ? build.ivs : undefined;
		updateDraft({
			speciesId: draft.slot.speciesId,
			moveset: [...(build.moveset ?? draft.slot.moveset)],
			...(ivs ? { ivs } : {}),
			...(build.level !== undefined ? { level: build.level } : {}),
			...((build.buddy ?? isBuddy(draft.slot)) ? { buddy: true as const } : {}),
			...((build.superMega ?? draft.slot.superMega) ? { superMega: true as const } : {}),
		});
		return true;
	};
	// The draft is an exact replica (species, moves, IVs, level) of another saved Pokémon: it can't be saved.
	const draftIsDuplicate = !!draft && isDuplicateBuild(draft.slot, saved, draft.entryId, league, data);
	const saveDraft = () => {
		if (!draft || draftIsDuplicate || (draftMember && draftMember.stats.cp > LEAGUE_CP[league])) return;
		const nickname = draft.nickname?.trim().slice(0, 32);
		saveCollectionPokemon(
			league,
			{
				speciesId: draft.slot.speciesId,
				moveset: [...draft.slot.moveset],
				...(draft.slot.ivs ? { ivs: draft.slot.ivs } : {}),
				...(draft.slot.level !== undefined ? { level: draft.slot.level } : {}),
				...(isBuddy(draft.slot) ? { buddy: true as const } : {}),
				...(draft.slot.superMega ? { superMega: true as const } : {}),
				...(nickname ? { nickname } : {}),
			},
			draft.entryId
		);
		setDraft(null);
	};

	const pending =
		evaluationRequested &&
		(evaluations.length < combinations.length ||
			evaluations.some((result) => result.isPending || result.isFetching || (!result.data && !result.isError)));
	const processed = evaluations.filter((result) => result.data !== undefined || result.isError).length;
	const missing = Math.max(0, combinations.length - processed);
	const evaluationFailed = evaluations.some((result) => result.isError);
	const sortOptions: ReadonlyArray<SortOption> = [
		{ key: 'score', label: t('teams:top.teamScore'), defaultDir: 'desc' },
		{ key: 'threat', label: t('teams:threat.scoreLabel'), defaultDir: 'asc' },
	];
	const changeSort = (key: string, _dir: SortDir) => {
		if (key === 'score' || key === 'threat') setSortKey(key);
	};
	const allReady = computedRankingReady || cachedRankedTeams !== undefined;
	// Still working out the teams (or waiting to be asked to): the count isn't known yet, so it doesn't read as 0.
	const teamsComputing = pending || (saved.length >= 3 && !allReady);

	return (
		<div className='r-tm-collection'>
			<p className='r-tm-collection-count'>{t('teams:collection.count', { count: saved.length })}</p>
			<p className='r-tm-board-intro'>{t('teams:collection.intro')}</p>

			{draft && draftMember && (
				<div className='r-tm-collection-editor'>
					<TeamMemberEditor
						// each Pokémon opened is a card of its own: one opened again later starts untouched
						key={draft.entryId ?? 'new'}
						index={0}
						member={draftMember}
						pokemon={data.gamemaster[draft.slot.speciesId]}
						data={data}
						role={undefined}
						cpCap={LEAGUE_CP[league]}
						onChangePokemon={() => setPickerOpen(true)}
						onMove={setDraftMove}
						onBuild={setDraftBuild}
						onRemove={() => setDraft(null)}
						onConfirm={saveDraft}
						confirmLabel={t('teams:collection.confirm')}
						confirmDisabledReason={
							draftIsDuplicate
								? t('teams:collection.duplicate')
								: draftMember && draftMember.stats.cp > LEAGUE_CP[league]
									? t('teams:builder.overCapReason', { cp: draftMember.stats.cp, cap: LEAGUE_CP[league] })
									: undefined
						}
						nickname={draft.nickname}
						nicknameLabel={t('teams:collection.nickname')}
						onNicknameChange={(nickname) =>
							setDraft((current) => (current ? { ...current, nickname: nickname.slice(0, 32) } : current))
						}
					/>
				</div>
			)}

			<div ref={gridRef} className='r-grid-vp r-tm-collection-grid'>
				{!gridSize.measured ? (
					<div className='r-loading'>
						<div className='r-spinner' />
					</div>
				) : (
					<div style={{ height: gridVirtualizer.getTotalSize(), position: 'relative' }}>
						{gridVirtualizer.getVirtualItems().map((virtualRow) => (
							<div
								key={virtualRow.key}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									transform: `translateY(${virtualRow.start - scrollMargin}px)`,
								}}
							>
								<div className='r-minigrid r-grid-row' style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)` }}>
									{gridItems
										.slice(virtualRow.index * gridSize.cols, (virtualRow.index + 1) * gridSize.cols)
										.map((entry, index) => {
											if (entry) {
												const pokemon = data.gamemaster[entry.speciesId];
												if (!pokemon) return null;
												return (
													<div className='r-tm-collection-entry' key={entry.id}>
														<button
															type='button'
															className='r-mini r-tm-collection-pokemon'
															style={{ ['--tc' as string]: typeVar(pokemon.types[0]) }}
															onClick={() =>
																setDraft({
																	slot: entry,
																	entryId: entry.id,
																	...(entry.nickname ? { nickname: entry.nickname } : {}),
																})
															}
														>
															{pokemon.isShadow && <ShadowMark />}
															{chipMarks(entry).crown && <BuddyMark />}
															{chipMarks(entry).superMega && <SuperMegaMark />}
															<SpriteImg pokemon={pokemon} loading='lazy' />
															<span className='r-tm-collection-name'>
																{entry.nickname ?? cleanName(pokemon.speciesName)}
															</span>
															{savedCp[entry.id] !== undefined && (
																<span className='r-tm-collection-cp'>
																	{savedCp[entry.id].toLocaleString()}{' '}
																	{gameTranslator(GameTranslatorKeys.CPDisplay, gameLanguage)}
																</span>
															)}
														</button>
														<button
															type='button'
															className='r-tm-collection-remove'
															aria-label={t('teams:collection.remove', { name: pokemon.speciesName })}
															onClick={() => setRemoveTarget({ id: entry.id, name: cleanName(pokemon.speciesName) })}
														>
															×
														</button>
													</div>
												);
											}
											return (
												<div className='r-tm-collection-entry' key={`add-${index}`}>
													<button
														type='button'
														className='r-mini r-tm-collection-add'
														aria-label={t('teams:builder.emptySlot')}
														onClick={() => {
															setDraft(null);
															setPickerOpen(true);
														}}
													>
														<span className='r-tm-plus' aria-hidden='true'>
															+
														</span>
														<span className='r-tm-collection-add-label'>{t('teams:collection.addShort')}</span>
													</button>
												</div>
											);
										})}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<section className='r-tm-collection-teams'>
				<h2 className='r-section-h'>{t('teams:collection.teamsHeading')}</h2>
				<SearchListBar
					value={search}
					onChange={setSearch}
					placeholder={t('teams:top.searchPlaceholder')}
					clearAriaLabel={t('components:searchBox.clearAriaLabel')}
					onClear={() => setSearch('')}
					label={`${t('common:nav.teams.label')}: ${teamsComputing ? '…' : filteredTeams.length}`}
				>
					<SortBar
						options={sortOptions}
						sortKey={sortKey}
						dir={sortKey === 'score' ? 'desc' : 'asc'}
						onChange={changeSort}
						fixedDirection
					/>
				</SearchListBar>
				{requiresManualEvaluation && (
					<div className='r-tm-collection-manual'>
						<p className='r-muted'>{t('teams:collection.manualNotice')}</p>
						{!evaluationRequested && cachedRankedTeams === undefined && (
							<button type='button' className='r-tm-btn' onClick={() => setRequestedEvaluationKey(evaluationKey)}>
								{t('teams:collection.computeTeams')}
							</button>
						)}
					</div>
				)}
				{saved.length < 3 ? (
					<p className='r-muted'>{t('teams:collection.needThree')}</p>
				) : requiresManualEvaluation && !evaluationRequested && cachedRankedTeams === undefined ? null : allReady &&
				  filteredTeams.length > 0 ? (
					<VirtualTeamCards
						items={filteredTeams.map((team) => ({ team, rank: orderedTeams.indexOf(team) + 1 }))}
						league={league}
						data={data}
						primary={sortKey}
						onOpen={onOpen}
						showBuildDetails
						nicknames={nicknames}
						standIns={standIns}
					/>
				) : allReady && term ? (
					<p className='r-muted'>{t('teams:top.noMatch')}</p>
				) : evaluationFailed ? (
					<p className='r-muted'>{t('teams:suggest.failed')}</p>
				) : allReady ? (
					<p className='r-muted'>{t('teams:collection.noCombinations')}</p>
				) : null}
				{saved.length >= 3 && pending && combinations.length > 0 && (
					<div className='r-tm-loading' role='status' aria-live='polite'>
						<span className='r-spinner' aria-hidden='true' />
						<p>{t('teams:threat.simulating')}</p>
						<div className='r-tm-collection-progress'>
							<progress
								value={processed}
								max={combinations.length}
								aria-label={t('teams:collection.progress', {
									processed,
									total: combinations.length,
									missing,
								})}
							/>
							<p>
								{t('teams:collection.progress', {
									processed,
									total: combinations.length,
									missing,
								})}
							</p>
						</div>
					</div>
				)}
			</section>

			{pickerOpen && (
				<SlotPicker
					leagueLabel={leagueLabel}
					data={data}
					team={draft ? [draft.slot] : []}
					slot={0}
					onSetMember={(_index, speciesId) => {
						const current = draft;
						const moveset = (data.rankList[speciesId]?.moveset ?? [])
							.filter((move) => move !== 'none')
							.slice(0, MAX_MOVES);
						setDraft({
							slot: { speciesId, moveset },
							...(current?.entryId ? { entryId: current.entryId } : {}),
							...(current?.nickname ? { nickname: current.nickname } : {}),
						});
						setPickerOpen(false);
					}}
					onClose={() => setPickerOpen(false)}
				/>
			)}
			{removeTarget && (
				<div className='r-tm-picker-backdrop r-tm-picker-backdrop--center'>
					<div
						className='r-tm-picker r-tm-collection-remove-dialog'
						role='alertdialog'
						aria-modal='true'
						aria-label={t('teams:collection.remove', { name: removeTarget.name })}
						ref={removeDialogRef}
					>
						<div className='r-tm-picker-head'>
							<h2>{t('teams:collection.remove', { name: removeTarget.name })}</h2>
							<button
								type='button'
								className='r-icon-btn'
								aria-label={t('teams:picker.close')}
								onClick={() => setRemoveTarget(null)}
							>
								×
							</button>
						</div>
						<div className='r-tm-collection-remove-actions'>
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => setRemoveTarget(null)}>
								{t('teams:picker.close')}
							</button>
							<button
								type='button'
								className='r-tm-btn'
								onClick={() => {
									removeCollectionPokemon(league, removeTarget.id);
									setRemoveTarget(null);
								}}
							>
								{t('teams:collection.confirm')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
