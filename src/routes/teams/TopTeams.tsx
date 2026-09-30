import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName, ordinal } from '../../lib/format';
import { SCORE_WEIGHTS, TEAM_ROLES } from '../../lib/team-analysis';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { useTeamRanking } from '../../queries/teams';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
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
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { moves } = useMoves();
	const query = useTeamRanking();
	const metrics = (team: RankedTeam) => [
		{ label: t('teams:top.teamScore'), value: team.score.toFixed(1) },
		{ label: t('teams:threat.scoreLabel'), value: String(team.threatScore) },
	];
	// The same "Order by" chip as the rankings pages. Each key has its own list of the best teams by that metric.
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');

	if (query.isError) return <p className='r-muted'>{t('teams:top.empty')}</p>;
	if (!query.data || !data.ready) {
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
				<SortBar options={sortOptions} sortKey={sortKey} dir={sortKey === 'score' ? 'desc' : 'asc'} onChange={changeSort} fixedDirection />
			</div>
			<ol className='r-tm-board-list'>
				{teams.map((team, index) => {
					const rank = index + 1;
					return (
						<li key={team.members.map((m) => m.speciesId).join('|')} style={{ ['--i' as string]: Math.min(index, 12) }}>
							<button type='button' className='r-tm-board-card' data-tier={team.tier} onClick={() => onOpen(team)}>
								<span className='r-tm-board-rank' data-podium={rank <= 3 ? rank : undefined}>
									{rank <= 3 && (
										<svg className='r-tm-board-medal' viewBox='0 0 24 24' aria-hidden='true'>
											<path className='r-tm-board-ribbon' d='M6.6 1.2h4.1l1.6 6-3.3.9z' />
											<path className='r-tm-board-ribbon' d='M17.4 1.2h-4.1l-1.6 6 3.3.9z' />
											<circle className='r-tm-board-disc' cx='12' cy='15.2' r='7.2' />
											<circle className='r-tm-board-ring' cx='12' cy='15.2' r='4.9' />
											<path className='r-tm-board-star' d='M12 11.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z' />
										</svg>
									)}
									<span>{ordinal(rank, currentLanguage)}</span>
								</span>
								<span className='r-tm-board-score'>
									{/* both metrics are named; the one being sorted by is the big one */}
									{(sortKey === 'score' ? metrics(team) : [...metrics(team)].reverse()).map((metric, n) => (
										<span key={metric.label} className='r-tm-board-metric' data-primary={n === 0 ? '' : undefined}>
											<small>{metric.label}</small>
											<b>{metric.value}</b>
										</span>
									))}
								</span>
								<span className='r-tm-board-members'>
									{team.members.map((member, i) => {
										const p = data.gamemaster[member.speciesId];
										if (!p) return null;
										// Members come in the order they're played: lead, switch, closer.
										const role = TEAM_ROLES[i];
										const roleScore = data.rankList[member.speciesId]?.[role];
										return (
											<Fragment key={member.speciesId}>
												{i > 0 && (
													<svg className='r-tm-board-arrow' viewBox='0 0 40 24' aria-hidden='true'>
														<path d='M2 12h30M24 4l10 8-10 8' />
													</svg>
												)}
												<span
													className='r-tm-board-member'
													data-role={role}
													style={{
														['--tc' as string]: typeVar(p.types[0]),
														['--tc2' as string]: typeVar(p.types[1] ?? p.types[0]),
													}}
												>
													<span className='r-tm-board-art'>
														{p.isShadow && <ShadowMark />}
														<SpriteImg pokemon={p} loading='lazy' />
													</span>
													<b className='r-tm-board-name'>{cleanName(p.speciesName)}</b>
													<span className='r-tm-board-types'>
	{p.types.map((ty) => (
		<TypeChip key={typeKey(ty)} type={typeKey(ty)} />
	))}
</span>
													<span className='r-tm-board-chip'>{roleScore === undefined ? '–' : roleScore.toFixed(1)}</span>
													<span className='r-tm-board-moves'>
														{member.moveset.map((m) => (
															<span key={m}>{translateMoveFromMoveId(m, moves, gl)}</span>
														))}
													</span>
												</span>
											</Fragment>
										);
									})}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
			<p className='r-muted r-tm-note'>{t('teams:top.note', { date, total: totalTeams.toLocaleString() })}</p>
		</div>
	);
};
