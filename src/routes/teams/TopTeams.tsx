import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchListBar } from '../../components/SearchListBar';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import type { RankedTeam, TeamLeague } from '../../DTOs/ITeamBuilder';
import { useAfterPaint } from '../../hooks/useAfterPaint';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cleanName } from '../../lib/format';
import { SCORE_WEIGHTS } from '../../lib/team-analysis';
import { useTeamRanking } from '../../queries/teams';
import { VirtualTeamCards } from './TeamCards';
import type { TeamsData } from './useTeamsData';

/**
 * The best teams we could find: every trio of the league's top Pokémon, each with its ranking's recommended
 * moves and top IVs, rated with the same Team Score the builder shows (see `scripts/team-ranking` and the daily
 * "Team Ranking" workflow). Each row opens that team in the builder. The lists are long, so they are virtualized, and
 * a local Pokémon search keeps only the teams that include the typed species.
 */
export const TopTeams = ({
	league,
	data,
	leagueRow,
	onOpen,
}: {
	league: TeamLeague;
	data: TeamsData;
	/** The league picker: it scrolls along with the search header, and stands alone while there is no list. */
	leagueRow: ReactNode;
	onOpen: (team: RankedTeam) => void;
}) => {
	const { t } = useTranslation(['teams', 'rankings', 'components', 'common']);
	const query = useTeamRanking();
	// The same "Order by" chip as the rankings pages. Each key has its own list of the best teams by that metric.
	const [sortKey, setSortKey] = useState<'score' | 'threat'>('score');
	const [search, setSearch] = useState('');
	// The intro under the title can be folded away: the list below is long.
	const [introOpen, setIntroOpen] = useState(false);

	// The tab is already showing; the long list of cards renders after the spinner has been painted.
	const painted = useAfterPaint();

	const term = useDebouncedValue(search.trim().toLowerCase(), 220);
	const { gamemaster } = data;
	const ranking = query.data?.leagues[league];
	const list = sortKey === 'score' ? ranking?.byScore : ranking?.byThreat;
	// Each list is already best first (highest Team Score, or lowest threat score); a filtered one keeps the real places.
	const items = useMemo(() => {
		const all = (list ?? []).map((team, i) => ({ team, rank: i + 1 }));
		if (!term) return all;
		return all.filter(({ team }) =>
			team.members.some((m) => {
				const p = gamemaster[m.speciesId];
				return !!p && cleanName(p.speciesName).toLowerCase().includes(term);
			})
		);
	}, [list, term, gamemaster]);

	if (query.isError)
		return (
			<>
				{leagueRow}
				<p className='r-muted'>{t('teams:top.empty')}</p>
			</>
		);
	if (!query.data || !data.ready || !painted) {
		return (
			<>
				{leagueRow}
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:page.loading')}</p>
				</div>
			</>
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

	// A cup that rotated in after the last ranking run has no list yet.
	if (!ranking)
		return (
			<>
				{leagueRow}
				<p className='r-muted'>{t('teams:top.empty')}</p>
			</>
		);
	const { totalTeams } = ranking;
	const date = new Date(query.data.generatedAt).toLocaleDateString();

	return (
		<div className='r-tm-board'>
			<div className='r-tm-board-hint'>
				<button
					type='button'
					className='r-rank-hint-toggle'
					aria-expanded={introOpen}
					aria-label={t(introOpen ? 'rankings:hint.hide' : 'rankings:hint.show')}
					title={t(introOpen ? 'rankings:hint.hide' : 'rankings:hint.show')}
					onClick={() => setIntroOpen((open) => !open)}
				>
					?
				</button>
				<p className='r-muted r-tm-note'>{t('teams:top.note', { date, total: totalTeams.toLocaleString() })}</p>
			</div>
			{introOpen && (
				<p className='r-tm-board-intro'>
					{t('teams:top.intro', { candidates: ranking.candidates ?? query.data.candidates })}
				</p>
			)}
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
					<dt aria-hidden='true'>→</dt>
					<dd>{t('teams:top.help.order')}</dd>
				</dl>
			</details>
			<SearchListBar
				value={search}
				onChange={setSearch}
				placeholder={t('teams:top.searchPlaceholder')}
				clearAriaLabel={t('components:searchBox.clearAriaLabel')}
				onClear={() => setSearch('')}
				label={`${t('common:nav.teams.label')}: ${items.length}`}
				above={leagueRow}
			>
				<SortBar
					options={sortOptions}
					sortKey={sortKey}
					dir={sortKey === 'score' ? 'desc' : 'asc'}
					onChange={changeSort}
					fixedDirection
				/>
			</SearchListBar>
			{items.length === 0 ? (
				<p className='r-muted'>{t('teams:top.noMatch')}</p>
			) : (
				<VirtualTeamCards items={items} league={league} data={data} primary={sortKey} onOpen={onOpen} />
			)}
		</div>
	);
};
