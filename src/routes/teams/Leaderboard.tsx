import { useTranslation } from 'react-i18next';

import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { LeaderboardTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName } from '../../lib/format';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { useTeamLeaderboard } from '../../queries/teams';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import type { TeamsData } from './useTeamsData';

/** PvPoke's ratings hover near 500 (an even match); this window is where its best teams live, so bars show the spread. */
const BAR_MIN = 480;
const BAR_MAX = 580;
const barWidth = (score: number) => Math.min(100, Math.max(6, ((score - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100));

/**
 * PvPoke's own team ranking, from its AI training simulations: thousands of
 * simulated matches between generated teams, ranked by how they scored. It's
 * a small sample, not "the meta" — a place to see what strong cores look like
 * and open any of them in the builder. Usage is deliberately not shown; the
 * score is what's comparable.
 */
export const Leaderboard = ({
	league,
	data,
	onOpen,
}: {
	league: TeamLeague;
	data: TeamsData;
	onOpen: (team: LeaderboardTeam) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const query = useTeamLeaderboard();

	if (query.isError) return <p className='r-muted'>{t('teams:page.loadFailed')}</p>;
	if (!query.data || !data.ready) {
		return (
			<div className='r-tm-loading'>
				<span className='r-spinner' aria-hidden='true' />
				<p>{t('teams:page.loading')}</p>
			</div>
		);
	}

	const { teams } = query.data.leagues[league];

	return (
		<div className='r-tm-board'>
			<p className='r-tm-board-intro'>{t('teams:board.intro', { date: query.data.lastUpdated })}</p>
			<ol className='r-tm-board-list'>
				{teams.map((team, index) => (
					<li key={team.members.map((m) => m.speciesId).join('|')} style={{ ['--i' as string]: index }}>
						<button type='button' className='r-tm-board-card' onClick={() => onOpen(team)}>
							<span className='r-tm-board-rank' data-podium={index < 3 ? index + 1 : undefined}>
								{index + 1}
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
												<SpriteImg pokemon={p} loading='lazy' />
											</span>
											<b>{cleanName(p.speciesName)}</b>
											<span className='r-tm-board-types'>
												{p.types.map((ty) => (
													<TypeChip key={typeKey(ty)} type={typeKey(ty)} />
												))}
											</span>
											<span className='r-tm-board-moves'>
												{member.moveset.map((m) => translateMoveFromMoveId(m, moves, gl)).join(' · ')}
											</span>
										</span>
									);
								})}
							</span>
							<span className='r-tm-board-score'>
								<b>{team.score.toFixed(1)}</b>
								<span className='r-tm-bar' aria-hidden='true'>
									<i style={{ width: `${barWidth(team.score)}%` }} />
								</span>
								<em>{t('teams:board.open')}</em>
							</span>
						</button>
					</li>
				))}
			</ol>
			<p className='r-muted r-tm-note'>{t('teams:board.source')}</p>
		</div>
	);
};
