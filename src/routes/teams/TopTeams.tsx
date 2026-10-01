import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useAfterPaint } from '../../hooks/useAfterPaint';
import { SCORE_WEIGHTS } from '../../lib/team-analysis';
import { useTeamRanking } from '../../queries/teams';
import { TeamCards } from './TeamCards';
import type { TeamsData } from './useTeamsData';

/**
 * The best teams we could find: every trio of the league's top Pokémon, each with its ranking's recommended
 * moves and top IVs, rated with the same Team Score the builder shows (see `scripts/team-ranking` and the daily
 * "Team Ranking" workflow). Each row opens that team in the builder.
 */
export const TopTeams = ({
	league,
	data,
	onOpen,
}: {
	league: TeamLeague;
	data: TeamsData;
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const query = useTeamRanking();
	// The same "Order by" chip as the rankings pages. Each key has its own list of the best teams by that metric.
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');

	// The tab is already showing; the long list of cards renders after the spinner has been painted.
	const painted = useAfterPaint();

	if (query.isError) return <p className='r-muted'>{t('teams:top.empty')}</p>;
	if (!query.data || !data.ready || !painted) {
		return (
			<div className='r-tm-loading'>
				<span className='r-spinner' aria-hidden='true' />
				<p>{t('teams:page.loading')}</p>
			</div>
		);
	}

	const sortOptions: ReadonlyArray<SortOption> = [
		{ key: 'score', label: t('teams:top.teamScore'), defaultDir: 'desc' },
		{ key: 'threat', label: t('teams:threat.scoreLabel'), defaultDir: 'asc' },
	];
	// Always best first: there is no direction to choose (the lists are the best hundred by each metric).
	const changeSort = (key: string, _dir: SortDir) => {
		if (key === 'score' || key === 'threat') setSortKey(key);
	};

	const { byScore, byThreat, totalTeams } = query.data.leagues[league];
	// Each list is already best first: highest Team Score, or lowest threat score.
	const teams = sortKey === 'score' ? byScore : byThreat;
	const date = new Date(query.data.generatedAt).toLocaleDateString();

	return (
		<div className='r-tm-board'>
			<p className='r-tm-board-intro'>{t('teams:top.intro', { candidates: query.data.candidates })}</p>
			<details className='r-ctr-help r-tm-board-help'>
				<summary>{t('teams:top.help.summary')}</summary>
				<dl>
					<dt>{t('teams:top.teamScore')}</dt>
					<dd>
						{t('teams:top.help.teamScore', {
							threat: Math.round(SCORE_WEIGHTS.threat * 100),
							defense: Math.round(SCORE_WEIGHTS.defense * 100),
							offense: Math.round(SCORE_WEIGHTS.offense * 100),
							bulk: Math.round(SCORE_WEIGHTS.bulk * 100),
							safety: Math.round(SCORE_WEIGHTS.safety * 100),
							consistency: Math.round(SCORE_WEIGHTS.consistency * 100),
						})}
					</dd>
					<dt>{t('teams:threat.scoreLabel')}</dt>
					<dd>{t('teams:top.help.threat')}</dd>
					<dt>{t('teams:score.points', { value: '' }).trim()}</dt>
					<dd>{t('teams:top.help.roles')}</dd>
					<dt aria-hidden='true'>→</dt>
					<dd>{t('teams:top.help.order')}</dd>
				</dl>
			</details>
			<div className='r-tm-board-tools'>
				<SortBar
					options={sortOptions}
					sortKey={sortKey}
					dir={sortKey === 'score' ? 'desc' : 'asc'}
					onChange={changeSort}
					fixedDirection
				/>
			</div>
			<TeamCards teams={teams} league={league} data={data} primary={sortKey} onOpen={onOpen} />
			<p className='r-muted r-tm-note'>{t('teams:top.note', { date, total: totalTeams.toLocaleString() })}</p>
		</div>
	);
};
