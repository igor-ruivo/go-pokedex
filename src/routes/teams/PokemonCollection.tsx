import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BuddyMark } from '../../components/BuddyMark';
import { SearchListBar } from '../../components/SearchListBar';
import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { SpriteImg } from '../../components/Sprite';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDismiss } from '../../hooks/useDismiss';
import { cleanName } from '../../lib/format';
import {
	type CollectionPokemon,
	collectionBuildKey,
	removeCollectionPokemon,
	saveCollectionPokemon,
	usePokemonCollection,
} from '../../lib/pokemon-collection';
import { LEAGUE_CP } from '../../lib/pvp-sim/context';
import { cpAt } from '../../lib/pvp-sim/cp';
import { isBuddy, nonBuddyCounterpart, scoreTier, type SlotIvs, slotKey, teamScore, type TeamSlotDescriptor, threatPart } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { VirtualTeamCards } from './TeamCards';
import { SlotPicker, TeamMemberEditor } from './TeamStage';
import { analyzeTeam } from './useTeamAnalysis';
import { type TeamsData, useSimContext, useTeamEvaluations } from './useTeamsData';

const GRID_GAP = 8;
const MINI_TILE_MAX_SIZE = 86;
const AUTO_EVALUATION_LIMIT = 10;
const RANK_CACHE_VERSION = 3;

const cacheKey = (league: TeamLeague) => `go-pokedex:collection-team-rank:v${RANK_CACHE_VERSION}:${league}`;

const isRankedTeam = (value: unknown): value is RankedTeam => {
	if (typeof value !== 'object' || value === null) return false;
	const team = value as Partial<RankedTeam>;
	return (
		typeof team.score === 'number' &&
		typeof team.threatScore === 'number' &&
		(team.tier === 'elite' ||
			team.tier === 'strong' ||
			team.tier === 'solid' ||
			team.tier === 'shaky' ||
			team.tier === 'risky') &&
		Array.isArray(team.members) &&
		team.members.length === 3 &&
		team.members.every((member: unknown) => {
			if (typeof member !== 'object' || member === null) return false;
			const rankedMember = member as { speciesId?: unknown; moveset?: unknown };
			return (
				typeof rankedMember.speciesId === 'string' &&
				Array.isArray(rankedMember.moveset) &&
				rankedMember.moveset.every((move: unknown) => typeof move === 'string')
			);
		})
	);
};

const readRankedCache = (league: TeamLeague, signature: string): Array<RankedTeam> | undefined => {
	try {
		const raw = window.sessionStorage.getItem(cacheKey(league));
		if (!raw) return undefined;
		const cached: unknown = JSON.parse(raw);
		if (typeof cached !== 'object' || cached === null) return undefined;
		const record = cached as { signature?: unknown; teams?: unknown };
		return record.signature === signature && Array.isArray(record.teams) && record.teams.every(isRankedTeam)
			? record.teams
			: undefined;
	} catch {
		return undefined;
	}
};

const writeRankedCache = (league: TeamLeague, signature: string, teams: ReadonlyArray<RankedTeam>) => {
	try {
		window.sessionStorage.setItem(cacheKey(league), JSON.stringify({ signature, teams }));
	} catch {
		// Session storage may be unavailable or full; the in-memory ranking still works.
	}
};

const hashSignature = (value: string) => {
	let first = 2166136261;
	let second = 0x9e3779b9;
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		first = Math.imul(first ^ code, 16777619);
		second = Math.imul(second ^ code, 2246822519);
	}
	return `${value.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
};

/**
 * The slots one saved Pokémon takes part in team combinations with. A team can only have one Best Buddy, but that must
 * not keep two Best Buddy-able Pokémon off the same team, so a Best Buddy (above level 50) also gets a temporary plain
 * counterpart (no flag, level 50 at most): the combinations then include both "this one is the buddy" and "the other one
 * is". A Best Buddy at level 50 or less gains nothing from the flag, so it simply counts as a plain Pokémon.
 */
const comboSlots = (entry: CollectionPokemon): Array<TeamSlotDescriptor> => {
	const slot: TeamSlotDescriptor = {
		speciesId: entry.speciesId,
		moveset: entry.moveset,
		...(entry.ivs ? { ivs: entry.ivs } : {}),
		...(entry.level !== undefined ? { level: entry.level } : {}),
		...(entry.buddy ? { buddy: true as const } : {}),
	};
	if (!isBuddy(slot)) return [slot];
	return (slot.level ?? 0) > 50 ? [slot, nonBuddyCounterpart(slot)] : [nonBuddyCounterpart(slot)];
};

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
				// Only one Pokémon per team can be above level 50 (Best Buddy).
				if (trio.filter(isBuddy).length > 1) continue;
				if (
					!trio.every(
						(slot) =>
							data.gamemaster[slot.speciesId] &&
							data.rankList[slot.speciesId] &&
							slot.moveset.every((id) => id === 'none' || data.builder?.moves[id])
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
					};
					const member = ctx ? analyzeTeam(league, ctx, data, [slot])?.members[0] : undefined;
					return member ? [[entry.id, member.stats.cp]] : [];
				})
			),
		[saved, ctx, data, league]
	);
	const combinations = useMemo(() => {
		const slots: Array<TeamSlotDescriptor> = saved
			.flatMap(comboSlots)
			// Identical builds (e.g. a saved copy of what a Best Buddy's counterpart already is) are one Pokémon.
			.filter((slot, i, all) => all.findIndex((other) => slotKey(other) === slotKey(slot)) === i)
			.sort(
				(a, b) =>
					(data.rankList[a.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER) -
					(data.rankList[b.speciesId]?.rank ?? Number.MAX_SAFE_INTEGER)
			);
		return buildCombinations(slots, data);
	}, [saved, data]);
	const rankingSignature = useMemo(() => {
		const rankedSpecies = Object.entries(data.rankList)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([speciesId, ranking]) => [speciesId, ranking]);
		const speciesIds = new Set([
			...Object.keys(data.rankList),
			...combinations.flatMap((team) => team.map((member) => member.speciesId)),
		]);
		const species = [...speciesIds].sort().map((id) => {
			const pokemon = data.gamemaster[id];
			return pokemon ? [id, pokemon.dex, pokemon.types, pokemon.baseStats, pokemon.isShadow] : [id, null];
		});
		return hashSignature(
			JSON.stringify({
				version: RANK_CACHE_VERSION,
				league,
				combinations,
				rankedSpecies,
				species,
				builder: data.builder
					? {
							simulator: data.builder.simulator,
							moves: data.builder.moves,
							ivs: data.builder.ivs,
							forms: data.builder.forms,
							excludedThreats: data.builder.excludedThreats,
							meta: data.builder.meta[league],
						}
					: null,
			})
		);
	}, [league, combinations, data.rankList, data.gamemaster, data.builder]);
	const cachedRankedTeams = data.ready ? readRankedCache(league, rankingSignature) : undefined;
	const evaluationKey = JSON.stringify(combinations);
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
	const nicknames = useMemo(() => {
		// Keyed by the build (species + moves + IVs + level), not the species: a team member is one specific saved
		// entry, so with duplicates of a species each card shows the nickname of the entry it was actually built from.
		const byBuild: Record<string, string> = {};
		for (const entry of saved) {
			if (!entry.nickname) continue;
			// The entry itself, and the variants it takes part in combinations as (see `comboSlots`).
			for (const key of [slotKey(entry), ...comboSlots(entry).map(slotKey)]) {
				if (!(key in byBuild)) byBuild[key] = entry.nickname;
			}
		}
		return byBuild;
	}, [saved]);
	const filteredTeams = orderedTeams.filter(
		(team) =>
			!term ||
			team.members.some((member) => {
				const pokemon = data.gamemaster[member.speciesId];
				const name = nicknames[slotKey(member)] ?? (pokemon ? cleanName(pokemon.speciesName) : '');
				return name.toLowerCase().includes(term);
			})
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
	const setDraftBuild = (
		_index: number,
		build: { ivs: SlotIvs | undefined; level: number | undefined; buddy?: boolean | undefined }
	) => {
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
			...((build.buddy ?? isBuddy(draft.slot)) ? { buddy: true as const } : {}),
		});
	};
	// The draft is an exact replica (species, moves, IVs, level) of another saved Pokémon: it can't be saved.
	const draftIsDuplicate =
		!!draft &&
		saved.some((entry) => entry.id !== draft.entryId && collectionBuildKey(entry) === collectionBuildKey(draft.slot));
	const saveDraft = () => {
		if (!draft || draftIsDuplicate) return;
		const nickname = draft.nickname?.trim().slice(0, 32);
		saveCollectionPokemon(
			league,
			{
				speciesId: draft.slot.speciesId,
				moveset: [...draft.slot.moveset],
				...(draft.slot.ivs ? { ivs: draft.slot.ivs } : {}),
				...(draft.slot.level !== undefined ? { level: draft.slot.level } : {}),
				...(isBuddy(draft.slot) ? { buddy: true as const } : {}),
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
						confirmDisabledReason={draftIsDuplicate ? t('teams:collection.duplicate') : undefined}
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
															{isBuddy(entry) && <BuddyMark />}
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
			{removeTarget && (
				<div className='r-tm-picker-backdrop'>
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
