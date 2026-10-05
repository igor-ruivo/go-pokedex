import { type CSSProperties, Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cleanName } from '../../lib/format';
import { topRanked } from '../../lib/home';
import { LEAGUE_CP } from '../../lib/league-caps';
import { modeColor, modeLabel, R } from '../../lib/nav';
import { useLeagueDefinitions } from '../../queries/leagues';
import { usePokemon } from '../../queries/pokemon';
import { type RankList, usePvp } from '../../queries/pvp';
import { LeaguePlate } from './LeaguePlate';
import { PokeAvatar } from './PokeAvatar';

const NO_LIMIT_CP = 10000;

const LeagueCard = ({
	id,
	label,
	cap,
	ranking,
	pokemon,
}: {
	id: string;
	label: string;
	cap: number | undefined;
	ranking: RankList | undefined;
	pokemon: Record<string, IGamemasterPokemon>;
}) => {
	const { t } = useTranslation(['teams', 'home']);
	const top = topRanked(ranking ?? {}, 3).filter((speciesId) => !!pokemon[speciesId]);
	return (
		<article className='h-league' style={{ ['--lg' as string]: modeColor(id) } as CSSProperties}>
			<header>
				<LeaguePlate id={id} />
				<div className='h-league-name'>
					<h3>
						<Link to={R.rankings(id)} className='h-stretch'>
							{label}
						</Link>
					</h3>
					{cap !== undefined && cap < NO_LIMIT_CP && (
						<p>
							{t('teams:builder.cp')} {cap}
						</p>
					)}
				</div>
				<svg className='h-league-chev' viewBox='0 0 24 24' aria-hidden='true'>
					<path d='M9 6l6 6-6 6' />
				</svg>
			</header>
			<ol className='h-top' aria-label={t('home:ranks.top')}>
				{top.length === 0
					? [0, 1, 2].map((i) => (
							<li key={i}>
								<span className='h-skeleton h-skeleton--avatar' aria-hidden='true' />
							</li>
						))
					: top.map((speciesId, i) => (
							<li key={speciesId}>
								<Link to={R.pokemon(speciesId)} className='h-top-link'>
									<i className='h-coin'>{i + 1}</i>
									<PokeAvatar pokemon={pokemon[speciesId]} />
									<span className='h-top-name'>{cleanName(pokemon[speciesId].speciesName)}</span>
									{ranking?.[speciesId] && (
										<b className='h-top-score'>
											{ranking[speciesId].score.toFixed(1)} <small>pts</small>
										</b>
									)}
								</Link>
							</li>
						))}
			</ol>
		</article>
	);
};

/** The width below which only the three permanent leagues show, the cups behind a toggle. */
const NARROW_SCREEN = '(max-width: 700px)';

/**
 * Every PvP league — the three permanent ones and whichever cups are running — each with its top 3. On a narrow screen only
 * the permanent three are shown until the toggle under them is pressed.
 */
export const LeagueCards = () => {
	const { t } = useTranslation(['home']);
	const narrow = useMediaQuery(NARROW_SCREEN);
	const [expanded, setExpanded] = useState(false);
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { leagues } = useLeagueDefinitions();
	const { rankLists, extraRankLists } = usePvp();

	const permanent = (['great', 'ultra', 'master'] as const).map((id, i) => ({
		id: id as string,
		ranking: rankLists[i],
	}));
	const cups = leagues
		.filter((l) => !(['great', 'ultra', 'master'] as ReadonlyArray<string>).includes(l.id))
		.map((l) => ({ id: l.id, ranking: extraRankLists[l.id] }));

	const collapsed = narrow && !expanded;
	const shown = collapsed ? permanent : [...permanent, ...cups];

	return (
		<div className='h-leagues'>
			{shown.map((l, i) => (
				<Fragment key={l.id}>
					{i === permanent.length && <hr className='h-leagues-sep' />}
					<LeagueCard
						id={l.id}
						label={modeLabel(l.id, gl, leagues)}
						cap={LEAGUE_CP[l.id]}
						ranking={l.ranking}
						pokemon={gamemasterPokemon}
					/>
				</Fragment>
			))}
			{narrow && cups.length > 0 && (
				<button
					type='button'
					className='h-chip h-leagues-toggle'
					aria-expanded={expanded}
					onClick={() => setExpanded((e) => !e)}
				>
					{expanded ? t('home:ranks.showFewer') : t('home:ranks.showMore', { count: cups.length })}
					<svg viewBox='0 0 24 24' aria-hidden='true' data-open={expanded ? '' : undefined}>
						<path d='M6 9l6 6 6-6' />
					</svg>
				</button>
			)}
		</div>
	);
};
