import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { RankMedal } from '../../components/RankMedal';
import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName, ordinal } from '../../lib/format';
import { TEAM_ROLES } from '../../lib/team-analysis';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import { FavoriteStar } from './FavoriteStar';
import type { TeamsData } from './useTeamsData';

/**
 * A list of rated teams as cards — the best teams, and the favorites, are both drawn by this. A card shows the
 * position in the list, the two scores (the metric the list is ordered by is the big one), the three Pokémon in
 * play order with their types, role score and moves, and the favorite star; the whole card opens the team in the
 * builder.
 */
export const TeamCards = ({
	teams,
	league,
	data,
	primary,
	onOpen,
}: {
	/** A team with `addedAt` (the favorites) also shows when it was added. */
	teams: ReadonlyArray<RankedTeam & { addedAt?: number }>;
	league: TeamLeague;
	data: TeamsData;
	/** Which score is the big one. */
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { moves } = useMoves();

	const metrics = (team: RankedTeam) => [
		{ label: t('teams:top.teamScore'), value: team.score.toFixed(1) },
		{ label: t('teams:threat.scoreLabel'), value: String(team.threatScore) },
	];

	return (
		<ol className='r-tm-board-list'>
			{teams.map((team, index) => {
				const rank = index + 1;
				return (
					<li key={team.members.map((m) => [m.speciesId, ...m.moveset].join('-')).join('|')} style={{ ['--i' as string]: Math.min(index, 12) }}>
						{/* The card is not itself a button: it holds the favorite star, and a button can't hold a button. */}
						<div className='r-tm-board-card' data-tier={team.tier} data-added={team.addedAt !== undefined ? '' : undefined}>
							<button type='button' className='r-tm-board-open' aria-label={t('teams:top.open')} onClick={() => onOpen(team)} />
							<span className='r-tm-board-lead'>
								{/* a favorite has no place in a ranking: just the star (and, below, when it was added) */}
								{team.addedAt === undefined && (
									<span className='r-tm-board-rank' data-podium={rank <= 3 ? rank : undefined}>
										<RankMedal rank={rank} />
										<span>{ordinal(rank, currentLanguage)}</span>
									</span>
								)}
								<FavoriteStar league={league} members={team.members} />
							</span>
							<span className='r-tm-board-score'>
								{/* both metrics are named; the one the list is ordered by is the big one */}
								{(primary === 'score' ? metrics(team) : [...metrics(team)].reverse()).map((metric, n) => (
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
							{team.addedAt !== undefined && (
								<span className='r-tm-board-added'>
									{t('teams:favorites.added', { date: new Date(team.addedAt).toLocaleDateString(currentLanguage) })}
								</span>
							)}
						</div>
					</li>
				);
			})}
		</ol>
	);
};
