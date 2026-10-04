import { type CSSProperties, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { topRanked } from '../../lib/home';
import { LEAGUE_CP } from '../../lib/league-caps';
import { leagueIcon } from '../../lib/league-visuals';
import { modeColor, modeLabel, R } from '../../lib/nav';
import { useLeagueDefinitions } from '../../queries/leagues';
import { usePokemon } from '../../queries/pokemon';
import { type RankList, usePvp } from '../../queries/pvp';
import { PokeAvatar } from './PokeAvatar';

// Same fallbacks the Rankings league picker uses when a league has no icon of its own.
const FALLBACK_ICON: Record<string, string> = {
	great: '/images/leagues/cups/pogo_great_league.png',
	ultra: '/images/leagues/cups/pogo_ultra_league.png',
	master: '/images/leagues/cups/pogo_master_league.png',
};

const NO_LIMIT_CP = 10000;

const LeagueCard = ({
	id,
	label,
	icon,
	cap,
	ranking,
	pokemon,
}: {
	id: string;
	label: string;
	icon: string | undefined;
	cap: number | undefined;
	ranking: RankList | undefined;
	pokemon: Record<string, IGamemasterPokemon>;
}) => {
	const { t } = useTranslation(['teams', 'home']);
	const top = topRanked(ranking ?? {}, 3).filter((speciesId) => !!pokemon[speciesId]);
	return (
		<article className='h-league' style={{ ['--lg' as string]: modeColor(id) } as CSSProperties}>
			<header>
				<span className='h-league-plate'>
					{icon ? <img src={icon} alt='' loading='lazy' /> : <b>{cap ?? label.slice(0, 2)}</b>}
				</span>
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
									<span>{cleanName(pokemon[speciesId].speciesName)}</span>
								</Link>
							</li>
						))}
			</ol>
		</article>
	);
};

/** Every PvP league — the three permanent ones and whichever cups are running — each with its top 3. */
export const LeagueCards = () => {
	const { currentGameLanguage: gl } = useLanguage();
	const { gamemasterPokemon } = usePokemon();
	const { leagues } = useLeagueDefinitions();
	const { rankLists, extraRankLists } = usePvp();

	const permanent = (['great', 'ultra', 'master'] as const).map((id, i) => ({
		id: id as string,
		icon: leagueIcon(id) ?? FALLBACK_ICON[id],
		ranking: rankLists[i],
	}));
	const cups = leagues
		.filter((l) => !(['great', 'ultra', 'master'] as ReadonlyArray<string>).includes(l.id))
		.map((l) => ({ id: l.id, icon: leagueIcon(l.id), ranking: extraRankLists[l.id] }));

	return (
		<div className='h-leagues'>
			{[...permanent, ...cups].map((l, i) => (
				<Fragment key={l.id}>
					{i === permanent.length && <hr className='h-leagues-sep' />}
					<LeagueCard
						id={l.id}
						label={modeLabel(l.id, gl, leagues)}
						icon={l.icon}
						cap={LEAGUE_CP[l.id]}
						ranking={l.ranking}
						pokemon={gamemasterPokemon}
					/>
				</Fragment>
			))}
		</div>
	);
};
