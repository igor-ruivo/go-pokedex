import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { SpriteImg } from '../../components/Sprite';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName } from '../../lib/format';
import { typeVar } from '../../lib/types';
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
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const query = useTeamRanking();
	// The same "Order by" chip as the rankings pages. Each key has its own list of the best teams by that metric.
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');
	const [sortDir, setSortDir] = useState<SortDir>('desc');

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
	const changeSort = (key: string, dir: SortDir) => {
		if (key !== 'score' && key !== 'threat') return;
		setSortKey(key);
		setSortDir(dir);
	};

	const { byScore, byThreat, totalTeams } = query.data.leagues[league];
	// Best first is descending for the score and ascending for the threat score (lower is better there);
	// the opposite direction shows the same hundred teams from the other end.
	const bestFirst: SortDir = sortKey === 'score' ? 'desc' : 'asc';
	const list = sortKey === 'score' ? byScore : byThreat;
	const teams = sortDir === bestFirst ? list : [...list].reverse();
	const date = new Date(query.data.generatedAt).toLocaleDateString();

	return (
		<div className='r-tm-board'>
			<p className='r-tm-board-intro'>{t('teams:top.intro', { candidates: query.data.candidates })}</p>
			<div className='r-tm-board-tools'>
				<SortBar options={sortOptions} sortKey={sortKey} dir={sortDir} onChange={changeSort} />
			</div>
			<ol className='r-tm-board-list'>
				{teams.map((team, index) => {
					// Rank within the best hundred by this metric, whichever end the list is being read from.
					const rank = sortDir === bestFirst ? index + 1 : list.length - index;
					return (
						<li key={team.members.map((m) => m.speciesId).join('|')} style={{ ['--i' as string]: Math.min(index, 12) }}>
							<button type='button' className='r-tm-board-card' data-tier={team.tier} onClick={() => onOpen(team)}>
								<span className='r-tm-board-rank' data-podium={rank <= 3 ? rank : undefined}>
									{rank}
								</span>
								<span className='r-tm-board-score'>
									<b>{team.score.toFixed(1)}</b>
									<span>
										{t('teams:top.threat')} {team.threatScore}
									</span>
								</span>
								<span className='r-tm-board-members'>
									{team.members.map((member) => {
										const p = data.gamemaster[member.speciesId];
										if (!p) return null;
										return (
											<span
												key={member.speciesId}
												className='r-tm-board-member'
												style={{ ['--tc' as string]: typeVar(p.types[0]) }}
											>
												<span className='r-tm-board-art'>
													{p.isShadow && <ShadowMark />}
													<SpriteImg pokemon={p} loading='lazy' />
												</span>
												<span className='r-tm-board-text'>
													<b>{cleanName(p.speciesName)}</b>
													<small>{member.moveset.map((m) => translateMoveFromMoveId(m, moves, gl)).join(' · ')}</small>
												</span>
											</span>
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
