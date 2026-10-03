import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { PokemonSearchInput } from '../../components/PokemonSearchInput';
import { SpriteImg } from '../../components/Sprite';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName, normalizeSearch } from '../../lib/format';
import { removeCollectionPokemon, saveCollectionPokemon, usePokemonCollection } from '../../lib/pokemon-collection';
import { LEAGUE_CP } from '../../lib/pvp-sim/context';
import { cpAt } from '../../lib/pvp-sim/cp';
import { scoreTier, type SlotIvs, teamScore, type TeamSlotDescriptor, threatPart } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import { VirtualTeamCards } from './TeamCards';
import { SlotPicker, TeamMemberEditor } from './TeamStage';
import { analyzeTeam } from './useTeamAnalysis';
import { type TeamsData, useSimContext, useTeamEvaluations } from './useTeamsData';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';

const GRID_GAP = 8;
const MINI_TILE_MAX_SIZE = 86;
const AUTO_EVALUATION_LIMIT = 10;

const buildCombinations = (
	species: ReadonlyArray<TeamSlotDescriptor>,
	data: TeamsData
): Array<Array<TeamSlotDescriptor>> => {
	const teams: Array<Array<TeamSlotDescriptor>> = [];
	for (let a = 0; a < species.length; a++) {
		for (let b = a + 1; b < species.length; b++) {
			const aBase = species[a].speciesId.replace(/_shadow$/, '');
			const bBase = species[b].speciesId.replace(/_shadow$/, '');
			if (aBase === bBase) continue;
			for (let c = b + 1; c < species.length; c++) {
				const cBase = species[c].speciesId.replace(/_shadow$/, '');
				if (cBase === aBase || cBase === bBase) continue;
				const trio = [species[a], species[b], species[c]];
				if (
					!trio.every(
						(slot) =>
							data.gamemaster[slot.speciesId] &&
							data.rankList[slot.speciesId] &&
							slot.moveset.every((id) => data.builder?.moves[id])
					)
				)
					continue;
				teams.push(trio);
			}
		}
	}
	return teams;
};

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
	const { t } = useTranslation(['teams', 'components']);
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
	const [search, setSearch] = useState('');
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');
	const [requestedEvaluationKey, setRequestedEvaluationKey] = useState<string | null>(null);
	const [gridSize, setGridSize] = useState({ cols: 4, rowHeight: 96, measured: false });
	const gridRef = useRef<HTMLDivElement>(null);
	const ctx = useSimContext(league, data);

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
	const gridVirtualizer = useVirtualizer({
		count: Math.ceil(gridItems.length / gridSize.cols),
		getScrollElement: () => gridRef.current,
		estimateSize: () => gridSize.rowHeight,
		overscan: 6,
		gap: GRID_GAP,
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
					};
					const member = ctx ? analyzeTeam(league, ctx, data, [slot])?.members[0] : undefined;
					return member ? [[entry.id, member.stats.cp]] : [];
				})
			),
		[saved, ctx, data, league]
	);
	const combinations = useMemo(() => {
		const slots: Array<TeamSlotDescriptor> = saved
			.map(({ speciesId, moveset, ivs, level }) => ({
				speciesId,
				moveset,
				...(ivs ? { ivs } : {}),
				...(level !== undefined ? { level } : {}),
			}))
			.sort(
				(a, b) =>
					(data.rankList[a.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER) -
					(data.rankList[b.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER)
			);
		return buildCombinations(slots, data);
	}, [saved, data]);
	const evaluationKey = JSON.stringify(combinations);
	const requiresManualEvaluation = saved.length > AUTO_EVALUATION_LIMIT && combinations.length > 0;
	const evaluationRequested = !requiresManualEvaluation || requestedEvaluationKey === evaluationKey;
	const evaluations = useTeamEvaluations(league, data, evaluationRequested ? combinations : []);
	const rankedTeams = useMemo(() => {
		if (!ctx) return [];
		return combinations
			.flatMap((members, index): Array<RankedTeam> => {
				const evaluation = evaluations[index]?.data;
				const analysis = evaluation ? analyzeTeam(league, ctx, data, members) : undefined;
				if (!evaluation || !analysis) return [];
				const score = teamScore({
					threat: threatPart(evaluation.threatScore),
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
							};
						}),
						score,
						tier: scoreTier(score),
						threatScore: evaluation.threatScore,
					},
				];
			})
			.sort((a, b) => b.score - a.score || a.threatScore - b.threatScore);
		// Query result arrays are recreated while results resolve; their data flags are the meaningful dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [combinations, ctx, data, evaluations.map((result) => (result.data ? 1 : 0)).join(''), league]);
	const term = normalizeSearch(search);
	const orderedTeams = useMemo(
		() =>
			[...rankedTeams].sort((a, b) =>
				sortKey === 'threat'
					? a.threatScore - b.threatScore || b.score - a.score
					: b.score - a.score || a.threatScore - b.threatScore
			),
		[rankedTeams, sortKey]
	);
	const nicknames = useMemo(
		() => {
			const counts = new Map<string, number>();
			saved.forEach((entry) => counts.set(entry.speciesId, (counts.get(entry.speciesId) ?? 0) + 1));
			return Object.fromEntries(
				saved.flatMap((entry) =>
					counts.get(entry.speciesId) === 1 && entry.nickname ? [[entry.speciesId, entry.nickname]] : []
				)
			);
		},
		[saved]
	);
	const filteredTeams = useMemo(
		() =>
			orderedTeams.filter(
				(team) =>
					!term ||
					team.members.some((member) => {
						const pokemon = data.gamemaster[member.speciesId];
						const name = nicknames[member.speciesId] || (pokemon ? cleanName(pokemon.speciesName) : member.speciesId);
						return normalizeSearch(name).includes(term) || normalizeSearch(member.speciesId).includes(term);
					})
			),
		[orderedTeams, term, data.gamemaster, nicknames]
	);

	const updateDraft = (next: TeamSlotDescriptor) =>
		setDraft((current) => (current ? { ...current, slot: next } : current));
	const setDraftMove = (moveIndex: number, moveId: string) => {
		if (!draft) return;
		const moveset = [...draft.slot.moveset];
		moveset[moveIndex] = moveId;
		if (moveIndex > 0) {
			const other = moveIndex === 1 ? 2 : 1;
			if (moveset[other] === moveId) moveset.splice(other, 1);
		}
		updateDraft({ ...draft.slot, moveset });
	};
	const setDraftBuild = (_index: number, build: { ivs: SlotIvs | undefined; level: number | undefined }) => {
		if (!draft) return;
		const spread = data.builder?.ivs[draft.slot.speciesId]?.[league];
		const defaultIvs = spread ? ([spread[1], spread[2], spread[3]] as SlotIvs) : undefined;
		const effectiveIvs = build.ivs ?? defaultIvs;
		const base = data.gamemaster[draft.slot.speciesId]?.baseStats;
		if (build.level !== undefined && effectiveIvs && base && cpAt(base, effectiveIvs, build.level) > LEAGUE_CP[league])
			return;
		const ivs = build.ivs && !defaultIvs?.every((value, index) => value === build.ivs?.[index]) ? build.ivs : undefined;
		updateDraft({
			speciesId: draft.slot.speciesId,
			moveset: [...draft.slot.moveset],
			...(ivs ? { ivs } : {}),
			...(build.level !== undefined ? { level: build.level } : {}),
		});
	};
	const saveDraft = () => {
		if (!draft) return;
		const nickname = draft.nickname?.trim().slice(0, 32);
		saveCollectionPokemon(
			league,
			{
				speciesId: draft.slot.speciesId,
				moveset: [...draft.slot.moveset],
				...(draft.slot.ivs ? { ivs: draft.slot.ivs } : {}),
				...(draft.slot.level !== undefined ? { level: draft.slot.level } : {}),
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
	const allReady =
		evaluationRequested &&
		evaluations.length === combinations.length &&
		evaluations.every((result) => result.data !== undefined && !result.isFetching);

	return (
		<div className='r-tm-collection'>
			<p className='r-tm-collection-count'>{t('teams:collection.count', { count: saved.length })}</p>
			<p className='r-tm-board-intro'>{t('teams:collection.intro')}</p>

			{draft && draftMember && (
				<div className='r-tm-collection-editor'>
					<TeamMemberEditor
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
									transform: `translateY(${virtualRow.start}px)`,
								}}
							>
								<div
									className='r-minigrid r-grid-row'
									style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)` }}
								>
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
															<SpriteImg pokemon={pokemon} loading='lazy' />
															<span className='r-tm-collection-name'>
																{entry.nickname || cleanName(pokemon.speciesName)}
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
															onClick={() => removeCollectionPokemon(league, entry.id)}
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
				<div className='r-tm-board-tools'>
					<PokemonSearchInput
						value={search}
						onChange={setSearch}
						placeholder={t('teams:top.searchPlaceholder')}
						clearAriaLabel={t('components:searchBox.clearAriaLabel')}
						onClear={() => setSearch('')}
					/>
					<SortBar
						options={sortOptions}
						sortKey={sortKey}
						dir={sortKey === 'score' ? 'desc' : 'asc'}
						onChange={changeSort}
						fixedDirection
					/>
				</div>
				{requiresManualEvaluation && (
					<div className='r-tm-collection-manual'>
						<p className='r-muted'>{t('teams:collection.manualNotice')}</p>
						{!evaluationRequested && (
							<button type='button' className='r-tm-btn' onClick={() => setRequestedEvaluationKey(evaluationKey)}>
								{t('teams:collection.computeTeams')}
							</button>
						)}
					</div>
				)}
				{saved.length < 3 ? (
					<p className='r-muted'>{t('teams:collection.needThree')}</p>
				) : requiresManualEvaluation && !evaluationRequested ? null : allReady && filteredTeams.length > 0 ? (
					<VirtualTeamCards
						items={filteredTeams.map((team) => ({ team, rank: orderedTeams.indexOf(team) + 1 }))}
						league={league}
						data={data}
						primary={sortKey}
						onOpen={onOpen}
						showBuildDetails
						nicknames={nicknames}
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
						const moveset = (data.rankList[speciesId]?.moveset ?? []).filter((move) => move !== 'none').slice(0, 3);
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
		</div>
	);
};
