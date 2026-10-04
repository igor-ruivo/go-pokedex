import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BuddyMark, SuperMegaMark } from '../../components/BuddyMark';
import { RankMedal } from '../../components/RankMedal';
import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useOptimalBuild } from '../../hooks/useOptimalBuild';
import { cleanName, ordinal } from '../../lib/format';
import { bestIvsFor, LEAGUE_CP } from '../../lib/league-caps';
import {
	exceedsNormalLevel,
	isBuddy,
	scoreTier,
	slotIdentityKey,
	type SlotIvs,
	TEAM_ROLES,
	type TeamSlotDescriptor,
	threatPart,
} from '../../lib/team-analysis';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { gameTypeDisplayTranslator } from '../../utils/GameTranslator';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import { FavoriteStar } from './FavoriteStar';
import { NotRecommendedMark } from './NotRecommendedMark';
import type { TeamsData } from './useTeamsData';

/** `unrated`: a card without scores (a long favorites list is not rated automatically); the score fields are then placeholders. */
type CardTeam = RankedTeam & { addedAt?: number; unrated?: boolean };

const teamKey = (team: RankedTeam) => team.members.map(slotIdentityKey).join('|');

/** The IVs (and pinned level) line of one member; blue when pinned, unless it is what the Best Buddy setting makes optimal. */
const MemberBuild = ({
	pokemon,
	member,
	ivs,
	cpCap,
	title,
}: {
	pokemon: IGamemasterPokemon;
	member: TeamSlotDescriptor;
	ivs: SlotIvs;
	cpCap: number;
	title: string;
}) => {
	// A level that isn't pinned follows the cap, which is optimal by definition.
	const { ivsOptimal, levelOptimal } = useOptimalBuild(
		pokemon,
		ivs,
		member.level,
		{ buddy: isBuddy(member), superMega: !!member.superMega },
		cpCap
	);
	// The level is only worth stating when it's a deliberate one, not the level the cap gives anyway.
	const showLevel = member.level !== undefined && !levelOptimal;
	const custom = (!!member.ivs && !ivsOptimal) || showLevel;
	return (
		<span className='r-tm-board-ivs' data-custom={custom ? '' : undefined} title={title}>
			{ivs.join('/')}
			{showLevel && ` · L${member.level}`}
		</span>
	);
};

/** Identities of the stand-ins of Best Buddies and Super Max Megas, by what each lost (see `standInsOf`). */
export interface StandIns {
	buddy: ReadonlySet<string>;
	superMega: ReadonlySet<string>;
}

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
	standIns,
}: {
	team: CardTeam;
	rank: number;
	league: TeamLeague;
	data: TeamsData;
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
	showBuildDetails?: boolean;
	/** Nickname per build, keyed by `slotIdentityKey` (species + moves + IVs + level). */
	nicknames?: Readonly<Record<string, string>>;
	/** Identities (`slotIdentityKey`) of the stand-ins a Best Buddy has in these combinations: they get a disabled crown. */
	standIns?: StandIns;
}) => {
	const { t } = useTranslation(['teams']);
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	const { moves } = useMoves();
	const showMemberDetails = showBuildDetails || team.addedAt !== undefined;

	// Each number is coloured by how good it is: the Team Score by its tier, the threat score (lower is better) by the tier
	// its 0–100 reading falls in.
	const metrics = [
		{ label: t('teams:top.teamScore'), value: team.score.toFixed(1), tier: team.tier },
		{
			label: t('teams:threat.scoreLabel'),
			value: String(team.threatScore),
			tier: scoreTier(threatPart(team.threatScore)),
		},
	];

	// The card is not itself a button: it holds the favorite star, and a button can't hold a button.
	return (
		<div
			className='r-tm-board-card'
			data-tier={team.tier}
			data-added={team.addedAt !== undefined ? '' : undefined}
			data-unrated={team.unrated ? '' : undefined}
		>
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
				<FavoriteStar league={league} members={team.members} data={data} />
			</span>
			{!team.unrated && (
				<span className='r-tm-board-score'>
					{/* both metrics are named; the one the list is ordered by is the big one */}
					{(primary === 'score' ? metrics : [...metrics].reverse()).map((metric, n) => (
						<span
							key={metric.label}
							className='r-tm-board-metric'
							data-primary={n === 0 ? '' : undefined}
							data-tier={metric.tier}
						>
							<small>{metric.label}</small>
							<b>{metric.value}</b>
						</span>
					))}
				</span>
			)}
			<span className='r-tm-board-members'>
				{team.members.map((member, i) => {
					const p = data.gamemaster[member.speciesId];
					if (!p) return null;
					// Members come in the order they're played: lead, switch, closer.
					const role = TEAM_ROLES[i];
					// Custom-build cards show the IVs used for rating and flag moves outside the recommended set.
					const recommended = data.rankList[member.speciesId]?.moveset;
					const best = bestIvsFor(data.builder, member.speciesId, LEAGUE_CP[league]);
					const ivs = member.ivs ?? (best ? [best[1], best[2], best[3]] : undefined);
					return (
						<Fragment key={`${member.speciesId}-${i}`}>
							{i > 0 && (
								<span className='r-tm-board-member' data-link=''>
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
									{/* active only for a member that really is above level 50 (the team's one buddy); a ribbon that changes nothing, and the
									    stand-in of a buddy, show it disabled */}
									{exceedsNormalLevel(member) ? (
										<BuddyMark />
									) : member.buddy || member.formerBuddy || standIns?.buddy.has(slotIdentityKey(member)) ? (
										<BuddyMark disabled />
									) : null}
									{member.superMega ? (
										<SuperMegaMark />
									) : member.formerSuperMega || standIns?.superMega.has(slotIdentityKey(member)) ? (
										<SuperMegaMark disabled />
									) : null}
									<SpriteImg pokemon={p} loading='lazy' />
								</span>
								<b className='r-tm-board-name'>{nicknames?.[slotIdentityKey(member)] ?? cleanName(p.speciesName)}</b>
								<span className='r-tm-board-types'>
									{p.types.map((ty) => (
										<Fragment key={typeKey(ty)}>
											{/* the named pill on wide cards, just the type's symbol on narrow ones (see the CSS) */}
											<TypeChip type={typeKey(ty)} className='r-tm-board-type-pill' />
											<img
												className='r-tm-board-type-icon'
												src={`/images/types/${typeKey(ty)}.png`}
												alt={gameTypeDisplayTranslator(typeKey(ty), gl) || typeKey(ty)}
												title={gameTypeDisplayTranslator(typeKey(ty), gl) || typeKey(ty)}
												width={22}
												height={22}
												loading='lazy'
											/>
										</Fragment>
									))}
								</span>
								{showMemberDetails && ivs && (
									<MemberBuild
										pokemon={p}
										member={member}
										ivs={ivs}
										cpCap={LEAGUE_CP[league]}
										title={t('teams:builder.ivs')}
									/>
								)}
								<span className='r-tm-board-moves'>
									{member.moveset
										.filter((m) => m !== 'none')
										.map((m) => (
											<span key={m}>
												{/* the warning comes first, so an ellipsis can't hide it */}
												{showMemberDetails && recommended && !recommended.includes(m) && <NotRecommendedMark />}
												{translateMoveFromMoveId(m, moves, gl)}
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
	standIns,
}: {
	items: ReadonlyArray<{ team: RankedTeam; rank: number }>;
	league: TeamLeague;
	data: TeamsData;
	primary: 'score' | 'threat';
	onOpen: (team: RankedTeam) => void;
	showBuildDetails?: boolean;
	/** Nickname per build, keyed by `slotIdentityKey` (species + moves + IVs + level). */
	nicknames?: Readonly<Record<string, string>>;
	standIns?: StandIns;
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
								{...(standIns ? { standIns } : {})}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
};
