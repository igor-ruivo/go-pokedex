import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchListBar } from '../../components/SearchListBar';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useAfterPaint } from '../../hooks/useAfterPaint';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFavoriteTeams } from '../../lib/favorite-teams';
import { cleanName } from '../../lib/format';
import { type ScoreParts, scoreTier, teamScore, threatPart } from '../../lib/team-analysis';
import { TeamCards } from './TeamCards';
import { analyzeTeam } from './useTeamAnalysis';
import { type TeamsData, useSimContext, useTeamEvaluations } from './useTeamsData';

interface FavoriteRow extends RankedTeam {
	addedAt: number;
	/** Not rated: the score fields are placeholders. */
	unrated?: boolean;
}

/** Above this many favorites in a league they are not rated automatically (as in My Pokémon): every rating is a battle simulation. */
const AUTO_RATE_LIMIT = 10;

type FavoriteSortKey = 'added' | 'score' | 'threat';

/**
 * The teams the user starred in this league, drawn with the same cards as the best teams. A favorite stores only
 * its Pokémon and moves, so each one is rated here the way the builder rates it (the simulated threat score in the
 * worker, everything else on the page) and shown once its rating is in — already rated teams come straight from the
 * builder's cache. The list can be filtered by Pokémon and ordered by date added or either score.
 */
export const FavoriteTeams = ({
	league,
	data,
	leagueRow,
	onOpen,
}: {
	league: TeamLeague;
	data: TeamsData;
	/** The league picker: it scrolls along with the search header, and stands alone while there is no list. */
	leagueRow: ReactNode;
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams', 'components', 'common']);
	const all = useFavoriteTeams();
	const [search, setSearch] = useState('');
	const [sortKey, setSortKey] = useState<FavoriteSortKey>('added');
	const ctx = useSimContext(league, data);

	// Only teams this league's ranking can still rate: a species that dropped out of it stays saved, just not listed.
	const favorites = useMemo(
		() =>
			all.filter(
				(f) => f.league === league && f.members.every((m) => data.rankList[m.speciesId] && data.gamemaster[m.speciesId])
			),
		[all, league, data.rankList, data.gamemaster]
	);
	const autoRate = favorites.length <= AUTO_RATE_LIMIT;
	const evaluations = useTeamEvaluations(league, data, autoRate ? favorites.map((f) => f.members) : []);

	const rated = useMemo(() => {
		const rows: Array<FavoriteRow> = [];
		let pending = 0;
		if (!autoRate) {
			// Listed as they were saved, each in its own order, with no scores.
			for (const favorite of favorites) {
				rows.push({
					members: favorite.members,
					score: 0,
					tier: 'risky',
					threatScore: 0,
					addedAt: favorite.addedAt,
					unrated: true,
				});
			}
			return { rows, pending };
		}
		favorites.forEach((favorite, i) => {
			const evaluation = evaluations[i]?.data;
			const analysis = ctx && evaluation ? analyzeTeam(league, ctx, data, favorite.members) : undefined;
			if (!evaluation || !analysis) {
				pending++;
				return;
			}
			const parts: ScoreParts = {
				threat: threatPart(evaluation.threatScore),
				defense: analysis.defense.score,
				offense: analysis.offense.score,
				bulk: analysis.grades.bulk.part,
				safety: analysis.grades.safety.part,
				consistency: analysis.grades.consistency.part,
			};
			const score = teamScore(parts);
			if (score === undefined) return;
			// In play order — lead, switch, closer — like the best teams.
			const order = analysis.roles
				? [analysis.roles.order.lead, analysis.roles.order.switch, analysis.roles.order.closer]
				: [0, 1, 2];
			rows.push({
				members: order.map((index) => favorite.members[index]),
				score,
				tier: scoreTier(score),
				threatScore: evaluation.threatScore,
				addedAt: favorite.addedAt,
			});
		});
		return { rows, pending };
		// `evaluations` is a new array every render; what matters is each result arriving.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoRate, favorites, ctx, data, league, evaluations.map((e) => (e.data ? 1 : 0)).join('')]);

	const painted = useAfterPaint();
	const term = useDebouncedValue(search.trim().toLowerCase(), 220);
	if (!data.ready || !painted) {
		return (
			<>
				{leagueRow}
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:page.loading')}</p>
				</div>
			</>
		);
	}
	if (favorites.length === 0)
		return (
			<>
				{leagueRow}
				<p className='r-tm-empty'>{t('teams:favorites.empty')}</p>
			</>
		);

	const sortOptions: ReadonlyArray<SortOption> = [
		{ key: 'added', label: t('teams:favorites.sortAdded'), defaultDir: 'desc' },
		{ key: 'score', label: t('teams:top.teamScore'), defaultDir: 'desc' },
		{ key: 'threat', label: t('teams:threat.scoreLabel'), defaultDir: 'asc' },
	];
	const changeSort = (key: string, _dir: SortDir) => {
		if (key === 'added' || key === 'score' || key === 'threat') setSortKey(key);
	};
	// Without scores there is nothing to sort by but when they were added.
	const effectiveSort = autoRate ? sortKey : 'added';
	// Each criterion always uses its useful direction: newest, highest score, or lowest threat first.
	const teams = rated.rows
		.filter(
			(team) =>
				!term ||
				team.members.some((member) => {
					const pokemon = data.gamemaster[member.speciesId];
					return !!pokemon && cleanName(pokemon.speciesName).toLowerCase().includes(term);
				})
		)
		.sort((a, b) =>
			effectiveSort === 'added'
				? b.addedAt - a.addedAt
				: effectiveSort === 'threat'
					? a.threatScore - b.threatScore || b.score - a.score
					: b.score - a.score || a.threatScore - b.threatScore
		);

	return (
		<div className='r-tm-board'>
			{!autoRate && (
				<p className='r-muted r-tm-board-intro'>{t('teams:favorites.unratedNotice', { limit: AUTO_RATE_LIMIT })}</p>
			)}
			<SearchListBar
				above={leagueRow}
				value={search}
				onChange={setSearch}
				placeholder={t('teams:top.searchPlaceholder')}
				clearAriaLabel={t('components:searchBox.clearAriaLabel')}
				onClear={() => setSearch('')}
				label={`${t('common:nav.teams.label')}: ${rated.pending > 0 ? '…' : teams.length}`}
			>
				{autoRate && (
					<SortBar
						options={sortOptions}
						sortKey={sortKey}
						dir={sortKey === 'threat' ? 'asc' : 'desc'}
						onChange={changeSort}
						fixedDirection
					/>
				)}
			</SearchListBar>
			{/* No card until every favorite is rated (as in My Pokémon): a list that fills in and reorders while it works is noise. */}
			{rated.pending > 0 ? null : teams.length > 0 ? (
				<TeamCards
					teams={teams}
					league={league}
					data={data}
					primary={effectiveSort === 'threat' ? 'threat' : 'score'}
					onOpen={onOpen}
				/>
			) : term ? (
				<p className='r-muted'>{t('teams:top.noMatch')}</p>
			) : (
				<p className='r-tm-empty'>{t('teams:favorites.empty')}</p>
			)}
			{rated.pending > 0 && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:threat.simulating')}</p>
				</div>
			)}
		</div>
	);
};
