import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useAfterPaint } from '../../hooks/useAfterPaint';
import { useFavoriteTeams } from '../../lib/favorite-teams';
import { type ScoreParts, scoreTier, teamScore, threatPart } from '../../lib/team-analysis';
import { TeamCards } from './TeamCards';
import { analyzeTeam } from './useTeamAnalysis';
import { type TeamsData, useSimContext, useTeamEvaluations } from './useTeamsData';

type SortKey = 'score' | 'threat' | 'added';

interface FavoriteRow extends RankedTeam {
	addedAt: number;
}

/**
 * The teams the user starred in this league, drawn with the same cards as the best teams. A favorite stores only
 * its Pokémon and moves, so each one is rated here the way the builder rates it (the simulated threat score in the
 * worker, everything else on the page) and shown once its rating is in — already rated teams come straight from the
 * builder's cache. Can be ordered by either score or by when it was added.
 */
export const FavoriteTeams = ({
	league,
	data,
	onOpen,
}: {
	league: TeamLeague;
	data: TeamsData;
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const all = useFavoriteTeams();
	const [sortKey, setSortKey] = useState<SortKey>('score');
	const ctx = useSimContext(league, data);

	// Only teams this league's ranking can still rate: a species that dropped out of it stays saved, just not listed.
	const favorites = useMemo(
		() =>
			all.filter(
				(f) => f.league === league && f.members.every((m) => data.rankList[m.speciesId] && data.gamemaster[m.speciesId])
			),
		[all, league, data.rankList, data.gamemaster]
	);
	const evaluations = useTeamEvaluations(
		league,
		data,
		favorites.map((f) => f.members)
	);

	const rated = useMemo(() => {
		const rows: Array<FavoriteRow> = [];
		let pending = 0;
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
	}, [favorites, ctx, data, league, evaluations.map((e) => (e.data ? 1 : 0)).join('')]);

	const painted = useAfterPaint();
	if (!data.ready || !painted) {
		return (
			<div className='r-tm-loading'>
				<span className='r-spinner' aria-hidden='true' />
				<p>{t('teams:page.loading')}</p>
			</div>
		);
	}
	if (favorites.length === 0) return <p className='r-tm-empty'>{t('teams:favorites.empty')}</p>;

	const sortOptions: ReadonlyArray<SortOption> = [
		{ key: 'score', label: t('teams:top.teamScore'), defaultDir: 'desc' },
		{ key: 'threat', label: t('teams:threat.scoreLabel'), defaultDir: 'asc' },
		{ key: 'added', label: t('teams:favorites.sortAdded'), defaultDir: 'desc' },
	];
	const changeSort = (key: string, _dir: SortDir) => {
		if (key === 'score' || key === 'threat' || key === 'added') setSortKey(key);
	};

	// Always best first: highest score, lowest threat score, newest first.
	const teams = [...rated.rows].sort((a, b) =>
		sortKey === 'threat'
			? a.threatScore - b.threatScore || b.score - a.score
			: sortKey === 'added'
				? b.addedAt - a.addedAt
				: b.score - a.score || a.threatScore - b.threatScore
	);

	return (
		<div className='r-tm-board'>
			<div className='r-tm-board-tools'>
				<SortBar
					options={sortOptions}
					sortKey={sortKey}
					dir={sortKey === 'threat' ? 'asc' : 'desc'}
					onChange={changeSort}
					fixedDirection
				/>
			</div>
			<TeamCards
				teams={teams}
				league={league}
				data={data}
				primary={sortKey === 'threat' ? 'threat' : 'score'}
				onOpen={onOpen}
			/>
			{rated.pending > 0 && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:threat.simulating')}</p>
				</div>
			)}
		</div>
	);
};
