import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RankMedal } from '../../components/RankMedal';
import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { cleanName, ordinal } from '../../lib/format';
import { slotKey, TEAM_ROLES } from '../../lib/team-analysis';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import { FavoriteStar } from './FavoriteStar';
import { NotRecommendedMark } from './NotRecommendedMark';
import type { TeamsData } from './useTeamsData';

type CardTeam = RankedTeam & { addedAt?: number };

const teamKey = (team: RankedTeam) => team.members.map(slotKey).join('|');

/** One card of the list; `rank` is the team's place in the full ranking (a filtered list keeps the real places). */
export const TeamCard = ({
	team,
	rank,
	league,
	data,
	primary,
	onOpen,
	showBuildDetails = false,
	nicknames,
}: {
	team: CardTeam;
	rank: number;
	league: TeamLeague;
	data: TeamsData;
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
	showBuildDetails?: boolean;
	nicknames?: Readonly<Record<string, string>>;
}) => {
	const { t } = useTranslation(['teams']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { moves } = useMoves();
	const showMemberDetails = showBuildDetails || team.addedAt !== undefined;

	const metrics = [
		{ label: t('teams:top.teamScore'), value: team.score.toFixed(1) },
		{ label: t('teams:threat.scoreLabel'), value: String(team.threatScore) },
	];

	// The card is not itself a button: it holds the favorite star, and a button can't hold a button.
	return (
		<div className='r-tm-board-card' data-tier={team.tier} data-added={team.addedAt !== undefined ? '' : undefined}>
			<button type='button' className='r-tm-board-open' aria-label={t('teams:top.open')} onClick={() => onOpen(team)} />
			<span className='r-tm-board-lead'>
				{/* a favorite has no place in a ranking: just the star (and, below, when it was added) */}
				{team.addedAt === undefined && (
					<span className='r-tm-board-rank' data-podium={rank <= 3 ? rank : undefined}>
						<RankMedal rank={rank} />
						<span>{ordinal(rank, currentLanguage)}</span>
						{team.rankChange ? (
							<span className='r-tm-board-delta' data-dir={team.rankChange > 0 ? 'up' : 'down'}>
								{team.rankChange > 0 ? '▲' : '▼'}
								{Math.abs(team.rankChange)}
							</span>
						) : null}
					</span>
				)}
				<FavoriteStar league={league} members={team.members} />
			</span>
			<span className='r-tm-board-score'>
				{/* both metrics are named; the one the list is ordered by is the big one */}
				{(primary === 'score' ? metrics : [...metrics].reverse()).map((metric, n) => (
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
					// Custom-build cards show the IVs used for rating and flag moves outside the recommended set.
					const recommended = data.rankList[member.speciesId]?.moveset;
					const best = data.builder?.ivs[member.speciesId]?.[league];
					const ivs = member.ivs ?? (best ? [best[1], best[2], best[3]] : undefined);
					return (
						<Fragment key={`${member.speciesId}-${i}`}>
							{i > 0 && (
								<span className='r-tm-board-member'>
									<svg className='r-tm-board-arrow' viewBox='0 0 40 24' aria-hidden='true'>
										<path d='M2 12h30M24 4l10 8-10 8' />
									</svg>
									<span className='r-tm-board-arrow-placeholder'></span>
								</span>
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
								<b className='r-tm-board-name'>{nicknames?.[member.speciesId] ?? cleanName(p.speciesName)}</b>
								<span className='r-tm-board-types'>
									{p.types.map((ty) => (
										<TypeChip key={typeKey(ty)} type={typeKey(ty)} />
									))}
								</span>
								{showMemberDetails && ivs && (
									<span
										className='r-tm-board-ivs'
										data-custom={member.ivs || member.level !== undefined ? '' : undefined}
										title={t('teams:builder.ivs')}
									>
										{ivs.join('/')}
										{member.level !== undefined && ` · L${member.level}`}
									</span>
								)}
								<span className='r-tm-board-moves'>
									{member.moveset
										.filter((m) => m !== 'none')
										.map((m) => (
											<span key={m}>
												{translateMoveFromMoveId(m, moves, gl)}
												{showMemberDetails && recommended && !recommended.includes(m) && <NotRecommendedMark />}
											</span>
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
	);
};

/**
 * A list of rated teams as cards — the best teams, and the favorites, are both drawn by this. A card shows the
 * position in the list, the two scores (the metric the list is ordered by is the big one), the three Pokémon in
 * play order with their types and moves, and the favorite star; the whole card opens the team in the
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
	teams: ReadonlyArray<CardTeam>;
	league: TeamLeague;
	data: TeamsData;
	/** Which score is the big one. */
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
}) => (
	<ol className='r-tm-board-list'>
		{teams.map((team, index) => (
			<li key={teamKey(team)} style={{ ['--i' as string]: Math.min(index, 12) }}>
				<TeamCard team={team} rank={index + 1} league={league} data={data} primary={primary} onOpen={onOpen} />
			</li>
		))}
	</ol>
);

/**
 * The same cards for a list too long to mount at once: only the cards near the viewport exist. Each card is
 * measured since its height depends on how its names and moves wrap. `items` carry each team's real rank.
 */
export const VirtualTeamCards = ({
	items,
	league,
	data,
	primary,
	onOpen,
	showBuildDetails = false,
	nicknames,
}: {
	items: ReadonlyArray<{ team: RankedTeam; rank: number }>;
	league: TeamLeague;
	data: TeamsData;
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
	showBuildDetails?: boolean;
	nicknames?: Readonly<Record<string, string>>;
}) => {
	const listRef = useRef<HTMLDivElement>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	// The scroll margin follows anything above the list that changes height (the help panel opening, the intro wrapping).
	useLayoutEffect(() => {
		const el = listRef.current;
		if (!el) return;
		const measure = () => {
			const top = el.getBoundingClientRect().top + window.scrollY;
			setScrollMargin((prev) => (Math.abs(prev - top) < 1 ? prev : top));
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		if (el.parentElement) ro.observe(el.parentElement);
		return () => ro.disconnect();
	}, []);

	const virt = useWindowVirtualizer({
		count: items.length,
		estimateSize: () => 130,
		overscan: 6,
		scrollMargin,
		gap: 12,
	});

	return (
		<div ref={listRef} className='r-tm-board-vlist' role='list' style={{ height: virt.getTotalSize() }}>
			{virt.getVirtualItems().map((vi) => {
				const item = items[vi.index];
				if (!item) return null;
				return (
					<div
						key={vi.key}
						ref={virt.measureElement}
						data-index={vi.index}
						role='presentation'
						className='r-tm-board-vrow'
						style={{
							transform: `translateY(${vi.start - virt.options.scrollMargin}px)`,
						}}
					>
						<div role='listitem' className='r-tm-board-item'>
							<TeamCard
								team={item.team}
								rank={item.rank}
								league={league}
								data={data}
								primary={primary}
								onOpen={onOpen}
								showBuildDetails={showBuildDetails}
								{...(nicknames ? { nicknames } : {})}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
};
